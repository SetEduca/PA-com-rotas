// routes/matricula.routes.js

import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// 1. EXIBIR A PÁGINA DE MATRÍCULA COM TURMAS DISPONÍVEIS
router.get('/', async (req, res) => {
    try {
        // Buscamos todas as turmas ativas
        const { data: todasAsTurmas, error } = await supabase
            .from('turma')
            .select('id, nome_turma, limite_vagas, quantidade_alunos')
            .eq('ativo', true);

        if (error) {
            console.error("Erro ao buscar turmas para matrícula:", error);
            // Renderiza a página com erro, mas permite carregar
            return res.render('MATRICULA/matricula', { turmas: [], error: "Erro ao carregar turmas." });
        }

        // Filtramos no backend apenas as turmas com vagas
        const turmasComVagas = todasAsTurmas.filter(turma => {
            // Garante que ambos são números antes de comparar
            const qtd = parseInt(turma.quantidade_alunos || 0);
            const limite = parseInt(turma.limite_vagas);
            return !isNaN(qtd) && !isNaN(limite) && qtd < limite;
        });

        // Enviamos a lista filtrada para a página renderizar
        res.render('MATRICULA/matricula', { turmas: turmasComVagas, error: null });

    } catch (err) {
        console.error("Erro geral ao carregar página de matrícula:", err);
        res.status(500).render('MATRICULA/matricula', { turmas: [], error: "Erro interno no servidor ao carregar a página." });
    }
});

