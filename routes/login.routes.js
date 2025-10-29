// routes/login.routes.js

// Importa as bibliotecas necessárias
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto'; // Para gerar código
import nodemailer from 'nodemailer'; // Para enviar e-mail
import supabase from '../supabase.js';

// Cria o roteador Express
const router = express.Router();
const saltRounds = 10; // Para hash da nova senha
const CODE_EXPIRATION_MINUTES = 10; // Tempo de validade do código

// --- Configuração do Nodemailer (Requer .env) ---
let transporter;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_PORT === '465',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    console.log("Mailer (login/senha) configurado.");
} else {
    console.error("!!! ERRO CONFIG (login/senha): Variáveis .env (EMAIL_HOST, USER, PASS) não definidas! E-mails NÃO serão enviados.");
    transporter = { // Dummy transporter
        sendMail: async (options) => { console.error(`!!! E-MAIL NÃO ENVIADO (Mailer não config.) para: ${options.to}`); throw new Error("Mailer não configurado."); }
    };
}
// ------------------------------------------------------------------

// --- ROTA GET /login --- (Código Original)
router.get("/", (req, res) => { //
    try {
        const successMessage = req.query.cadastro === 'sucesso' //
            ? 'Cadastro realizado com sucesso! Faça o login.' //
            : null; //
        res.render("LOGIN/login", { error: null, success: successMessage }); //
    } catch (renderError) {
        console.error("Erro ao renderizar página de login:", renderError); //
        res.status(500).send("Erro ao carregar a página de login."); //
    }
});

// --- ROTA POST /login --- (Código Original com Correção)
router.post("/", async (req, res) => { //
    const { email, password } = req.body; // // Variáveis disponíveis aqui

    if (!email || !password) { //
        return res.status(400).render("LOGIN/login", { //
            error: 'E-mail e senha são obrigatórios.', success: null //
        });
    }

    try {
        // 1. Buscar o usuário na tabela 'cadastro_creche'
        console.log(`Tentando login para: ${email}`); //
        const { data: usuario, error: fetchError } = await supabase //
            .from('cadastro_creche') // Tabela correta
            .select('id, senha, nome') // Colunas corretas
            .eq('email', email)        // Coluna correta
            .maybeSingle(); //

        if (fetchError) { //
            console.error("Erro ao buscar usuário no login:", fetchError); //
            if (fetchError.code === 'PGRST205') { //
                 throw new Error("Erro de configuração: A tabela de usuários ('cadastro_creche') não foi encontrada."); //
             }
            throw new Error("Erro ao consultar o banco de dados."); //
        }

        // 2. Verificar usuário e senha
        let senhaCorreta = false; //
        if (usuario) { //
             console.log(`Usuário encontrado (ID: ${usuario.id}). Verificando senha...`); //
            // 'usuario.senha' contém o hash vindo do banco
            senhaCorreta = usuario.senha ? await bcrypt.compare(password, usuario.senha) : false; //
             console.log(`Senha correta? ${senhaCorreta}`); //
        } else {
             console.log(`Usuário com email ${email} não encontrado.`); //
        }

        if (!usuario || !senhaCorreta) { //
            console.warn(`Tentativa de login falhou (e-mail ou senha inválidos) para: ${email}`); //
            return res.status(401).render("LOGIN/login", { //
                error: 'E-mail ou senha inválidos.', success: null //
            });
        }

        // 3. Login Válido!
        console.log(`Login bem-sucedido para: ${email} (ID: ${usuario.id}, Nome: ${usuario.nome})`); //

        // --- LÓGICA DE SESSÃO --- // (Código Original)
        if (req.session) { //
             req.session.userId = usuario.id;      //
             req.session.userName = usuario.nome;   //
             req.session.isAuthenticated = true; //
             console.log("Sessão criada/atualizada:", req.session); //
             req.session.save(err => { //
                 if (err) { console.error("Erro ao salvar a sessão:", err); } //
             });
        } else {
             console.error("!!! ERRO: Middleware de sessão não configurado!"); //
        }
        // --- FIM LÓGICA DE SESSÃO ---

        // --- INSERIR EM cliente_login --- // <-- CORRIGIDO
        try {
            console.log("Tentando inserir em cliente_login..."); //
            const { error: loginLogError } = await supabase //
                .from('cliente_login') // Nome da tabela
                .insert({ //
                    // Mapeia variável 'email' para a coluna 'email_creche'
                    email_creche: email,
                    // Mapeia o HASH 'usuario.senha' para a coluna 'senha_creche'
                    senha_creche: usuario.senha,
                });

            if (loginLogError) { //
                // Mostra erro específico se houver (ex: violação de constraint, tipo inválido)
                console.error("Erro ao tentar salvar na tabela cliente_login:", loginLogError); //
            } else {
                console.log("Informações salvas com sucesso em cliente_login."); //
            }
        } catch(clienteLoginError) { //
             // Captura erros mais graves (ex: tabela não existe)
             console.error("Erro grave ao tentar acessar/inserir em cliente_login:", clienteLoginError); //
        }
        // --- FIM INSERIR EM cliente_login ---

        // Redireciona para a página principal após login
        res.redirect('/home'); //

    } catch (error) { // Captura erros gerais
        console.error("Erro crítico no POST /login:", error); //
        res.status(500).render("LOGIN/login", { //
            error: error.message || 'Ocorreu um erro interno no servidor. Tente novamente.', //
            success: null //
        });
    }
});

