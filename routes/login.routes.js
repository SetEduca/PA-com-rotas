// routes/login.routes.js


// Importa as bibliotecas necessárias
import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../supabase.js';


// Cria o roteador Express
const router = express.Router();


// --- ROTA GET /login ---
router.get("/", (req, res) => {
    try {
        const successMessage = req.query.cadastro === 'sucesso'
            ? 'Cadastro realizado com sucesso! Faça o login.'
            : null;
        res.render("LOGIN/login", { error: null, success: successMessage });
    } catch (renderError) {
        console.error("Erro ao renderizar página de login:", renderError);
        res.status(500).send("Erro ao carregar a página de login.");
    }
});


// --- ROTA POST /login ---
router.post("/", async (req, res) => {
    const { email, password } = req.body;


    if (!email || !password) {
        return res.status(400).render("LOGIN/login", {
            error: 'E-mail e senha são obrigatórios.', success: null
        });
    }


    try {
        // 1. Buscar o usuário na tabela 'cadastro_creche'
        console.log(`Tentando login para: ${email}`);
        const { data: usuario, error: fetchError } = await supabase
            .from('cadastro_creche') // Tabela correta
            .select('id, senha, nome') // Colunas corretas
            .eq('email', email)        // Coluna correta
            .maybeSingle();


        if (fetchError) {
            console.error("Erro ao buscar usuário no login:", fetchError);
            if (fetchError.code === 'PGRST205') {
                 throw new Error("Erro de configuração: A tabela de usuários ('cadastro_creche') não foi encontrada.");
             }
            throw new Error("Erro ao consultar o banco de dados.");
        }


        // 2. Verificar usuário e senha
        let senhaCorreta = false;
        if (usuario) {
             console.log(`Usuário encontrado (ID: ${usuario.id}). Verificando senha...`);
            senhaCorreta = usuario.senha ? await bcrypt.compare(password, usuario.senha) : false;
             console.log(`Senha correta? ${senhaCorreta}`);
        } else {
             console.log(`Usuário com email ${email} não encontrado.`);
        }


        if (!usuario || !senhaCorreta) {
            console.warn(`Tentativa de login falhou (e-mail ou senha inválidos) para: ${email}`);
            return res.status(401).render("LOGIN/login", {
                error: 'E-mail ou senha inválidos.', success: null
            });
        }


        // 3. Login Válido!
        console.log(`Login bem-sucedido para: ${email} (ID: ${usuario.id}, Nome: ${usuario.nome})`);


        // --- LÓGICA DE SESSÃO --- // <-- ATIVADO (REQUER CONFIGURAÇÃO EXTERNA)
        // Certifique-se de ter configurado 'express-session' (ou similar) no seu app.js
        if (req.session) { // Verifica se o middleware de sessão adicionou req.session
             req.session.userId = usuario.id;      // Armazena o ID do usuário na sessão
             req.session.userName = usuario.nome;   // Armazena o nome do usuário na sessão
             req.session.isAuthenticated = true; // Marca a sessão como autenticada
             console.log("Sessão criada/atualizada:", req.session);


             // Salva a sessão explicitamente (bom para garantir antes do redirect)
             req.session.save(err => {
                 if (err) {
                     console.error("Erro ao salvar a sessão:", err);
                     // Decide se o erro ao salvar a sessão deve impedir o login
                     // throw new Error("Não foi possível iniciar a sessão."); // Ou apenas loga
                 }
             });
        } else {
             console.error("!!! ERRO: Middleware de sessão (ex: express-session) não parece estar configurado corretamente! O objeto req.session não existe. O usuário não permanecerá logado.");
             // Considerar lançar um erro ou retornar uma mensagem diferente
             // throw new Error("Erro interno: Sistema de sessão não configurado.");
        }
        // --- FIM LÓGICA DE SESSÃO ---


        // --- INSERIR EM cliente_login --- // <-- ATIVADO (NÃO RECOMENDADO)
        // Verifique se a tabela 'cliente_login' existe e tem as colunas 'email', 'senha'
        // e opcionalmente 'cliente_id' (para relacionar com 'cadastro_creche.id') e 'data_login'.
        try {
            console.log("Tentando inserir em cliente_login...");
            const { error: loginLogError } = await supabase
                .from('cliente_login') // Nome da tabela
                .insert({
                    email: email,       // Coluna 'email'
                    senha: usuario.senha, // Coluna 'senha' (armazena o HASH)
                    // Adicione outras colunas conforme a estrutura da sua tabela:
                    // cliente_id: usuario.id,     // Relaciona com o ID da tabela cadastro_creche
                    // data_login: new Date()      // Registra o momento do login
                });


            if (loginLogError) {
                console.error("Erro ao tentar salvar na tabela cliente_login:", loginLogError);
                // Decide se esse erro impede o login ou só loga
                // throw new Error("Erro ao registrar informações de login."); // Ou só loga o erro
            } else {
                console.log("Informações salvas com sucesso em cliente_login.");
            }
        } catch(clienteLoginError) {
             // Captura erro caso a tabela cliente_login não exista
             console.error("Erro grave ao tentar acessar/inserir em cliente_login:", clienteLoginError);
             // throw new Error("Erro ao registrar login: Tabela 'cliente_login' inacessível ou inválida."); // Ou apenas loga
        }
        // --- FIM INSERIR EM cliente_login ---


        // Redireciona para a página principal após login
        res.redirect('/home');


    } catch (error) { // Captura erros gerais
        console.error("Erro crítico no POST /login:", error);
        res.status(500).render("LOGIN/login", {
            error: error.message || 'Ocorreu um erro interno no servidor. Tente novamente.',
            success: null
        });
    }
});


// Exporta o roteador
export default router;
