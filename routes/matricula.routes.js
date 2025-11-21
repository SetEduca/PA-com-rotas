// routes/matricula.routes.js

import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// --- FUNÇÃO AUXILIAR PARA BUSCAR E FILTRAR TURMAS COM VAGAS (CORREÇÃO) ---
async function fetchTurmasComVagas() {
    const { data: todasAsTurmas, error } = await supabase
        .from('turma')
        .select('id, nome_turma, limite_vagas, quantidade_alunos')
        .eq('ativo', true); // Apenas turmas ativas

    if (error) {
        console.error("Erro ao buscar turmas para re-renderização:", error);
        return [];
    }

    // Filtra em JavaScript (Node.js) as turmas que têm vagas disponíveis
    return todasAsTurmas.filter(t => {
        const qtd = parseInt(t.quantidade_alunos || 0);
        const limite = parseInt(t.limite_vagas);
        // Retorna TRUE se a quantidade de alunos for MENOR que o limite de vagas
        return !isNaN(qtd) && !isNaN(limite) && qtd < limite;
    });
}
// -----------------------------------------------------------------

// 1. EXIBIR A PÁGINA DE MATRÍCULA COM TURMAS DISPONÍVEIS
router.get('/', async (req, res) => {
    // Pega mensagens de sucesso ou erro da URL (query string)
    const { sucesso, erro: erroQuery } = req.query;
    let successMsg = null;
    let errorMsg = erroQuery ? erroQuery : null; // Pega erro da query se existir
    
    // Variável para erro específico da Rematrícula (ajuste para receber do POST)
    let rematriculaError = null; 

    if (sucesso === 'rematricula') {
        successMsg = "Rematrícula (mudança de turma) realizada com sucesso!";
    }

    // Verifica se há erro de rematrícula vindo de um redirect do POST /rematricular
    if (req.session && req.session.rematricula_error) {
        rematriculaError = req.session.rematricula_error;
        // Limpa a sessão após usar (Importante!)
        delete req.session.rematricula_error; 
    }
    
    try {
        // Buscamos todas as turmas ativas
        const { data: todasAsTurmas, error } = await supabase
            .from('turma')
            .select('id, nome_turma, limite_vagas, quantidade_alunos')
            .eq('ativo', true);

        if (error) {
            console.error("Erro ao buscar turmas para matrícula:", error);
            // Renderiza a página com erro, mas permite carregar
            return res.render('MATRICULA/matricula', { 
                turmas: [], 
                error: "Erro ao carregar turmas.",
                success: null,
                rematricula_error: null // Usa null se não houver
            });
        }

        // Filtramos no backend apenas as turmas com vagas
        const turmasComVagas = todasAsTurmas.filter(turma => {
            const qtd = parseInt(turma.quantidade_alunos || 0);
            const limite = parseInt(turma.limite_vagas);
            return !isNaN(qtd) && !isNaN(limite) && qtd < limite;
        });

        // Enviamos a lista filtrada e as mensagens para a página renderizar
        res.render('MATRICULA/matricula', { 
            turmas: turmasComVagas, 
            error: errorMsg, // Passa o erro da query (se houver)
            success: successMsg, // Passa a msg de sucesso (se houver)
            rematricula_error: rematriculaError // Passa erro específico da rematrícula
        });

    } catch (err) {
        console.error("Erro geral ao carregar página de matrícula:", err);
        res.status(500).render('MATRICULA/matricula', { 
            turmas: [], 
            error: "Erro interno no servidor ao carregar a página.",
            success: null,
            rematricula_error: null
        });
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
        // NOTA: A tabela MATRICULA tem uma constraint UNIQUE (crianca_id, turma_id). 
        // Se quisermos garantir apenas UMA matrícula por ano, precisamos da coluna 'ano_letivo' no UNIQUE.
        // A lógica abaixo verifica se já existe UMA matrícula ATIVA (se ativo for mantido).
        const { data: matriculaExistente, error: checkMatriculaError } = await supabase
            .from('matricula')
            .select('id')
            .eq('crianca_id', aluno_id) // Coluna correta: crianca_id
            .eq('ano_letivo', ano_letivo) // Verifica no ano letivo atual
            .eq('ativo', true) // Considerando que você pode manter esta coluna e ela será TRUE
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
        res.redirect('/matriculas'); // Redireciona para a lista de turmas

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

// --- ROTA API PARA BUSCAR ALUNOS JÁ MATRICULADOS (PARA REMATRÍCULA) ---
// Retorna JSON com alunos que têm matrícula ativa e seus dados de turma.
router.get('/api/buscar-matriculados', async (req, res) => {
    const { nome } = req.query; // Pega o parâmetro 'nome' da URL

    if (!nome || nome.length < 3) {
        return res.json([]);
    }

    try {
        // Esta consulta é mais complexa:
        // 1. Começa em 'matricula'
        // 2. Filtra por 'ativo: true'
        // 3. Pega dados da 'cadastro_crianca' (aluno) e filtra pelo nome
        // 4. Pega dados da 'turma' atual
        const { data, error } = await supabase
            .from('matricula')
            .select(`
                id, 
                turma_id,
                crianca_id,
                turma (id, nome_turma ),
                cadastro_crianca ( id, nome, cpf )
            `)
            .eq('ativo', true) // Apenas matrículas ativas
            .ilike('cadastro_crianca.nome', `%${nome}%`); // Filtra pelo nome da criança

        if (error) {
            console.error("Erro na API de busca de matriculados:", error);
            return res.status(500).json({ error: 'Erro ao buscar alunos matriculados.' });
        }

        // --- CORREÇÃO APLICADA AQUI PARA TRATAR O NULL/ORPHAN-RECORD (Linha 290 do erro) ---
        // Formata os dados para facilitar o uso no frontend
        const alunosFormatados = data.map(matricula => ({
            matricula_id: matricula.id,
            
            // USAR Optional Chaining (?.): Se a relação aninhada for NULL, retorna NULL/default
            crianca_id: matricula.cadastro_crianca?.id ?? null,
            nome_crianca: matricula.cadastro_crianca?.nome ?? 'Aluno Deletado/Não Encontrado',
            cpf_crianca: matricula.cadastro_crianca?.cpf ?? 'N/A',
            
            turma_atual_id: matricula.turma?.id ?? null,
            turma_atual_nome: matricula.turma?.nome_turma ?? 'Turma Deletada/Não Encontrada'
        }));
        // -------------------------------------------------------------------------------------

        res.json(alunosFormatados || []);

    } catch (err) {
         // Corrigido para usar 'err' no console.error (erro anterior era 'error is not defined')
         console.error("Erro inesperado na API /api/buscar-matriculados:", err);
         res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});


// --- ROTA POST PARA PROCESSAR A REMATRÍCULA (MUDANÇA DE TURMA) ---
router.post('/rematricular', async (req, res) => {
    // Pega os dados do formulário de rematrícula
    const { matricula_id, nova_turma_id } = req.body;
    let turmaAntigaId = null;

    if (!matricula_id || !nova_turma_id) {
        // Usa a sessão para passar o erro, pois é um POST que redireciona para um GET
        if (req.session) {
            req.session.rematricula_error = "Dados incompletos (ID da Matrícula e Nova Turma são obrigatórios).";
        }
        return res.redirect('/matriculas');
    }

    try {
        // --- Validação 1: Buscar a matrícula e a turma antiga ---
        const { data: matriculaAtual, error: findError } = await supabase
            .from('matricula')
            .select('id, turma_id')
            .eq('id', matricula_id)
            .eq('ativo', true)
            .single();

        if (findError || !matriculaAtual) {
            throw new Error("Matrícula ativa não encontrada.");
        }
        turmaAntigaId = matriculaAtual.turma_id;

        // Não deixa mudar para a mesma turma
        if (turmaAntigaId.toString() === nova_turma_id.toString()) {
            throw new Error("A nova turma não pode ser a mesma que a turma atual.");
        }

        // --- Validação 2: Verificar vagas na NOVA turma ---
        const { data: novaTurma, error: checkTurmaError } = await supabase
            .from('turma')
            .select('limite_vagas, quantidade_alunos')
            .eq('id', nova_turma_id)
            .single();

        if (checkTurmaError) throw checkTurmaError;
        if (!novaTurma) throw new Error("Nova turma não encontrada.");

        const qtdNova = parseInt(novaTurma.quantidade_alunos || 0);
        const limiteNova = parseInt(novaTurma.limite_vagas);
        if (qtdNova >= limiteNova) {
            throw new Error("A nova turma selecionada não possui vagas disponíveis.");
        }

        // --- Operações (em transação via RPC) ---
        // A RPC mudar_turma_aluno agora COPIA para o histórico e ATUALIZA a matrícula.

        const { error: rpcError } = await supabase.rpc('mudar_turma_aluno', {
            p_matricula_id: matricula_id,
            p_nova_turma_id: nova_turma_id,
            p_turma_antiga_id: turmaAntigaId
        });
        
        if (rpcError) {
             console.error("Erro ao executar RPC 'mudar_turma_aluno':", rpcError);
             throw new Error(`Erro ao processar mudança de turma: ${rpcError.message}`);
        }

        // Sucesso! Redireciona de volta para a página de matrícula com msg de sucesso
        res.redirect('/matriculas?sucesso=rematricula');

    } catch (error) {
        console.error("Erro geral ao processar rematrícula:", error.message);
        
        // Armazena o erro na sessão e redireciona para o GET /matriculas
        if (req.session) {
            req.session.rematricula_error = error.message;
        }
        return res.redirect('/matriculas'); // O GET /matriculas irá carregar o erro da sessão
    }
});

// --- ROTA GET PARA VER O HISTÓRICO DE MATRÍCULAS ---
// *** ATUALIZADA para buscar na nova tabela HISTORICO_MATRICULA ***
router.get('/historico', async (req, res) => {
    try {
        // A CHAVE: Buscar na nova tabela HISTORICO_MATRICULA
        const { data: historico, error } = await supabase
            .from('historico_matricula') 
            .select(`
                id,
                data_matricula,
                ano_letivo,
                data_arquivamento,
                cadastro_crianca ( nome ),
                turma ( nome_turma )
            `)
            // Ordenar pela data que a mudança ocorreu (data_arquivamento)
            .order('data_arquivamento', { ascending: false }); 

        if (error) {
            console.error("Erro ao buscar histórico de matrículas:", error);
            throw error;
        }
        
        // Formata os dados para facilitar a exibição no EJS
        const dadosFormatados = historico.map(m => ({
            id: m.id,
            data: m.data_matricula ? new Date(m.data_matricula).toLocaleDateString('pt-BR') : 'Sem data',
            ano: m.ano_letivo,
            // Adicionado Optional Chaining aqui também, por segurança
            alunoNome: m.cadastro_crianca?.nome ?? 'Aluno não encontrado',
            turmaNome: m.turma?.nome_turma ?? 'Turma (Antiga) não encontrada',
            dataArquivamento: m.data_arquivamento ? new Date(m.data_arquivamento).toLocaleDateString('pt-BR') : 'N/A'
        }));

        // Renderiza a nova página de histórico
        res.render('MATRICULA/historico', { 
            historico: dadosFormatados 
        });

    } catch (err) {
        console.error("Erro geral ao carregar histórico:", err.message);
        res.status(500).send("Erro ao carregar o histórico de matrículas.");
    }
});

// Exporta o roteador para ser usado no app.js
export default router;