const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3020;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'sua_chave_secreta_aqui',
    resave: false,
    saveUninitialized: true,
}));


const usuariosValidos = {
    'admin@email.com': 'admin123',
    'usuario_teste': 'senha_segura'
};



app.get('/', (req, res) => {
    res.redirect('/login');
});


app.get('/login', (req, res) => {
    const message = req.session.message;
    req.session.message = null;
    res.render('login', { message: message });
});


app.post('/login', (req, res) => {
    const { usu, senha } = req.body;

    if (usuariosValidos[usu] && usuariosValidos[usu] === senha) {
        req.session.isLoggedIn = true;
        req.session.username = usu;
        res.redirect('/home');
    } else {
        req.session.message = 'Usuário ou senha inválidos. Tente novamente.';
        res.redirect('/login');
    }
});


app.get('/home', (req, res) => {
 
    if (req.session.isLoggedIn) {
        
        res.render('home', { username: req.session.username });
    } else {
        req.session.message = 'Por favor, faça login para acessar esta página.';
        res.redirect('/login');
    }
});


app.listen(3020, () => {
    console.log("Servidor rodando em http://localhost:3020")
});