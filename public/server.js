const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();


app.use(bodyParser.urlencoded({extended: true}));
app.use(express.urlencoded({extended: true}));
//app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'cimatec',
    database: 'cadastrar2'
});

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/cadastro.html')
});

app.post('/cadastrar', (req, res) => {
    const {professor, turma, turno, quantidade_alunos, faixa_etaria} = req.body;

    const sql = "INSERT INTO turma (professor, turma, turno, quantidade_alunos, faixa_etaria) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [professor, turma, turno, quantidade_alunos, faixa_etaria], (err, result) => {
        if (err) throw err;
        res.send("Turma cadastrada com sucesso!");
    });
});

app.listen(3010, () => {
    console.log("Servidor rodando em http://localhost:3010")
