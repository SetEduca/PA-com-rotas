// routes/cadastro.routes.js

// Importa as bibliotecas necessárias
import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import supabase from '../supabase.js';
import nodemailer from 'nodemailer'; // <-- IMPORTAR NODEMAILER

// Cria o roteador Express
const router = express.Router();
const saltRounds = 10;

// --- Configuração do Upload (Multer) ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => { // Aceita apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas imagens.'), false); // Rejeita outros tipos
        }
    }
});
// --- FIM Configuração Multer ---

// --- Configuração do Nodemailer (COPIADA/ADAPTADA - Requer .env) ---
let transporter;
// Verifica se as variáveis de ambiente essenciais estão definidas
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10), // Garante que a porta seja número
        secure: process.env.EMAIL_PORT === '465', // true para porta 465
        auth: {
            user: process.env.EMAIL_USER, // Seu e-mail de envio
            pass: process.env.EMAIL_PASS, // Sua senha ou senha de app
        },
        // Adicionar configurações de TLS/timeout se necessário
        // tls: { rejectUnauthorized: false } // Apenas para testes locais, NUNCA em produção
    });
    console.log("Mailer (cadastro) configurado para enviar e-mails.");
} else {
    console.error("!!! ERRO DE CONFIGURAÇÃO (cadastro): Variáveis de ambiente para envio de e-mail (EMAIL_HOST, EMAIL_USER, EMAIL_PASS) não definidas. E-mails de boas-vindas NÃO serão enviados.");
    // Cria um transporter "dummy" que apenas loga erros, para evitar crash
    transporter = {
        sendMail: async (options) => {
            console.error(`!!! E-MAIL NÃO ENVIADO (Mailer não configurado) para: ${options.to}`);
            // Não lança erro aqui para não quebrar o fluxo de cadastro
            return { error: new Error("Mailer não configurado no servidor.") };
        }
    };
}
// ------------------------------------------------------------------


// --- ROTA GET /cadastro ---
router.get("/", (req, res) => { //
    try {
        res.render("CADASTRO/cadastro", { error: null, success: null }); //
    } catch (renderError) {
        console.error("Erro ao renderizar GET /cadastro:", renderError); //
        res.status(500).send("Erro ao carregar a página."); //
    }
});

