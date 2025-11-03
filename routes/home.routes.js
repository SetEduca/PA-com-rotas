// Importa os módulos necessários
const express = require('express');
const path = require('path');

// ========= IMPORTAR O CLIENTE SUPABASE =========
// Você precisa importar seu cliente supabase de algum lugar
// Ex: const { supabase } = require('./supabaseClient.js');
// (Vou simular o supabase para o exemplo funcionar)
const supabase = { // SUBSTITUA PELA SUA IMPORTAÇÃO REAL
    from: (table) => ({
        select: async (fields) => {
            console.log(`Simulando Supabase: SELECT ${fields} FROM ${table}`);
            return {
                data: [{ id: 1, name: "Dado de Exemplo" }],
                error: null
            };
        }
    })
};

// Inicializa o aplicativo Express
const app = express();
const PORT = 3003;

// ========= CONFIGURAR TEMPLATE ENGINE (EJS) =========
// Necessário porque a nova rota /home usa res.render('home', ...)
// 1. Instale: npm install ejs
// 2. Crie uma pasta 'views' e um arquivo 'home.ejs' dentro dela.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servir arquivos estáticos (CSS, JS) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a API que fornece os dados do dashboard (Do seu server.js original)
app.get('/api/dashboard-data', (req, res) => {
    // Em uma aplicação real, você buscaria esses dados de um banco de dados.
    const data = {
        professores: 10,
        alunos: 10,
        turmas: 10
    };
    res.json(data); // Retorna os dados como JSON
});

// --- Rota Principal (Lógica do home.routes.js) ---
// Substitui a rota app.get('/') que servia o home.html
app.get('/', (req, res) => {
    res.redirect('/home');
});

// --- Rota /home (Lógica do home.routes.js) ---
app.get('/home', async (req, res) => {
    try {
        
        //     AQUI IRIA A SUA LÓGICA DO SUPABASE
        const { data: dadosDaTabela, error } = await supabase
            .from('sua_tabela_aqui')
            .select('*');

        if (error) throw error;
      

        // Renderiza o template 'home.ejs' da pasta 'views'
        res.render('home', {
            // Passe os dados que sua view precisa
            // ex: dadosDoSupabase: dadosDaTabela,
            message: "Bem-vindo à página Home!"
        });

    } catch (error) {
        console.error('Erro ao carregar a rota /home:', error.message);
        res.status(500).send('Erro interno do servidor');
    }
});


// Inicia o servidor e o faz escutar na porta definida (Do seu server.js original)
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