// 2. API PARA BUSCAR ALUNOS POR NOME (USANDO FETCH NO FRONTEND)
// Retorna JSON com alunos E O SEU RESPONSÁVEL.
router.get('/api/buscar-aluno', async (req, res) => {
    const { nome } = req.query; // Pega o parâmetro 'nome' da URL (?nome=...)

    // Validação básica: não busca se o nome for muito curto
    if (!nome || nome.length < 3) {
        return res.json([]); // Retorna um array vazio
    }

    try {
        // Consulta no Supabase: busca 'cadastro_crianca' e usa a relação (baseada na FK responsavel_id)
        // para buscar 'nome' e 'cpf' da tabela 'responsavel'.
        const { data, error } = await supabase
            .from('cadastro_crianca') // Tabela principal
            .select(`
                id,
                nome,
                cpf,
                responsavel ( nome, cpf ) 
            `) // Pede nome e cpf da tabela 'responsavel' relacionada via FK 'responsavel_id'
            .ilike('nome', `%${nome}%`) // Busca 'nome' da criança (case-insensitive)
            .eq('ativo', true)        // Apenas crianças ativas
            .limit(10);               // Limita a 10 resultados

        // Tratamento de Erro da Consulta
        if (error) {
            console.error("Erro na API de busca de aluno (com responsável):", error);
            // Verifica erro comum de relação não configurada corretamente
            if (error.code === 'PGRST200' && error.message.includes('relationship')) {
                 console.error("--- VERIFIQUE A RELAÇÃO DE CHAVE ESTRANGEIRA ---");
                 console.error("Certifique-se que 'responsavel_id' em 'cadastro_crianca' está corretamente ligada a 'id' em 'responsavel' no Supabase."); //
                 return res.status(500).json({ error: 'Erro de configuração: Relação criança-responsável não encontrada ou inválida.' });
            }
             // Verifica erro de coluna inexistente (caso tenha mudado algo)
             if (error.code === '42703') {
                 console.error(`--- NOME DE COLUNA INCORRETO ---`);
                 console.error(`Verifique se as colunas especificadas (id, nome, cpf, responsavel(nome, cpf)) existem nas tabelas. Erro: ${error.message}`); //
                 return res.status(500).json({ error: `Erro de configuração: Coluna inválida na consulta.` });
             }
            // Outro erro de banco
            return res.status(500).json({ error: 'Erro ao buscar alunos no banco de dados.' });
        }

        // Se a consulta foi bem-sucedida, retorna os dados em formato JSON
        res.json(data || []); // Retorna os dados ou um array vazio

    } catch (err) { // Captura erros inesperados no processamento
         console.error("Erro inesperado na API /api/buscar-aluno:", err);
         res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// 3. PROCESSAR A NOVA MATRÍCULA (quando o formulário é enviado)
router.post('/', async (req, res) => {
    // Pega os dados enviados pelo formulário no corpo da requisição
    const { aluno_id, turma_id, data_matricula } = req.body;
    // Pega o ano da data de matrícula fornecida
    const ano_letivo = new Date(data_matricula).getFullYear();

    // Validação inicial dos dados recebidos
    if (!aluno_id || !turma_id || !data_matricula) {
        // Tenta buscar turmas novamente para re-renderizar com erro
        try {
             const { data: turmasComVagas } = await supabase.from('turma').select('id, nome_turma, limite_vagas, quantidade_alunos').eq('ativo', true).lt('quantidade_alunos', supabase.sql('limite_vagas'));
             return res.status(400).render('MATRICULA/matricula', { turmas: turmasComVagas || [], error: "Dados incompletos para realizar a matrícula." });
        } catch(loadError) {
             return res.status(400).send("Dados incompletos para realizar a matrícula."); // Fallback
        }
    }


    try {
        // --- Validações no Banco de Dados ---

        // Validação 1: O aluno já tem matrícula ativa neste ano letivo?
        const { data: matriculaExistente, error: checkMatriculaError } = await supabase
            .from('matricula')
            .select('id')
            .eq('crianca_id', aluno_id) // Coluna correta: crianca_id
            .eq('ano_letivo', ano_letivo) // Verifica no ano letivo atual
            .eq('ativo', true)
            .maybeSingle(); // Retorna null se não encontrar

        if (checkMatriculaError) throw checkMatriculaError;
        if (matriculaExistente) {
            // Re-renderiza a página de matrícula mostrando o erro
            const { data: turmasComVagas } = await supabase.from('turma').select('id, nome_turma, limite_vagas, quantidade_alunos').eq('ativo', true).lt('quantidade_alunos', supabase.sql('limite_vagas'));
            return res.status(400).render('MATRICULA/matricula', { turmas: turmasComVagas || [], error: 'Erro: Este aluno já possui uma matrícula ativa neste ano letivo.' });
        }

        // Validação 2: A turma existe e tem vagas?
        const { data: turma, error: checkTurmaError } = await supabase
            .from('turma')
            .select('limite_vagas, quantidade_alunos')
            .eq('id', turma_id)
            .single(); // Espera encontrar exatamente uma turma

        if (checkTurmaError) throw checkTurmaError; // Erro na busca da turma
        if (!turma) throw new Error("Turma selecionada não foi encontrada."); // Turma ID inválido?

        // Garante que são números antes de comparar
        const qtd = parseInt(turma.quantidade_alunos || 0);
        const limite = parseInt(turma.limite_vagas);
        if (isNaN(qtd) || isNaN(limite) || qtd >= limite) {
             const { data: turmasComVagas } = await supabase.from('turma').select('id, nome_turma, limite_vagas, quantidade_alunos').eq('ativo', true).lt('quantidade_alunos', supabase.sql('limite_vagas'));
             return res.status(400).render('MATRICULA/matricula', { turmas: turmasComVagas || [], error: 'Erro: A turma selecionada não possui mais vagas disponíveis.' });
        }

        // --- Se passou nas validações, realiza as operações ---

        // Ação 1: Inserir o novo registro na tabela 'matricula'
        const { error: insertError } = await supabase
            .from('matricula')
            .insert({
                crianca_id: aluno_id,    // Coluna correta no banco
                turma_id: turma_id,
                data_matricula: data_matricula,
                ano_letivo: ano_letivo,
                ativo: true             // Define a matrícula como ativa
            });

        // Se deu erro ao inserir a matrícula
        if (insertError) throw insertError;

        // Ação 2: Atualizar a contagem de alunos na tabela 'turma'
        const novaQuantidade = qtd + 1;
        const { error: updateError } = await supabase
            .from('turma')
            .update({ quantidade_alunos: novaQuantidade })
            .eq('id', turma_id);

        // Se deu erro ao atualizar a turma (importante logar, pode precisar de ajuste manual)
        if (updateError) {
             console.error(`!!! ATENÇÃO: Matrícula ${aluno_id} inserida, mas falha ao atualizar contagem da turma ${turma_id}. Erro:`, updateError);
             // Considerar reverter a matrícula aqui ou apenas logar/notificar
             throw updateError; // Lança o erro para o catch geral
        }

        // Sucesso! Redireciona para a lista de turmas (ou outra página de sucesso)
        console.log(`Matrícula para aluno ${aluno_id} na turma ${turma_id} realizada com sucesso.`);
        res.redirect('/turmas'); // Redireciona para a lista de turmas

    } catch (error) { // Captura qualquer erro ocorrido no bloco 'try'
        console.error("Erro geral ao processar matrícula:", error);
        // Tenta recarregar as turmas para exibir o erro na página de matrícula
        try {
            const { data: turmasComVagas } = await supabase.from('turma').select('id, nome_turma, limite_vagas, quantidade_alunos').eq('ativo', true).lt('quantidade_alunos', supabase.sql('limite_vagas'));
            res.status(500).render('MATRICULA/matricula', { turmas: turmasComVagas || [], error: 'Ocorreu um erro interno ao realizar a matrícula. Tente novamente.' });
        } catch (renderError) {
             // Se falhar até em buscar as turmas para mostrar o erro
             res.status(500).send('Ocorreu um erro interno grave ao processar a matrícula.');
        }
    }
});

// Exporta o roteador para ser usado no app.js
export default router;