// --- ADIÇÃO: ROTAS PARA RECUPERAÇÃO DE SENHA --- (Código Original Adicionado)
// POST /senha/enviar-codigo
router.post('/senha/enviar-codigo', async (req, res) => { //
    const { email } = req.body; //
    console.log(`Pedido de código para: ${email}`); //
    if (!email) return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' }); //

    try {
        const { data: usuario, error: findError } = await supabase.from('cadastro_creche').select('id, nome').eq('email', email).maybeSingle(); //
        if (findError || !usuario) { //
            console.warn(`Email não encontrado (ou erro DB) para envio de código: ${email}`); //
            await new Promise(resolve => setTimeout(resolve, 500)); // Simula delay
            return res.status(200).json({ success: true, message: 'Se o e-mail estiver cadastrado, um código será enviado.' }); //
        }
        const codigo = crypto.randomInt(100000, 1000000).toString(); //
        const expires_at = new Date(); expires_at.setMinutes(expires_at.getMinutes() + CODE_EXPIRATION_MINUTES); //
        await supabase.from('trocar_senha').delete().eq('user_id', usuario.id); //
        const { error: insertError } = await supabase.from('trocar_senha').insert({ user_id: usuario.id, token: codigo, expires_at: expires_at.toISOString() }); //
        if (insertError) { console.error("Erro salvar código DB:", insertError); throw new Error("Erro ao gerar código."); } //

        const mailOptions = { //
            from: `"Seteeduca" <${process.env.EMAIL_USER}>`, to: email, subject: `Seu Código Seteeduca: ${codigo}`, //
            text: `Olá ${usuario.nome || ''},\n\nUse o código ${codigo} para redefinir sua senha.\nExpira em ${CODE_EXPIRATION_MINUTES} min.\n\nEquipe Seteeduca`, //
            html: `<p>Olá ${usuario.nome || ''},</p><p>Use o código a seguir:</p><h2 style="text-align:center;">${codigo}</h2><p>Expira em <strong>${CODE_EXPIRATION_MINUTES} min</strong>.</p><p>Equipe Seteeduca</p>` //
        };
        try {
            await transporter.sendMail(mailOptions); //
            console.log(`Código ${codigo} enviado para: ${email}`); //
            return res.status(200).json({ success: true, message: 'Código enviado para seu e-mail.' }); //
        } catch (emailError) {
            console.error(`!!! ERRO envio código p/ ${email}:`, emailError); //
            throw new Error("Não foi possível enviar o código. Tente mais tarde."); //
        }
    } catch (error) {
        console.error("Erro /senha/enviar-codigo:", error); //
        res.status(500).json({ success: false, message: error.message || 'Erro interno.' }); //
    }
});

