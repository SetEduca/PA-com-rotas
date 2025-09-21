import express from 'express';

const app = express();
const PORT = 3020;

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.static('public'));

// Rotas corrigidas
app.get("/", (req, res) => {
  res.render("INICIO/inicial");
});

app.get("/login", (req, res) => {
  res.render("LOGIN/login");
});

app.get("/perfil", (req, res) => {
  res.render("PERFIL/perfil");
});

app.get("/home", (req, res) => {
  res.render("HOME/home");
});

// URLs corrigidas - sem espaços e acentos
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

app.get("/opcoes-aluno", (req, res) => {
  res.render("ALUNO/inicio");
});

app.get("/cadastro-aluno", (req, res) => {
  res.render("ALUNO/cadastro2");
});

app.get("/cadastro-responsavel", (req, res) => {
  res.render("ALUNO/cadastro1");
});

app.get("/criancas-cadastradas", (req, res) => {
  res.render("ALUNO/cria");
});

app.get("/opcoes-financeiro", (req, res) => {
  res.render("FINANCEIRO/bot");
});

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

app.get("/opcoes-turma", (req, res) => {
  res.render("TURMA/index");
});

app.get("/cadastro-turma", (req, res) => {
  res.render("TURMA/cadastro");
});

app.get("/turmas-cadastradas", (req, res) => {
  res.render("TURMA/acessar");
});
app.get("/editar-turmas", (req, res) => {
  res.render("TURMA/editar");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});