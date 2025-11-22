import 'dotenv/config';
import express from 'express';
import session from 'express-session'; 
import supabase from './supabase.js';
import turmasRouter from './routes/turmas.routes.js';
import matriculasRouter from './routes/matricula.routes.js';
import professoresRoutes from './routes/professores.routes.js';
import cadastroRouter from './routes/cadastro.routes.js';
import loginRouter from './routes/login.routes.js';
import mensalidadeRouter from './routes/mensalidades.routes.js';
import arquivadosRouter from './routes/arquivados.routes.js';
import alunoAcessarRouter from './routes/aluno-acessar.routes.js';
import senhaRouter from './routes/senha.routes.js';
import perfilRouter from './routes/perfil.routes.js';
import financeiroRoutes from './routes/financeiro.routes.js';

import privateRoute from './routes/private.route.js'; 

 const app = express();
 const PORT = 3020;
 const SALT_ROUNDS = 10;

// ==================================================================
// 🚨 MUDANÇA CRUCIAL: O MATADOR DE CACHE VEM PRIMEIRO! 🚨
// Colocando aqui no topo, garantimos que NENHUMA página seja salva
// na memória do navegador.
// ==================================================================
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});
// ==================================================================


// --- CONFIGURAÇÕES GERAIS ---
app.use(express.json());
 app.set("view engine", "ejs");
 app.set("views", "./views");
 app.use(express.static('public'));
 app.use(express.urlencoded({ extended: true }));


 app.use(session({
    secret: 'coloque-uma-chave-secreta-forte-aqui-depois', 
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 
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

app.get("/meuperfil", privateRoute, (req, res) => { 
  res.render("PERFIL/meuperfil");});

app.use('/mensalidade', privateRoute, mensalidadeRouter); 

app.use('/arquivados', privateRoute, arquivadosRouter); 

app.use('/api/perfil', privateRoute, perfilRouter); 

//HOME

app.get("/home", privateRoute, async (req, res) => { 
    try {
        console.log("--- Carregando Home (Modo Infalível) ---");

        // 1. Professores
        let { count: profCount } = await supabase
            .from('professor')
            .select('*', { count: 'exact', head: true });

        // 2. Alunos
        let { count: alunoCount } = await supabase
            .from('aluno')
            .select('*', { count: 'exact', head: true });

        // 3. Turmas (Filtro JS para garantir)
        let { data: turmasData } = await supabase
            .from('turma')
            .select('ativo');
        
        // Conta manualmente qualquer coisa que pareça "verdadeiro"
        let turmaFinal = 0;
        if (turmasData) {
            turmaFinal = turmasData.filter(t => t.ativo === true || t.ativo === 'true' || t.ativo === 'TRUE').length;
        }

        // 4. Matrículas (A CORREÇÃO PRINCIPAL)
        // Baixa TODAS as matrículas sem filtro no banco
        let { data: todasMatriculas, error: erroMat } = await supabase
            .from('matricula') 
            .select('ativo'); // Só traz a coluna ativo

        let matriculaFinal = 0;

        if (erroMat) {
            console.log("❌ Erro ao buscar tabela matricula:", erroMat.message);
        } else if (todasMatriculas) {
            // Filtra NA MÃO aqui no servidor. Pega true (booleano) ou "true" (texto)
            const ativas = todasMatriculas.filter(m => 
                m.ativo === true || m.ativo === 'true' || m.ativo === 'TRUE'
            );
            matriculaFinal = ativas.length;
            
            console.log(`✅ Total no banco: ${todasMatriculas.length}`);
            console.log(`✅ Total ATIVAS (filtrado no JS): ${matriculaFinal}`);
        }

        // Renderiza passando TUDO para garantir
        res.render("HOME/home", {
            message: "Como podemos te ajudar hoje?",
            daycareName: "Minha Creche",
            
            professores: profCount || 0,
            alunos: alunoCount || 0,
            
            turmas: turmaFinal,  // Nome padrão
            turma: turmaFinal,   // Nome alternativo (singular)

            matriculas: matriculaFinal, // Nome padrão (plural)
            matricula: matriculaFinal,  // Nome alternativo (singular) - PARA GARANTIR
            
            // Variável de depuração caso precise exibir na tela pra testar
            debugMatricula: matriculaFinal 
        });

    } catch (error) {
        console.error("Erro CRÍTICO na rota /home:", error.message);
        res.render("HOME/home", {
            message: "Erro ao carregar dados.",
            daycareName: "Erro",
            professores: '!', alunos: '!', turmas: '!', matriculas: '!'
        });
    }
});

// SENHA
app.use('/senha', senhaRouter);

//CADASTRO

// ========================================================================
//                           *** CORREÇÃO DE ROTA (1/2) ***
// 1. Esta rota GET específica para /cadastro-aluno (o formulário)
//    deve vir ANTES do app.use() que captura o prefixo.
// ========================================================================
app.get("/cadastro-aluno", privateRoute, (req, res) => { 
  res.render("ALUNO/cadastro-aluno");
});

app.get("/cadastro-responsavel", privateRoute, (req, res) => { 
  res.render("ALUNO/cadastro1");
});

// ========================================================================
//                           *** CORREÇÃO DE ROTA (2/2) ***
// 2. O prefixo deste router deve ser '/acessar-aluno' para bater
//    com as chamadas de API (fetch) do seu arquivo 'acessar-aluno.ejs' 
// ========================================================================
app.use("/acessar-aluno", privateRoute, alunoAcessarRouter); 


//FINANCEIRO



app.get('/financeiro', privateRoute, (req, res) => { 
  res.render('FINANCEIRO/financeiro');
});

//TURMAS

app.use('/turmas', privateRoute, turmasRouter); 

//MATRICULA

app.use('/matriculas', privateRoute, matriculasRouter); 

//PROFESSOR

app.use('/professores', privateRoute, professoresRoutes); 

//TERMOS
app.get('/termossete', (req, res) => { // Rota alterada de /termos-de-uso para /termossete
    try {
        res.render('TERMOS/termossete', { 
            title: 'Termos de Uso - Sete Educacional' 
        });
    } catch (error) {
        console.error("Erro ao renderizar Termos de Uso:", error);
        res.status(500).send("Erro ao carregar a página.");
    }
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


app.use('/api', privateRoute, financeiroRoutes); 

// ... (provavelmente suas outras rotas, como app.get('/login', ...))

// A linha do app.listen fica no final
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
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