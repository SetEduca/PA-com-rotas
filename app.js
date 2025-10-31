import 'dotenv/config';
import express from 'express';
import session from 'express-session'; // <<< 1. IMPORTE O PACOTE DE SESSÃO
import supabase from './supabase.js';
import turmasRouter from './routes/turmas.routes.js';
import matriculasRouter from './routes/matricula.routes.js';
import professoresRoutes from './routes/professores.routes.js';
import cadastroRouter from './routes/cadastro.routes.js';
import loginRouter from './routes/login.routes.js';
import mensalidadeRouter from './routes/mensalidades.routes.js'
import arquivadosRouter from './routes/arquivados.routes.js'
import apiRoutes from './routes/api.js';
import senhaRouter from './routes/senha.routes.js';

const app = express();
const PORT = 3020;
// A constante SALT_ROUNDS não é usada aqui, mas pode ser usada no seu 'login.routes.js'
// const SALT_ROUNDS = 10; 


// --- CONFIGURAÇÕES GERAIS ---
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// <<< 2. CONFIGURE A SESSÃO AQUI (ANTES DAS ROTAS) ---
// Isso cria o objeto `req.session` para todas as rotas abaixo
app.use(session({
    secret: 'coloque-uma-chave-secreta-forte-aqui-depois', // IMPORTANTE: Mude isso para uma string segura
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Em produção (com HTTPS), mude para 'true'
        maxAge: 24 * 60 * 60 * 1000 // Ex: sessão dura 1 dia (em milissegundos)
    } 
}));
// ---------------------------------------------------


//INICIO
app.get("/", (req, res) => {
  res.render("INICIO/inicial");
});

//LOGIN
// Esta rota agora terá acesso ao req.session
app.use('/login', loginRouter);


// CADASTROINICIAL
app.use('/cadastro', cadastroRouter);


//PERFIL
// Esta rota também terá acesso ao req.session
app.get("/meuperfil", (req, res) => {
  // Você pode adicionar uma verificação aqui:
  // if (!req.session.usuario) {
  //   return res.redirect('/login');
  // }
  res.render("PERFIL/meuperfil");
});

app.use('/mensalidade', mensalidadeRouter);

app.use('/arquivados', arquivadosRouter);

//HOME
app.get("/home", (req, res) => {
  res.render("HOME/home");
});

// SENHA

app.use('/senha', senhaRouter);

//CADASTRO

app.get("/acessar-aluno", (req, res) => {
  res.render("ALUNO/acessar-aluno");
});

app.get("/cadastro-responsavel", (req, res) => {
  res.render("ALUNO/cadastro1");
});

app.get("/cadastro-aluno", (req, res) => {
  res.render("ALUNO/cadastro-aluno");
});

//FINANCEIRO

app.use('/api', apiRoutes);

app.get('/financeiro', (req, res) => {
    res.render('FINANCEIRO/financeiro');
});

//TURMAS

app.use('/turmas', turmasRouter);

//MATRICULA

app.use('/matriculas', matriculasRouter);

//PROFESSOR

app.use('/professores', professoresRoutes);

app.get("/cadastro-prof", (req, res) => {
  res.render("PROFESSOR/cadastrop");
});

app.get("/prof-cadastrados", (req, res) => {
  res.render("PROFESSOR/acessop");
});
app.get("/editar-prof", (req, res) => {
  res.render("PROFESSOR/editarp");
});





//TESTANDO O BANCO

app.get('/testar-banco', async (req, res) => {
  try{
        const { error, count } = await supabase
            .from('professor') 
            .select('*', { count: 'exact', head: true });

        if (error) {
            throw error;
        };

        res.status(200).json({
            status: 'success',
            message: 'Deu bom meninas',
            details: `Tabela "professor" acessível e possui ${count} registros.`
        });

  }catch(error){
    res.status(500).json({
        status: 'error',
        message: 'Deu ruim meninas',
        error: error.message
    });
  }
});


//RODANDO O SERVIDOR
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