// POST /senha/verificar-codigo
router.post('/senha/verificar-codigo', async (req, res) => { //
    const { email, code } = req.body; //
    const verificationCode = req.body.fullCode || code; //
    console.log(`Verificando código: ${verificationCode} para ${email}`); //
    if (!email || !verificationCode || verificationCode.length !== 6) return res.status(400).json({ success: false, message: 'E-mail e código de 6 dígitos obrigatórios.' }); //

    try {
        const { data: usuario, error: findUserError } = await supabase.from('cadastro_creche').select('id').eq('email', email).single(); //
        if (findUserError || !usuario) throw new Error("Código inválido ou expirado."); // Email não encontrado ou erro

        const { data: tokenData, error: findTokenError } = await supabase.from('trocar_senha').select('expires_at').eq('user_id', usuario.id).eq('token', verificationCode).maybeSingle(); //
        if (findTokenError) throw new Error("Erro ao verificar o código."); //

        const agora = new Date(); const valido = tokenData && new Date(tokenData.expires_at) > agora; //
        if (!valido) { //
            console.warn(`Código ${verificationCode} inválido/expirado p/ user ${usuario.id}.`); //
            if(tokenData) await supabase.from('trocar_senha').delete().eq('user_id', usuario.id).eq('token', verificationCode); //
            throw new Error("Código inválido ou expirado."); //
        }
        console.log(`Código ${verificationCode} verificado p/ user ${usuario.id}.`); //
        return res.status(200).json({ success: true, message: 'Código verificado.' }); //
    } catch (error) {
        console.error("Erro /senha/verificar-codigo:", error); //
        res.status(400).json({ success: false, message: error.message || 'Erro ao verificar.' }); //
    }
});

// POST /senha/redefinir-senha
router.post('/senha/redefinir-senha', async (req, res) => { //
    const { email, code, newPassword, confirmPassword } = req.body; //
    const verificationCode = req.body.fullCode || code; //
    console.log(`Redefinir senha para: ${email}`); //

    if (!email || !verificationCode || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: 'Info incompleta.' }); //
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Senhas não coincidem.' }); //
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Senha curta (mín 6).' }); //

    try {
        // Re-verificar código e pegar user ID
        const { data: usuario, error: findUserError } = await supabase.from('cadastro_creche').select('id').eq('email', email).single(); //
        if (findUserError || !usuario) throw new Error("Usuário não encontrado."); //
        const { data: tokenData, error: findTokenError } = await supabase.from('trocar_senha').select('expires_at').eq('user_id', usuario.id).eq('token', verificationCode).maybeSingle(); //
        if (findTokenError) throw new Error("Erro verificar permissão."); //
        const agora = new Date(); const valido = tokenData && new Date(tokenData.expires_at) > agora; //
        if (!valido) { //
            console.warn(`Redefinição c/ código (${verificationCode}) inválido/expirado p/ user ${usuario.id}.`); //
            if(tokenData) await supabase.from('trocar_senha').delete().eq('user_id', usuario.id).eq('token', verificationCode); //
            throw new Error("Permissão expirou ou inválida. Tente novamente."); //
        }

        // Código OK, atualizar senha
        const hashedNovaSenha = await bcrypt.hash(newPassword, saltRounds); //
        const { error: updateError } = await supabase.from('cadastro_creche').update({ senha: hashedNovaSenha }).eq('id', usuario.id); //
        if (updateError) { console.error(`Erro update senha Supabase p/ user ${usuario.id}:`, updateError); throw new Error("Erro ao atualizar senha DB."); } //

        // Deletar código usado
        const { error: deleteTokenError } = await supabase.from('trocar_senha').delete().eq('user_id', usuario.id).eq('token', verificationCode); //
        if (deleteTokenError) console.error(`AVISO CRÍTICO: Senha redefinida, mas falha deletar código p/ user ${usuario.id}:`, deleteTokenError); //

        console.log(`Senha redefinida OK p/ user ${usuario.id} (${email}).`); //
        return res.status(200).json({ success: true, message: 'Senha redefinida!' }); //
    } catch (error) {
        console.error("Erro /senha/redefinir-senha:", error); //
        res.status(400).json({ success: false, message: error.message || 'Erro ao redefinir.' }); //
    }
});
// --- FIM ADIÇÃO ---

// Exporta o roteador
export default router; //