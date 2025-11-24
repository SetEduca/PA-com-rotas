import 'dotenv/config';
import express from 'express';
import session from 'express-session'; 
import supabase from './supabase.js';

// ==================================================================
// 💾 ADICIONADO: SISTEMA PARA SALVAR LOGIN EM ARQUIVO
// (Isso impede que o login caia quando o servidor reinicia)
// ==================================================================
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FileStore = require('session-file-store')(session);
// ==================================================================

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
 app.use(express.json({ limit: '50mb' }));
 app.use(express.urlencoded({ extended: true, limit: '50mb' }));
 app.use(express.urlencoded({ extended: true }));


// ==================================================================
// 🟢 CONFIGURAÇÃO DE SESSÃO (COM ARQUIVO FÍSICO)
// ==================================================================
 app.use(session({
    // ADICIONEI ISTO AQUI PARA SALVAR O LOGIN NA PASTA ./sessions
    store: new FileStore({
        path: './sessions',
        ttl: 86400,
        reapInterval: 3600,
        logFn: function(){} // Silencia logs chatos
    }),
    // -----------------------------------------------------------
    secret: 'coloque-uma-chave-secreta-forte-aqui-depois', 
    resave: false,           // Mudei para false pois FileStore gerencia isso melhor
    saveUninitialized: false, // Mudei para false para não criar lixo
    rolling: true,           
    cookie: { 
        secure: false, 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    } 
}));
// ==================================================================
 

//INICIO

app.get("/", (req, res) => {
  // Envia o arquivo site.html que agora está na pasta public
  res.sendFile(process.cwd() + "/public/site.html");
});

//LOGIN

app.use('/login', loginRouter);


// CADASTROINICIAL
app.use('/cadastro', cadastroRouter);

//PERFIL

// PERFIL - Rotas do perfil (ATUALIZADO)
app.use('/meuperfil', privateRoute, perfilRouter);
app.use('/api/perfil', privateRoute, perfilRouter);

// Outras rotas protegidas
app.use('/mensalidade', privateRoute, mensalidadeRouter); 
app.use('/arquivados', privateRoute, arquivadosRouter); 
 

//HOME

// ==================================================================
// 🚨 AQUI FOI A ÚNICA ALTERAÇÃO: ADICIONEI O privateRoute 🚨
// ==================================================================
app.get("/home", privateRoute, async (req, res) => {
    try {
        console.log("--- Carregando Home (Tudo Filtrado) ---");

        // 1. PROFESSORES (Agora filtrando ativos no JS)
        let { data: profData } = await supabase
            .from('professor')
            .select('ativo'); // Traz apenas a coluna ativo
        
        let profFinal = 0;
        if (profData) {
            profFinal = profData.filter(p => p.ativo === true || p.ativo === 'true' || p.ativo === 'TRUE').length;
        }

        // 2. ALUNOS (Mantido total por enquanto, se quiser filtrar avise)
        let { count: alunoCount } = await supabase
            .from('aluno')
            .select('*', { count: 'exact', head: true });

        // 3. TURMAS (Filtro JS)
        let { data: turmasData } = await supabase
            .from('turma')
            .select('ativo');
        
        let turmaFinal = 0;
        if (turmasData) {
            turmaFinal = turmasData.filter(t => t.ativo === true || t.ativo === 'true' || t.ativo === 'TRUE').length;
        }

        // 4. MATRÍCULAS (Filtro JS)
        let { data: todasMatriculas } = await supabase
            .from('matricula') 
            .select('ativo');

        let matriculaFinal = 0;
        if (todasMatriculas) {
            matriculaFinal = todasMatriculas.filter(m => 
                m.ativo === true || m.ativo === 'true' || m.ativo === 'TRUE'
            ).length;
        }

        console.log(`📊 Resumo Home -> Profs: ${profFinal} | Turmas: ${turmaFinal} | Matrículas: ${matriculaFinal}`);

        // Renderiza
        res.render("HOME/home", {
            message: "Como podemos te ajudar hoje?",
            daycareName: "Minha Creche",
            
            // Passando os valores filtrados
            professores: profFinal, 
            
            alunos: alunoCount || 0,
            
            turmas: turmaFinal,
            turma: turmaFinal,   // Fallback nome singular

            matriculas: matriculaFinal,
            matricula: matriculaFinal, // Fallback nome singular
            
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