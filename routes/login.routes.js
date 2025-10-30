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
            .eq('email', email)       // Coluna correta
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
section: routes/login.routes.js
        }

        if (!usuario || !senhaCorreta) {
            console.warn(`Tentativa de login falhou (e-mail ou senha inválidos) para: ${email}`);
            return res.status(401).render("LOGIN/login", {
                error: 'E-mail ou senha inválidos.', success: null
            });
        }

        // 3. Login Válido!
        console.log(`Login bem-sucedido para: ${email} (ID: ${usuario.id}, Nome: ${usuario.nome})`);

        // --- LÓGICA DE SESSÃO --- //
        if (req.session) { // Verifica se o middleware de sessão adicionou req.session
            req.session.userId = usuario.id;      // Armazena o ID do usuário na sessão
            req.session.userName = usuario.nome;   // Armazena o nome do usuário na sessão
            req.session.isAuthenticated = true; // Marca a sessão como autenticada
            console.log("Sessão criada/atualizada:", req.session);

            req.session.save(err => {
                if (err) {
                    console.error("Erro ao salvar a sessão:", err);
                }
            });
        } else {
            console.error("!!! ERRO: Middleware de sessão (ex: express-session) não parece estar configurado corretamente! O objeto req.session não existe. O usuário não permanecerá logado.");
        }
        // --- FIM LÓGICA DE SESSÃO ---

        // ==================================================================
        // --- ALTERAÇÃO APLICADA AQUI ---
        // Voltamos para .insert()
        // Isso agora funciona, pois o erro '23505' (duplicate key) foi
        // corrigido ao removermos a regra UNIQUE do banco de dados.
        // Isso vai criar um HISTÓRICO de todos os logins.
        // ==================================================================
        try {
            console.log("Tentando inserir em cliente_login (insert)...");
            const { error: loginLogError } = await supabase
                .from('cliente_login') // Nome da tabela
                .insert({
                    email_creche: email,       // Coluna 'email_creche'
                    senha_creche: usuario.senha, // Coluna 'senha_creche'
                });

            if (loginLogError) {
                // O erro '23505' (duplicado) não deve mais acontecer.
                // O erro '42P10' (upsert) também não.
                console.error("Erro ao tentar salvar (insert) na tabela cliente_login:", loginLogError);
            } else {
                console.log("Informações salvas com sucesso em cliente_login.");
            }
        } catch (clienteLoginError) {
            console.error("Erro grave ao tentar acessar/inserir em cliente_login:", clienteLoginError);
        }
        // --- FIM INSERIR EM cliente_login ---

        res.render('CARREGAMENTO/teladecarre');

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


