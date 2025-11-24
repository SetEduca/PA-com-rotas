import 'dotenv/config';
import express from 'express';
import session from 'express-session'; 
import supabase from './supabase.js';

// ==================================================================
// 💾 SISTEMA DE SESSÃO
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
// Se o Vercel definir uma porta, usa ela, senão usa a 3020
const PORT = process.env.PORT || 3020; 

// ==================================================================
// 🚨 CACHE CONTROL
// ==================================================================
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// --- CONFIGURAÇÕES GERAIS ---
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", "./views");

// 🔥 AQUI ESTÁ O SEGREDO: 
// Como você tem 'index.html' dentro de 'public', esta linha carrega ele
// automaticamente quando alguém entra na home.
app.use(express.static('public'));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// ==================================================================
// 🟢 CONFIGURAÇÃO DE SESSÃO
// ==================================================================
app.use(session({
    store: new FileStore({
        path: './sessions',
        ttl: 86400,
        reapInterval: 3600,
        logFn: function(){} 
    }),
    secret: 'coloque-uma-chave-secreta-forte-aqui-depois', 
    resave: false,           
    saveUninitialized: false, 
    rolling: true,           
    cookie: { 
        secure: false, 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 
    } 
}));

// ==================================================================
// 🚦 ROTAS
// ==================================================================

// NOTA: Removi o app.get("/") pois o express.static já resolve o index.html

// LOGIN
app.use('/login', loginRouter);

// CADASTRO
app.use('/cadastro', cadastroRouter);

// PERFIL
app.use('/meuperfil', privateRoute, perfilRouter);
app.use('/api/perfil', privateRoute, perfilRouter);

// PROTEGIDAS
app.use('/mensalidade', privateRoute, mensalidadeRouter); 
app.use('/arquivados', privateRoute, arquivadosRouter); 
 
// HOME (DASHBOARD)
app.get("/home", privateRoute, async (req, res) => {
    try {
        console.log("--- Carregando Home (Tudo Filtrado) ---");

        // 1. PROFESSORES
        let { data: profData } = await supabase.from('professor').select('ativo');
        let profFinal = 0;
        if (profData) {
            profFinal = profData.filter(p => p.ativo === true || p.ativo === 'true' || p.ativo === 'TRUE').length;
        }

        // 2. ALUNOS
        let { count: alunoCount } = await supabase.from('aluno').select('*', { count: 'exact', head: true });

        // 3. TURMAS
        let { data: turmasData } = await supabase.from('turma').select('ativo');
        let turmaFinal = 0;
        if (turmasData) {
            turmaFinal = turmasData.filter(t => t.ativo === true || t.ativo === 'true' || t.ativo === 'TRUE').length;
        }

        // 4. MATRÍCULAS
        let { data: todasMatriculas } = await supabase.from('matricula').select('ativo');
        let matriculaFinal = 0;
        if (todasMatriculas) {
            matriculaFinal = todasMatriculas.filter(m => m.ativo === true || m.ativo === 'true' || m.ativo === 'TRUE').length;
        }

        res.render("HOME/home", {
            message: "Como podemos te ajudar hoje?",
            daycareName: "Minha Creche",
            professores: profFinal, 
            alunos: alunoCount || 0,
            turmas: turmaFinal,
            turma: turmaFinal,
            matriculas: matriculaFinal,
            matricula: matriculaFinal,
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

// CADASTRO ESPECÍFICO
app.get("/cadastro-aluno", privateRoute, (req, res) => { 
  res.render("ALUNO/cadastro-aluno");
});

app.get("/cadastro-responsavel", privateRoute, (req, res) => { 
  res.render("ALUNO/cadastro1");
});

app.use("/acessar-aluno", privateRoute, alunoAcessarRouter); 

// FINANCEIRO
app.get('/financeiro', privateRoute, (req, res) => { 
  res.render('FINANCEIRO/financeiro');
});
app.use('/api', privateRoute, financeiroRoutes); 

// OUTRAS ROTAS
app.use('/turmas', privateRoute, turmasRouter); 
app.use('/matriculas', privateRoute, matriculasRouter); 
app.use('/professores', privateRoute, professoresRoutes); 

// TERMOS
app.get('/termossete', (req, res) => { 
    try {
        res.render('TERMOS/termossete', { 
            title: 'Termos de Uso - Sete Educacional' 
        });
    } catch (error) {
        res.status(500).send("Erro ao carregar a página.");
    }
});

// TESTE BANCO
app.get('/testar-banco', async (req, res) => {
  try{
        const { error, count } = await supabase
            .from('professor') 
            .select('*', { count: 'exact', head: true });
        if (error) throw error;
        res.status(200).json({ status: 'success', message: 'Deu bom meninas', details: `Count: ${count}` });
  }catch(error){
    res.status(500).json({ status: 'error', message: 'Deu ruim meninas', error: error.message });
  }
});


// ==================================================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR (CORRIGIDO)
// ==================================================================
// Apenas inicia se não for teste (para evitar conflitos no Jest)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

export default app;