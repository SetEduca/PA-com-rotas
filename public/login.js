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
    secret: 'minha-chave-secreta-super-segura-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
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

// ROTAS GET - Renderizar páginas
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home');
    }
    res.render('login');
});

app.get('/cadastro', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home');
    }
    res.render('cadastro');
});

app.get('/trocar', (req, res) => {
    res.render('trocar');
});

app.get('/home', requireAuth, (req, res) => {
    res.render('home', {
        userName: req.session.userName,
        userEmail: req.session.userEmail
    });
});

// ROTAS POST - Processar dados
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'E-mail e senha são obrigatórios.'
            });
        }

        const user = users.find(u => u.email === email.toLowerCase());
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Senha incorreta.'
            });
        }

        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name;

        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            redirect: '/home'
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor.'
        });
    }
});

app.post('/cadastro', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

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

        const existingUser = users.find(u => u.email === email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Este e-mail já está cadastrado.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = {
            id: Date.now(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date()
        };

        users.push(newUser);

        console.log(`Novo usuário cadastrado: ${newUser.name} (${newUser.email})`);
        console.log(`Total de usuários: ${users.length}`);

        res.json({
            success: true,
            message: 'Cadastro realizado com sucesso!',
            redirect: '/'
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor.'
        });
    }
});

app.post('/logout', (req, res) => {
    const userName = req.session.userName;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao fazer logout.'
            });
        }
        
        console.log(`Usuário ${userName} fez logout`);
        
        res.json({
            success: true,
            message: 'Logout realizado com sucesso!',
            redirect: '/'
        });
    });
});

// Rota para debug - ver usuários cadastrados
app.get('/debug/usuarios', (req, res) => {
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

// Middleware de erro 404
app.use((req, res) => {
    res.status(404).render('404', { 
        message: 'Página não encontrada',
        url: req.originalUrl 
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro da aplicação:', err);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log('💾 Dados armazenados em memória');
    console.log('🔄 Reiniciar = perder dados');
    console.log('=================================');
});

// Processar encerramento gracioso
process.on('SIGINT', () => {
    console.log('\n👋 Encerrando servidor...');
    console.log(`📊 Total de usuários cadastrados: ${users.length}`);
    process.exit(0);
});

module.exports = app;