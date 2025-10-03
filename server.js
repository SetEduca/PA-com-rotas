// server.js (trecho)
const criancasRoutes = require('./routes/criancas');
const turmasRoutes = require('./routes/turmas');
const professoresRoutes = require('./routes/professores');
const matriculaRoutes = require('./routes/matricula');

// ... (configurações do express)

app.get('/', (req, res) => res.redirect('/login')); // Página inicial pode ser a lista de crianças

app.use('/criancas', criancasRoutes);
app.use('/turmas', turmasRoutes);
app.use('/professores', professoresRoutes);
app.use('/matricula', matriculaRoutes);