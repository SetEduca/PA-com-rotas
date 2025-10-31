import 'dotenv/config';
import express from 'express';
import session from 'express-session'; // <<< 1. IMPORTE O PACOTE DE SESSÃO
import supabase from './supabase.js';
import turmasRouter from './routes/turmas.routes.js';
import matriculasRouter from './routes/matricula.routes.js';
import professoresRoutes from './routes/professores.routes.js';
import cadastroRouter from './routes/cadastro.routes.js';
import loginRouter from './routes/login.routes.js';
import mensalidadeRouter from './routes/mensalidades.routes.js';
import arquivadosRouter from './routes/arquivados.routes.js';
import alunoAcessarRouter from './routes/aluno-acessar.routes.js';
import apiRoutes from './routes/api.js';
import senhaRouter from './routes/senha.routes.js';


 const app = express();
 const PORT = 3020;
 const SALT_ROUNDS = 10;

// --- CONFIGURAÇÕES GERAIS ---
app.use(express.json());
 app.set("view engine", "ejs");
 app.set("views", "./views");
 app.use(express.static('public'));
 app.use(express.urlencoded({ extended: true }));


 app.use(session({
    secret: 'coloque-uma-chave-secreta-forte-aqui-depois', // IMPORTANTE: Mude isso para uma string segura
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Em produção (com HTTPS), mude para 'true'
        maxAge: 24 * 60 * 60 * 1000 // Ex: sessão dura 1 dia (em milissegundos)
    } 
}));
 
 

//INICIO

app.get("/", (req, res) => {
  res.render("INICIO/inicial");
});

//LOGIN

app.use('/login', loginRouter);


// CADASTROINICIAL
app.use('/cadastro', cadastroRouter);

//PERFIL

app.get("/meuperfil", (req, res) => {
  res.render("PERFIL/meuperfil");});

app.use('/mensalidade', mensalidadeRouter);

app.use('/arquivados', arquivadosRouter);

//HOME

app.get("/home", (req, res) => {
  res.render("HOME/home");
});

// SENHA

app.use('/senha', senhaRouter);

//CADASTRO

// ========================================================================
//                           *** CORREÇÃO DE ROTA (1/2) ***
// 1. Esta rota GET específica para /cadastro-aluno (o formulário)
//    deve vir ANTES do app.use() que captura o prefixo.
// ========================================================================
app.get("/cadastro-aluno", (req, res) => {
  res.render("ALUNO/cadastro-aluno");
});

app.get("/cadastro-responsavel", (req, res) => {
  res.render("ALUNO/cadastro1");
});

// ========================================================================
//                           *** CORREÇÃO DE ROTA (2/2) ***
// 2. O prefixo deste router deve ser '/acessar-aluno' para bater
//    com as chamadas de API (fetch) do seu arquivo 'acessar-aluno.ejs' 
// ========================================================================
app.use("/acessar-aluno", alunoAcessarRouter);


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