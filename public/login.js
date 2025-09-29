const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = 3020;

// Array temporário para armazenar usuários (em um projeto real, use um banco de dados)
let users = [];

// Array para armazenar códigos de recuperação temporários
let recoveryCodes = [];

// --- Configuração do Nodemailer ---
// IMPORTANTE: Configure com suas credenciais reais
const transporter = nodemailer.createTransport({
    service: 'gmail', // ou outro serviço (outlook, yahoo, etc)
    auth: {
        user: 'seu-email@gmail.com', // Substitua pelo seu e-mail
        pass: 'sua-senha-app' // Substitua pela senha de aplicativo do Gmail
    }
});

// Função para gerar código de 6 dígitos
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Função para enviar e-mail com código
async function sendRecoveryEmail(email, code) {
    const mailOptions = {
        from: '"Seu App" <seu-email@gmail.com>', // Nome do remetente
        to: email,
        subject: 'Código de Recuperação de Senha',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #fcdc6a; text-align: center;">Recuperação de Senha</h2>
                <p>Você solicitou a recuperação de senha para sua conta.</p>
                <p>Seu código de verificação é:</p>
                <div style="background-color: #FFF9E8; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 10px;">
                    ${code}
                </div>
                <p style="color: #dc3545; font-weight: bold;">Este código expira em 10 minutos.</p>
                <p>Se você não solicitou esta recuperação, por favor, ignore este e-mail.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('E-mail de recuperação enviado com sucesso para:', email);
        return true;
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return false;
    }
}

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão
app.use(session({
    secret: 'seu-secret-key-super-seguro-e-longo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Em produção, use true com HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Middleware para verificar autenticação
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// --- ROTAS PRINCIPAIS ---

// Rota para a página de login (GET)
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/home');
    }
    res.render('login');
});

// Rota raiz redireciona para login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Rota para processar o login (POST)
app.post('/login', async (req, res) => {
    // ... (sua lógica de login aqui, não precisa mudar)
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
    // ... (sua lógica de cadastro aqui, não precisa mudar)
});


// ========== ROTAS DE RECUPERAÇÃO DE SENHA (API) ==========

// API: Solicitar código de recuperação
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
        }

        const user = users.find(u => u.email === email.toLowerCase());
        if (!user) {
            return res.status(404).json({ success: false, message: 'E-mail não encontrado em nosso sistema.' });
        }

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        recoveryCodes = recoveryCodes.filter(rc => rc.email !== email.toLowerCase());
        recoveryCodes.push({ email: email.toLowerCase(), code, expiresAt, verified: false });

        const emailSent = await sendRecoveryEmail(email, code);
        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Erro ao enviar e-mail. Verifique as configurações do servidor.' });
        }

        res.json({ success: true, message: 'Código enviado para seu e-mail!' });
    } catch (error) {
        console.error('Erro ao solicitar recuperação:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar a solicitação.' });
    }
});

// API: Verificar código
app.post('/api/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'E-mail e código são obrigatórios.' });
        }

        const recoveryCode = recoveryCodes.find(rc => rc.email === email.toLowerCase() && rc.code === code);
        if (!recoveryCode) {
            return res.status(400).json({ success: false, message: 'Código inválido.' });
        }

        if (new Date() > recoveryCode.expiresAt) {
            return res.status(400).json({ success: false, message: 'Código expirado. Solicite um novo código.' });
        }

        recoveryCode.verified = true;
        res.json({ success: true, message: 'Código verificado com sucesso!' });
    } catch (error) {
        console.error('Erro ao verificar código:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao verificar o código.' });
    }
});

// API: Redefinir senha
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
        }

        const recoveryCode = recoveryCodes.find(rc => rc.email === email.toLowerCase() && rc.code === code && rc.verified === true);
        if (!recoveryCode) {
            return res.status(400).json({ success: false, message: 'Código inválido ou não verificado. Tente novamente.' });
        }
        if (new Date() > recoveryCode.expiresAt) {
            return res.status(400).json({ success: false, message: 'Sessão de recuperação expirada. Por favor, reinicie o processo.' });
        }

        const userIndex = users.findIndex(u => u.email === email.toLowerCase());
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        users[userIndex].password = hashedPassword;

        recoveryCodes = recoveryCodes.filter(rc => rc.email !== email.toLowerCase());

        console.log(`Senha redefinida com sucesso para o usuário: ${email}`);
        res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao redefinir a senha.' });
    }
});

// Rota para a página home (protegida)
app.get('/home', requireAuth, (req, res) => {
    res.render('home', {
        userName: req.session.userName
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Sistema funcionando SEM banco de dados (dados em memória)');
    console.log('\n⚠️  IMPORTANTE: Configure o e-mail no código antes de usar a recuperação de senha!');
});