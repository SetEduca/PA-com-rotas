import 'dotenv/config';
import express from 'express';
import supabase from './supabase.js';
import turmasRouter from './routes/turmas.routes.js';
import matriculasRouter from './routes/matricula.routes.js';
import professoresRoutes from './routes/professores.routes.js';
import cadastroRouter from './routes/cadastro.routes.js';
import loginRouter from './routes/login.routes.js';
import mensalidadeRouter from './routes/mensalidades.routes.js';
import arquivadosRouter from './routes/arquivados.routes.js';
import alunoAcessarRouter from './routes/aluno-acessar.routes.js';


 const app = express();
 const PORT = 3020;
 const SALT_ROUNDS = 10;

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
  res.render("PERFIL/meuperfil");});

app.use('/mensalidade', mensalidadeRouter);

app.use('/arquivados', arquivadosRouter);

//HOME

app.get("/home", async (req, res) => { // 1. Adicionado 'async'
    try {
        // 2. BUSQUE OS DADOS REAIS AQUI
        // (Substitua 'professor', 'aluno', 'turma' pelos nomes reais das suas tabelas)
        let { count: profCount } = await supabase
            .from('professor')
            .select('*', { count: 'exact', head: true });

        let { count: alunoCount } = await supabase
            .from('aluno')
            .select('*', { count: 'exact', head: true });

        let { count: turmaCount } = await supabase
            .from('turma')
            .select('*', { count: 'exact', head: true });


        // 3. PASSE TODAS AS VARIÁVEIS PARA O EJS
        res.render("HOME/home", {
            message: "Como podemos te ajudar hoje?",
            daycareName: "Minha Creche", // <-- Corrige 'daycareName is not defined'
            professores: profCount || 0, // <-- Passa a contagem de professores
            alunos: alunoCount || 0,     // <-- Passa a contagem de alunos
            turmas: turmaCount || 0      // <-- Passa a contagem de turmas
        });

    } catch (error) {
        // 4. Se o Supabase falhar, envie dados de erro
        console.error("Erro ao carregar a rota /home:", error.message);
        res.render("HOME/home", {
            message: "Erro ao carregar dados.",
            daycareName: "Erro", // <-- Passa 'Erro' para não travar
            professores: '!',
            alunos: '!',
            turmas: '!'
        });
    }
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

// app.js
// ... todo o código anterior ...

// Apenas inicia o servidor se não estiver em modo de teste
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3020;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3020;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

export default app;