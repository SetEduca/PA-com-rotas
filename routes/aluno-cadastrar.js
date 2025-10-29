import express from 'express';
import supabase from '../supabase.js'; // Importa a conexão

const router = express.Router();

// -------------------------------------------------------------------------
// 1. ROTA PARA EXIBIR A PÁGINA DE CADASTRO
// (Quando o usuário acessa /cadastro-aluno)
// -------------------------------------------------------------------------
router.get('/', (req, res) => {
    res.render('CRIANCAS/cadastro-aluno'); // Confirme se o caminho do seu EJS está correto
});

// -------------------------------------------------------------------------
// 2. ROTA PARA RECEBER OS DADOS DO FORMULÁRIO (POST)
// (Chamada pelo 'submit' do formulário no EJS) 
// ROTA COMPLETA: /cadastro-aluno
// -------------------------------------------------------------------------
router.post('/', async (req, res) => {
    
    // Os dados chegam do frontend (req.body)
    // graças ao script do seu EJS [cite: 296-299]
    const {
        nome,
        dataNascimento,
        cpf,
        sexo,
        responsavel,
        telefone,
        email,
        cep,
        cidade,
        logradouro,
        numero,
        bairro,
        observacoes
    } = req.body;

    try {
        // Precisamos traduzir de volta para o padrão do Supabase
        // (de 'dataNascimento' para 'data_nasc')
        const { data, error } = await supabase
            .from('cadastro_crianca') // Nome da sua tabela
            .insert([
                {
                    nome: nome,
                    data_nasc: dataNascimento, // Traduzindo
                    cpf: cpf,
                    sexo: sexo,
                    responsavel_principal: responsavel, // Traduzindo
                    telefone: telefone,
                    email: email,
                    cep: cep,
                    cidade: cidade,
                    logradouro: logradouro,
                    numero: numero,
                    bairro: bairro,
                    observacoes: observacoes,
                    status: 'ativo', // Define 'ativo' como padrão
                    ativo: true // Define 'ativo' como padrão
                }
            ])
            .select(); // .select() retorna os dados que acabaram de ser inseridos

        if (error) {
            // Se houver um erro do Supabase (ex: CPF duplicado)
            console.error('Erro do Supabase:', error.message);
            throw error;
        }

        // Sucesso! Retorna os dados cadastrados para o frontend
        res.status(201).json(data[0]);

    } catch (error) {
        console.error("Erro ao cadastrar criança:", error.message);
        res.status(500).json({ error: 'Ocorreu um erro interno ao cadastrar.' });
    }
});

export default router; 