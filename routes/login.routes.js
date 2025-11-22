import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../supabase.js';

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
        console.log(`Tentando login para: ${email}`);
        const { data: usuario, error: fetchError } = await supabase
            .from('cadastro_creche')
            .select('id, senha, nome')
            .eq('email', email)
            .maybeSingle();

        if (fetchError) throw new Error("Erro ao consultar o banco de dados.");

        let senhaCorreta = false;
        if (usuario) {
            senhaCorreta = usuario.senha ? await bcrypt.compare(password, usuario.senha) : false;
        }

        if (!usuario || !senhaCorreta) {
            return res.status(401).render("LOGIN/login", {
                error: 'E-mail ou senha inválidos.', success: null
            });
        }

        // --- CRIAÇÃO DA SESSÃO ---
        if (req.session) {
            req.session.userId = usuario.id;
            req.session.userName = usuario.nome;
            req.session.isAuthenticated = true;
            req.session.user = usuario; 

            console.log("✅ Sessão CRIADA com sucesso para:", usuario.nome);

            req.session.save(err => {
                if (err) console.error("Erro ao salvar sessão:", err);
                
                // 👇 MUDANÇA AQUI 👇
                // Aponta para a pasta CARREGAMENTO e o arquivo teladecarre
                res.render('CARREGAMENTO/teladecarre');
            });
        } else {
            console.error("Erro: Sessão não configurada.");
            res.redirect('/home');
        }
        
        // Log de acesso
        try {
            await supabase.from('cliente_login').insert({
                email_creche: email,       
                senha_creche: usuario.senha, 
            });
        } catch (e) { console.error(e); }

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).render("LOGIN/login", { error: 'Erro interno.', success: null });
    }
});

// ==========================================================
// ☢️ ROTA SAIR
// ==========================================================
router.get("/sair", (req, res) => {
    console.log("👋 ROTA DE SAIR ACIONADA. Destruindo tudo...");

    if (req.session) {
        req.session.user = null;
        req.session.isAuthenticated = false;

        req.session.destroy((err) => {
            if (err) console.error("❌ Erro ao destruir sessão:", err);
            res.clearCookie('connect.sid', { path: '/' }); 
            res.redirect('/login');
        });
    } else {
        res.redirect('/login');
    }
});

export default router;