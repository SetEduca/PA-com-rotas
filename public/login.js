
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3020;

app.set('view engine', 'ejs');


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'sua-chave-secreta-muito-segura',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const users = {
    'admin': 'senha123',
    'usuario@email.com': 'abcde',
    'joao': '456',
    'Seteeduca': '1234567'
};

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    const errorMessage = req.session.errorMessage;
    req.session.errorMessage = null; 
    res.render('login', { message: errorMessage });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (users[username] && users[username] === password) {
        req.session.isLoggedIn = true;
        req.session.username = username;
        res.redirect('/home');
    } else {
        req.session.errorMessage = 'Usuário ou senha inválidos.';
        res.redirect('/login');
    }
});

app.get('/home', (req, res) => {
    if (req.session.isLoggedIn) {
        res.render('home', { username: req.session.username });
    } else {
        req.session.errorMessage = 'Você precisa fazer login para acessar esta página.';
        res.redirect('/login');
    }
});

app.listen(3020, () => {
    console.log(`Servidor rodando com sucesso em http://localhost:3020`);
});