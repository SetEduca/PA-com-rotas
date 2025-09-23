// 1. IMPORTAÇÃO DOS MÓDULOS
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

// 2. CONFIGURAÇÃO INICIAL
const app = express();
const PORT = 3020;

// Array temporário para armazenar usuários (simula um banco de dados)
let users = [];

// 3. CONFIGURAÇÃO DOS MIDDLEWARES
// Define o EJS como motor de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Habilita o uso de arquivos estáticos (CSS, imagens, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Habilita o parsing de JSON e de dados de formulário
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura o gerenciamento de sessões para rastrear o status de login
app.use(session({
    secret: 'sua-chave-secreta-muito-segura',
    resave: false,
    saveUninitialized: false, // Alterado para false para maior segurança
    cookie: {
        secure: false, // Em produção, use true com HTTPS
        maxAge: 24 * 60 * 60 * 1000 // A sessão expira em 24 horas
    }
}));

// 4. MIDDLEWARE DE AUTENTICAÇÃO
// Verifica se o usuário está logado antes de acessar rotas protegidas
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next(); // Se estiver logado, continua
    } else {
        res.redirect('/'); // Se não, redireciona para a página de login
    }
};

// 5. DEFINIÇÃO DAS ROTAS
// Rota Raiz (GET): Exibe a página de login ou a home, se já estiver logado
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home');
    }
    res.render('login');
});

// Rota para a página de cadastro (GET)
app.get('/cadastro', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home');
    }
    res.render('cadastro');
});

// Rota para processar o cadastro (POST)
app.post('/cadastro', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validações básicas dos campos
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
        }

        // Verifica se o e-mail já está em uso
        const existingUser = users.find(u => u.email === email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Este e-mail já está cadastrado.' });
        }

        // Criptografa a senha antes de salvar
        const hashedPassword = await bcrypt.hash(password, 12);

        // Cria o novo usuário
        const newUser = {
            id: users.length + 1,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
        };
        users.push(newUser);

        console.log(`Usuário cadastrado: ${newUser.name} (${newUser.email})`);
        res.status(201).json({ success: true, message: 'Cadastro realizado com sucesso!', redirect: '/' });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// Rota para processar o login (POST)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validação básica
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios.' });
        }

        // Busca o usuário pelo e-mail
        const user = users.find(u => u.email === email.toLowerCase());
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não cadastrado.' });
        }

        // Compara a senha enviada com a senha criptografada no "banco"
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
        }

        // Se a senha estiver correta, cria a sessão do usuário
        req.session.userId = user.id;
        req.session.userName = user.name;

        // Envia resposta de sucesso para o front-end
        res.json({ success: true, message: 'Login realizado com sucesso!', redirect: '/home' });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// Rota para a página home (protegida por autenticação)
app.get('/home', requireAuth, (req, res) => {
    res.render('home', {
        userName: req.session.userName
    });
});

// Rota para logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao fazer logout.' });
        }
        res.json({ success: true, message: 'Logout realizado com sucesso!', redirect: '/' });
    });
});

// 6. INICIALIZAÇÃO DO SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log('Sistema funcionando com dados em memória (sem banco de dados real).');
});