// --- ROTA POST /cadastro ---
router.post("/", upload.single('foto_creche'), async (req, res) => { //
    console.log("---------- POST /cadastro (com Multer e Endereço/Tel) ----------"); //
    console.log("Recebido req.body:", req.body); //
    console.log("Recebido req.file:", req.file ? req.file.originalname : 'Nenhum arquivo'); //

    if (!req.body) { //
        console.error("ERRO GRAVE: req.body está undefined após Multer!"); //
        return res.status(500).json({ success: false, message: 'Erro interno ao processar formulário.' }); //
    }

    const { //
        nome_creche, //
        cnpj, //
        email, //
        senha, //
        confirmar_senha, //
        terms, //
        telefone, //
        cep, //
        rua, //
        bairro, //
        cidade //
    } = req.body;
    const fotoFile = req.file; //

    // --- Validações Essenciais ---
    if (!nome_creche || !cnpj || !email || !senha || !confirmar_senha || !terms || //
        !telefone || !cep || !rua || !bairro || !cidade) { //
        console.warn('Tentativa de cadastro com campos faltando.'); //
        let campoFaltando = !nome_creche?'Nome':!cnpj?'CNPJ':!email?'Email':!senha?'Senha':!confirmar_senha?'Conf Senha':!terms?'Termos':!telefone?'Telefone':!cep?'CEP':!rua?'Rua':!bairro?'Bairro':!cidade?'Cidade':'Campo'; //
        return res.status(400).json({ success: false, message: `O campo "${campoFaltando}" é obrigatório.` }); //
    }
    if (senha !== confirmar_senha) { //
        return res.status(400).json({ success: false, message: 'As senhas não coincidem.' }); //
    }
    // TODO: Validar força da senha

    try {
        // 1. Verificar e-mail (igual antes)
        const { data: existingUser, error: checkError } = await supabase //
            .from('cadastro_creche').select('email').eq('email', email).maybeSingle(); //
        if (checkError) throw checkError; //
        if (existingUser) { //
            return res.status(409).json({ success: false, message: 'Este e-mail já está cadastrado.' }); //
        }

        // 2. Hash da Senha (igual antes)
        const hashedSenha = await bcrypt.hash(senha, saltRounds); //

        // 3. Inserir na 'cadastro_creche' (igual antes)
        const { data: newUser, error: userError } = await supabase //
            .from('cadastro_creche') //
            .insert({ nome: nome_creche, cnpj: cnpj.replace(/\D/g, ''), email: email, senha: hashedSenha }) //
            .select('id').single(); //
        if (userError) throw userError; //
        if (!newUser || !newUser.id) throw new Error('Falha ao obter ID do usuário.'); //
        const userId = newUser.id; //
        console.log(`Usuário inserido (ID: ${userId})`); //

        // --- Inserções Endereço e Telefone ---
        console.log("Tentando inserir endereço e telefone..."); //
        if (telefone && cep && rua && bairro && cidade) { //
            const [enderecoResult, telResult] = await Promise.all([ //
                supabase.from('endereco_creche').insert({ rua: rua, bairro: bairro, cidade: cidade, cep: cep.replace(/\D/g, ''), cadastro_id: userId }), // // VERIFIQUE NOME COLUNA cep/cepa
                supabase.from('tel_creche').insert({ ddd: telefone.replace(/\D/g, '').substring(0, 2), numero: telefone.replace(/\D/g, '').substring(2), cadastro_id: userId }) // // VERIFIQUE NOME COLUNA numero/número
            ]);
            if (enderecoResult.error) { throw new Error(`Falha ao salvar endereço: ${enderecoResult.error.message}`); } //
            if (telResult.error) { throw new Error(`Falha ao salvar telefone: ${telResult.error.message}`); } //
            console.log("Endereço e telefone inseridos com sucesso."); //
        } else {
             console.warn("Dados de endereço/telefone incompletos, não foram salvos."); //
        }
        // --- FIM Inserções Endereço/Telefone ---

        // --- Upload da Foto e Salvar URL ---
        let fotoUrlPublica = null; //
        if (fotoFile) { //
            console.log(`Tentando upload da foto: ${fotoFile.originalname}`); //
            try {
                const BUCKET_NAME = 'fotos-creche'; //
                const fileExtension = fotoFile.originalname.split('.').pop(); //
                const filePath = `public/${userId}-${Date.now()}.${fileExtension}`; //

                const { error: uploadError } = await supabase.storage //
                    .from(BUCKET_NAME) //
                    .upload(filePath, fotoFile.buffer, { contentType: fotoFile.mimetype, upsert: false }); //

                if (uploadError) { throw new Error(`Falha no upload da foto: ${uploadError.message}`); } //

                const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath); //
                fotoUrlPublica = urlData.publicUrl; //
                console.log("Foto enviada com sucesso:", fotoUrlPublica); //

                // Salvar URL na tabela 'cadastro_creche'
                console.log(`Tentando salvar URL da foto no banco para userId: ${userId}`); //
                const { error: updateFotoError } = await supabase //
                    .from('cadastro_creche') //
                    .update({ url_foto: fotoUrlPublica }) // // <-- VERIFIQUE O NOME DA COLUNA AQUI
                    .eq('id', userId); //

                if (updateFotoError) { //
                    console.warn(`Aviso: Foto enviada, mas erro ao salvar URL no banco:`, updateFotoError.message); //
                } else {
                     console.log("URL da foto salva com sucesso na tabela cadastro_creche."); //
                }
                // --- FIM: Salvar URL ---

            } catch (storageError) {
                console.warn("Aviso: Erro durante o processo de upload da foto:", storageError.message); //
            }
        } else {
             console.log("Nenhuma foto enviada."); //
        }
        // --- FIM Upload da Foto ---


        // <<<--- ADIÇÃO: Enviar E-mail de Boas-Vindas ---<<<
        console.log(`Preparando para enviar e-mail de boas-vindas para ${email}...`);
        const mailOptions = {
            from: `"SeteEduca" <${process.env.EMAIL_USER}>`, // Nome do remetente (ajuste se necessário)
            to: email,                                     // E-mail do usuário cadastrado
            subject: 'Bem-vindo(a) à SeteEduca!',          // Assunto
            // Corpo em texto puro
            text: `Olá, ${nome_creche || 'Usuário'}!\n\nSeja muito bem-vindo(a) à SeteEduca!\n\nEstamos muito felizes em confirmar que seu cadastro foi realizado com sucesso. Sua jornada está prestes a decolar! 🚀\n\nVocê já está a um passo de começar.\n\nSe tiver qualquer dúvida, é só responder a este e-mail.\n\nAbraços,\nEquipe SeteEduca.`,
            // Corpo em HTML (opcional, mas recomendado)
            html: `
                <p>Olá, ${nome_creche || 'Usuário'}!</p>
                <p>Seja muito bem-vindo(a) à <strong>SeteEduca</strong>!</p>
                <p>Estamos muito felizes em confirmar que seu cadastro foi realizado com sucesso. Sua jornada está prestes a decolar! 🚀</p>
                <p>Você já está a um passo de começar.</p>
                <p>Se tiver qualquer dúvida, é só responder a este e-mail.</p>
                <p>Abraços,<br>Equipe SeteEduca.</p>
                <br>
                <p><a href="${process.env.APP_HOST || 'http://localhost:3020'}/login" style="padding: 10px 15px; background-color: #FFD972; color: #333; text-decoration: none; border-radius: 5px;">Acessar SeteEduca</a></p>
            `,
        };

        try {
            // Tenta enviar o e-mail
            const info = await transporter.sendMail(mailOptions);
            console.log(`E-mail de boas-vindas enviado com sucesso para ${email}. Message ID: ${info.messageId}`);
        } catch (emailError) {
            // Se falhar, apenas loga o erro no servidor, NÃO impede a resposta de sucesso
            console.error(`!!! ERRO ao enviar e-mail de boas-vindas para ${email}:`, emailError.message);
            // Poderia adicionar um log mais detalhado ou um sistema de retry aqui se necessário
        }
        // <<<--- FIM: Enviar E-mail de Boas-Vindas ---<<<


        // 7. Cadastro Concluído! Retorna sucesso JSON para o fetch.
        console.log(`Cadastro concluído para ${email}. Foto URL: ${fotoUrlPublica || 'Nenhuma'}`); //
        // A resposta de sucesso é enviada DEPOIS de tentar enviar o e-mail
        res.status(201).json({ success: true, message: 'Cadastro realizado com sucesso!' }); //

    } catch (error) { // Bloco de captura de erros gerais
        console.error("Erro detalhado no POST /cadastro:", error); //
        let userMessage = error.message || 'Ocorreu um erro inesperado durante o cadastro.'; //
        if (error.code === '23505' && error.message.includes('email')) userMessage = 'E-mail já cadastrado.'; //
        if (error.code === '23505' && error.message.includes('cnpj')) userMessage = 'CNPJ/CPF já cadastrado.'; //
        res.status(500).json({ success: false, message: userMessage }); //
    }
});

// --- Middleware de tratamento de erro do Multer ---
router.use((err, req, res, next) => { //
    if (err instanceof multer.MulterError || (err && err.message.includes('Formato inválido'))) { //
        console.warn("Erro de Upload (Multer Middleware):", err.message); //
        res.status(400).json({ success: false, message: `Erro no upload: ${err.message}` }); //
    } else if (err) { //
        console.error("Erro inesperado antes da rota de cadastro:", err); //
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' }); //
    } else {
        next(); //
    }
});
// --- FIM Middleware Multer ---

export default router; //