// Importa os módulos necessários
const express = require('express');
const path = require('path');

// Inicializa o aplicativo Express
const app = express();
const PORT = 3003;

// Rota para a API que fornece os dados do dashboard
app.get('/api/dashboard-data', (req, res) => {
    // Em uma aplicação real, você buscaria esses dados de um banco de dados.
    // Aqui, estamos apenas simulando os dados.
    const data = {
        professores: 10,
        alunos: 10,
        turmas: 10
    };
    res.json(data); // Retorna os dados como JSON
});

// Rota principal que serve o arquivo HTML do frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

// Inicia o servidor e o faz escutar na porta definida
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
