
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3020;

// Array temporário para armazenar usuários (substitui o banco de dados)
let users = [];

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão
app.use(session({
    secret: 'seu-secret-key-super-seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // em produção, use true com HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Middleware para verificar autenticação
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/');
    }
};

// Rota principal - renderiza a página de login
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home');
    }
    res.render('login');
});

// Rota para a página de login (GET)
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home.html');
    }
    res.render('login');
});

// Rota para processar o login (POST)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validação básica
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'E-mail e senha são obrigatórios.'
            });
        }

        // Buscar usuário no array
        const user = users.find(u => u.email === email.toLowerCase());
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não cadastrado. Por favor, crie uma conta primeiro.'
            });
        }

        // Verificar senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha inválidos.'
            });
        }

        // Criar sessão do usuário
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name;

        // Sucesso na autenticação
        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            redirect: '/home.html'
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor. Tente novamente.'
        });
    }
});

// Rota para a página cadastro.html
app.get('/cadastro', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home');
    }
    res.render('cadastro');
});

// Rota para processar cadastro (POST)
app.post('/cadastro', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validações
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios.'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'As senhas não coincidem.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter pelo menos 6 caracteres.'
            });
        }

        // Verificar se o usuário já existe
        const existingUser = users.find(u => u.email === email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Este e-mail já está cadastrado.'
            });
        }

        // Hash da senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Criar novo usuário
        const newUser = {
            id: users.length + 1,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date()
        };

        users.push(newUser);

        console.log('Usuário cadastrado:', { name, email: email.toLowerCase() });
        console.log('Total de usuários:', users.length);

        res.json({
            success: true,
            message: 'Cadastro realizado com sucesso! Você pode fazer login agora.',
            redirect: '/'
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor. Tente novamente.'
        });
    }
});

// Rota para a página trocar.html (recuperar senha)
app.get('/trocar.html', (req, res) => {
    res.render('trocar');
});

// Rota para a página home.html (protegida)
app.get('/home', requireAuth, (req, res) => {
    res.render('/home', {
        userName: req.session.userName,
        userEmail: req.session.userEmail
    });
});

// Rota para logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao fazer logout.'
            });
        }
        res.json({
            success: true,
            message: 'Logout realizado com sucesso!',
            redirect: '/'
        });
    });
});

// Rota para listar usuários (apenas para desenvolvimento)
app.get('/usuarios', (req, res) => {
    res.json({
        total: users.length,
        usuarios: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            createdAt: u.createdAt
        }))
    });
});

// Middleware para lidar com rotas não encontradas
app.use((req, res) => {
    res.status(404).send('Página não encontrada');
});

// Middleware para lidar com erros
app.use((err, req, res, next) => {
    console.error('Erro:', err.stack);
    res.status(500).send('Algo deu errado!');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log('Sistema funcionando SEM banco de dados (dados em memória)');
});

module.exports = app;