 import 'dotenv/config';
 import express from 'express';
 import supabase from './supabase.js';
 import turmasRouter from './routes/turmas.routes.js';
 import matriculasRouter from './routes/matricula.routes.js';
 import professoresRoutes from './routes/professores.routes.js';
import cadastroRouter from './routes/cadastro.routes.js';
import loginRouter from './routes/login.routes.js';

 const app = express();
 const PORT = 3020;

// --- CONFIGURAÇÕES GERAIS ---
app.use(express.json());
 app.set("view engine", "ejs");
 app.set("views", "./views");
 app.use(express.static('public'));
 app.use(express.urlencoded({ extended: true }));

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
  res.render("PERFIL/meuperfil");
});

app.get("/mensalidade", (req, res) => {
  res.render("PERFIL/mensalidade");
});

app.get("/arquivados", (req, res) => {
  res.render("PERFIL/arquivados");
});

//HOME

app.get("/home", (req, res) => {
  res.render("HOME/home");
});

// SENHA

app.get("/trocar-senha", (req, res) => {
  res.render("SENHA/senha");
});

app.get("/codigo-confirmacao", (req, res) => {
  res.render("SENHA/codigo");
});

app.get("/nova-senha", (req, res) => {
  res.render("SENHA/trocar");
});

app.get("/senha-trocada", (req, res) => {
  res.render("SENHA/pronto");
});

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

app.get("/relatorio", (req, res) => {
  res.render("FINANCEIRO/relatorio");
});

app.get("/relatorio-diario", (req, res) => {
  res.render("FINANCEIRO/rel_diario");
});

app.get("/relatorio-mensal", (req, res) => {
  res.render("FINANCEIRO/rel_mensal");
});

app.get("/fluxo-de-caixa", (req, res) => {
  res.render("FINANCEIRO/fluxo_de_caixa");
});

app.get("/relatorio-financeiro", (req, res) => {
  res.render("FINANCEIRO/financial_report_page");
});

app.get("/adimplentes-inadimplentes", (req, res) => {
  res.render("FINANCEIRO/adimplentes");
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

// FINANCEIRO
app.get("/financeiro", (req, res) => {
  res.render("FINANCEIRO/financeiro");
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
