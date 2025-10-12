import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// LISTAR TODAS AS TURMAS ATIVAS (GET /turmas)
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from('turma')
        .select(`
            id, nome_turma, ano_letivo, limite_vagas, quantidade_alunos,
            professor ( nome )
        `)
        .eq('ativo', true)
        .order('nome_turma');

    if (error) {
        console.error("Erro ao buscar turmas:", error);
        return res.status(500).send("Erro no servidor.");
    }
    res.render("TURMA/acessar", { turmas: data });
});

// EXIBIR FORMULÁRIO DE CADASTRO (GET /turmas/cadastro)
router.get("/cadastro", async (req, res) => {
    try {
        const [professoresRes, mensalidadesRes] = await Promise.all([
            supabase.from('professor').select('id, nome').eq('ativo', true),
            supabase.from('mensalidade').select('id, faixa_etaria, valor, turno')
        ]);

        if (professoresRes.error || mensalidadesRes.error) {
            throw new Error('Erro ao buscar dados para o formulário.');
        }

        res.render("TURMA/cadastro", {
            professores: professoresRes.data,
            mensalidades: mensalidadesRes.data
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// PROCESSAR CADASTRO DE TURMA (POST /turmas/cadastro)
router.post("/cadastro", async (req, res) => {
    const { nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id } = req.body;
    const { error } = await supabase.from('turma').insert([{
        nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id
    }]);

    if (error) {
        console.error("Erro ao cadastrar turma:", error);
        return res.status(500).send("Erro ao cadastrar turma.");
    }
    res.redirect("/turmas");
});

// EXIBIR FORMULÁRIO DE EDIÇÃO (GET /turmas/editar/:id)
router.get("/editar/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [turmaRes, professoresRes, mensalidadesRes] = await Promise.all([
            supabase.from('turma').select('*').eq('id', id).single(),
            supabase.from('professor').select('id, nome').eq('ativo', true),
            supabase.from('mensalidade').select('id, faixa_etaria, valor, turno')
        ]);
        
        if (turmaRes.error || professoresRes.error || mensalidadesRes.error) {
           throw new Error('Erro ao buscar dados para edição.');
        }
        
        res.render("TURMA/editar", {
            turma: turmaRes.data,
            professores: professoresRes.data,
            mensalidades: mensalidadesRes.data
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// PROCESSAR ATUALIZAÇÃO DE TURMA (POST /turmas/editar/:id)
router.post("/editar/:id", async (req, res) => {
    const { id } = req.params;
    const { nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id } = req.body;
    
    const { error } = await supabase.from('turma').update({
        nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id
    }).eq('id', id);

    if (error) {
        console.error('Erro ao atualizar turma:', error);
        return res.status(500).send('Erro ao atualizar a turma.');
    }
    res.redirect('/turmas');
});

// ARQUIVAR TURMA (SOFT DELETE) (POST /turmas/arquivar/:id)
router.post('/arquivar/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('turma').update({ ativo: false }).eq('id', id);

    if (error) {
        console.error('Erro ao arquivar turma:', error);
        return res.status(500).send('Erro ao arquivar a turma.');
    }
    res.redirect('/turmas');
});

export default router;