// 1. IMPORTAÇÃO DOS MÓDULOS
const express = require('express');
const session = require('express-session');
const path = require('path');

// 2. INICIALIZAÇÃO DO APP
const app = express();
const PORT = 3020;

// 3. CONFIGURAÇÃO DOS MIDDLEWARES
// Define o EJS como motor de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Habilita o uso de arquivos estáticos (CSS, imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Permite que o servidor interprete dados de formulários enviados com method="POST"
app.use(express.urlencoded({ extended: true }));

// Configura o gerenciamento de sessões para rastrear o status de login
app.use(session({
    secret: 'sua-chave-secreta-muito-segura',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// 4. DADOS MOCK (SIMULAÇÃO DE BANCO DE DADOS)
const users = {
    'admin': 'senha123',
    'usuario@email.com': 'abcde',
    'joao': '456'
};

// 5. DEFINIÇÃO DAS ROTAS

// Rota Raiz: Redireciona para a página de login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Rota de Login (GET): Apenas exibe a página de login
app.get('/login', (req, res) => {
    const errorMessage = req.session.errorMessage;
    req.session.errorMessage = null; 
    res.render('login', { message: errorMessage });
});

// Rota de Login (POST): Processa os dados do formulário
// ESTA É A ROTA ESSENCIAL PARA CORRIGIR O SEU ERRO
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Valida as credenciais
    if (users[username] && users[username] === password) {
        // Se corretas, cria a sessão e redireciona para a home
        req.session.isLoggedIn = true;
        req.session.username = username;
        res.redirect('/home');
    } else {
        // Se incorretas, define uma mensagem de erro e volta para o login
        req.session.errorMessage = 'Usuário ou senha inválidos.';
        res.redirect('/login');
    }
});

// Rota Home (GET): Página protegida que requer login
app.get('/home', (req, res) => {
    // Verifica se o usuário está na sessão
    if (req.session.isLoggedIn) {
        // Se sim, exibe a página de boas-vindas
        res.render('home', { username: req.session.username });
    } else {
        // Se não, redireciona para o login com uma mensagem de aviso
        req.session.errorMessage = 'Você precisa fazer login para acessar esta página.';
        res.redirect('/login');
    }
});

// 6. INICIALIZAÇÃO DO SERVIDOR
app.listen(3020, () => {
    console.log(`Servidor rodando com sucesso em http://localhost:3020`);
});


