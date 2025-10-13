//EM DESENVLVIMENTO, FAVOR NÂO USAR E NEM MEXER AINDA




import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// 1. EXIBIR A PÁGINA DE MATRÍCULA
router.get('/', async (req, res) => {
    // 1. Buscamos TODAS as turmas que estão ativas, sem filtrar por vagas ainda.
    const { data: todasAsTurmas, error } = await supabase
        .from('turma')
        .select('id, nome_turma, limite_vagas, quantidade_alunos')
        .eq('ativo', true);

    if (error) {
        console.error("Erro ao buscar turmas para matrícula:", error);
        return res.status(500).send("Erro no servidor.");
    }

    // 2. Agora, usamos o filter do JavaScript para criar uma NOVA lista
    //    apenas com as turmas que têm vagas disponíveis.
    const turmasComVagas = todasAsTurmas.filter(turma => {
        return turma.quantidade_alunos < turma.limite_vagas;
    });

    // 3. Enviamos a lista já filtrada para a página renderizar.
    res.render('MATRICULA/matricula', { turmas: turmasComVagas });
});
// 2. API PARA BUSCAR ALUNOS POR NOME (USANDO FETCH NO FRONTEND)
// Esta rota retorna um JSON com os alunos que correspondem à busca.
router.get('/api/buscar-aluno', async (req, res) => {
    const { nome } = req.query;

    if (!nome || nome.length < 3) {
        return res.json([]); // Retorna vazio se a busca for muito curta
    }

    const { data, error } = await supabase
        .from('cadastro_crianca')
        .select('id, nome, cpf')
        .ilike('nome', `%${nome}%`) // Busca case-insensitive
        .eq('ativo', true)
        .limit(10);

    if (error) {
        console.error("Erro na API de busca de aluno:", error);
        return res.status(500).json({ error: 'Erro ao buscar alunos' });
    }

    res.json(data);
});

// DENTRO DE routes/matricula.routes.js

// 3. PROCESSAR A NOVA MATRÍCULA
router.post('/', async (req, res) => {
    // Esta parte continua igual, pois 'aluno_id' é o nome que vem do formulário
    const { aluno_id, turma_id, data_matricula } = req.body;
    const ano_letivo = new Date(data_matricula).getFullYear();

    try {
        // Validação 1: O aluno já está matriculado?
        const { data: matriculaExistente } = await supabase
            .from('matricula')
            .select('id')
            .eq('crianca_id', aluno_id) // MUDANÇA 1: Usando o nome de coluna correto 'crianca_id'
            .eq('ativo', true)
            .single();

        if (matriculaExistente) {
            return res.status(400).send('Erro: Este aluno já possui uma matrícula ativa.');
        }

        // Validação 2 (continua igual)
        const { data: turma } = await supabase
            .from('turma')
            .select('limite_vagas, quantidade_alunos')
            .eq('id', turma_id)
            .single();
        
        if (!turma) throw new Error("Turma não encontrada.");

        if (turma.quantidade_alunos >= turma.limite_vagas) {
            return res.status(400).send('Erro: A turma selecionada não possui mais vagas.');
        }

        // Se passou em tudo, realiza a matrícula
        // Ação 1: Inserir na tabela de matrícula
        const { error: insertError } = await supabase
            .from('matricula')
            .insert({ 
                crianca_id: aluno_id, // MUDANÇA 2: Mapeando a variável 'aluno_id' para a coluna 'crianca_id'
                turma_id: turma_id, 
                data_matricula: data_matricula, 
                ano_letivo: ano_letivo, 
                ativo: true 
            });

        if (insertError) throw insertError;
        
        // Ação 2 (continua igual)
        const { error: updateError } = await supabase
            .from('turma')
            .update({ quantidade_alunos: turma.quantidade_alunos + 1 })
            .eq('id', turma_id);

        if (updateError) throw updateError;
        
        res.redirect('/turmas');

    } catch (error) {
        console.error("Erro ao processar matrícula:", error);
        res.status(500).send('Ocorreu um erro interno ao realizar a matrícula.');
    }
});
export default router;