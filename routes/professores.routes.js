import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// --- ROTA PARA LISTAR TODOS OS PROFESSORES ATIVOS ---
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from('professor') // <-- Nome da tabela corrigido
        .select(`
            id, 
            nome, 
            cpf, 
            email, 
            classificacao,
            tel_professor ( ddd, numero ), 
            end_professor ( end_descricao )
        `) // <-- Nomes das tabelas e colunas corrigidos
        .eq('ativo', true) // <-- Assume que a coluna 'ativo' existe
        .order('nome');

    if (error) {
        console.error("Erro ao buscar professores:", error);
        return res.status(500).send("Erro no servidor.");
    }
    
    // O 'data' agora conterá objetos como:
    // { id: 1, ..., TEL_PROFESSOR: [{ddd: '11', numero: '9...'}], END_PROFESSOR: [{end_descricao: 'Rua X'}] }
    // Sua view 'acessar.ejs' precisará ser ajustada para isso.
    res.render("PROFESSOR/acessop", { professores: data });
});

// --- ROTA PARA EXIBIR O FORMULÁRIO DE CADASTRO ---
router.get("/cadastro", async (req, res) => {
    try {
        res.render("PROFESSOR/cadastro");
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA PROCESSAR O CADASTRO DO NOVO PROFESSOR ---
router.post("/cadastro", async (req, res) => {
    [cite_start]// 1. Pega os dados do formulário [cite: 84, 85, 86, 87]
    const { professor, cpf, Telefone, Email, Endereço, classificação } = req.body;
    
    // 1b. Processa o telefone para dividir em DDD e Numero
    const telLimpo = String(Telefone).replace(/\D/g, ''); 
    const ddd = telLimpo.substring(0, 2);      // Pega os 2 primeiros dígitos
    const numero = telLimpo.substring(2);     // Pega o resto

    let newProfessorId;

    try {
        // 2. Insere na tabela 'PROFESSOR'
        const { data: newProfessor, error: professorError } = await supabase
            .from('PROFESSOR') // <-- Nome da tabela corrigido
            .insert([{
                nome: professor, 
                cpf, 
                email: Email, 
                classificacao: classificação // <-- Assume que esta coluna existe
                // 'ativo' deve ter 'true' como valor padrão no DB
            }])
            .select('id') 
            .single();   

        if (professorError) {
            // Se falhar aqui, verifique se 'classificacao' existe no DB
            throw new Error(`Erro ao cadastrar professor: ${professorError.message}`);
        }

        newProfessorId = newProfessor.id;

        // 3. Usa o ID para inserir nas tabelas 'TEL_PROFESSOR' e 'END_PROFESSOR'
        const [telefoneResult, enderecoResult] = await Promise.all([
            supabase.from('TEL_PROFESSOR').insert({ // <-- Nome da tabela corrigido
                professor_id: newProfessorId,
                ddd: ddd,                         // <-- Coluna 'ddd' corrigida
                numero: numero                    // <-- Coluna 'numero' corrigida
            }),
            supabase.from('END_PROFESSOR').insert({ // <-- Nome da tabela corrigido
                professor_id: newProfessorId,
                end_descricao: Endereço           // <-- Coluna 'end_descricao' corrigida
            })
        ]);

        // 4. Verifica se houve erro ao salvar telefone ou endereço
        if (telefoneResult.error || enderecoResult.error) {
            // Log detalhado dos erros
            console.error("Erro Supabase (Telefone):", telefoneResult.error);
            console.error("Erro Supabase (Endereço):", enderecoResult.error);

            // Reverte o cadastro do professor
            await supabase.from('PROFESSOR').delete().eq('id', newProfessorId); // <-- Nome da tabela corrigido
            
            const erroMsg = telefoneResult.error?.message || enderecoResult.error?.message;
            throw new Error(`Erro do Supabase ao salvar contato: ${erroMsg}. Cadastro revertido.`);
        }
        
        // 5. Se tudo deu certo, redireciona
        res.redirect("/professores"); // (Ou para a página de sucesso)

    } catch (err) {
        // Captura qualquer erro
        console.error("Falha no cadastro do professor:", err);
        return res.status(500).send(err.message);
    }
});

// --- ROTA PARA EXIBIR O FORMULÁRIO DE EDIÇÃO ---
router.get("/editar/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { data: professor, error } = await supabase
            .from('PROFESSOR') // <-- Nome da tabela corrigido
            .select(`
                *, 
                TEL_PROFESSOR ( * ), 
                END_PROFESSOR ( * )
            `) // <-- Nomes das tabelas corrigidos
            .eq('id', id)
            .single();

        if (error) {
           throw new Error('Erro ao buscar dados do professor para edição.');
        }
        
        // A view 'editar.ejs' precisará acessar os dados assim:
        // <input value="<%= professor.TEL_PROFESSOR[0]?.ddd %><%= professor.TEL_PROFESSOR[0]?.numero %>">
        // <input value="<%= professor.END_PROFESSOR[0]?.end_descricao %>">
        res.render("PROFESSOR/editar", { professor });

    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA PROCESSAR A ATUALIZAÇÃO DO PROFESSOR ---
router.post("/editar/:id", async (req, res) => {
    const { id } = req.params;
    const { professor, cpf, Telefone, Email, Endereço, classificação } = req.body;

    // Processa o telefone
    const telLimpo = String(Telefone).replace(/\D/g, '');
    const ddd = telLimpo.substring(0, 2);
    const numero = telLimpo.substring(2);
    
    try {
        // 1. Atualiza a tabela 'PROFESSOR'
        const { error: professorError } = await supabase.from('PROFESSOR').update({ // <-- Nome da tabela
            nome: professor, 
            cpf, 
            email: Email, 
            classificacao: classificação
        }).eq('id', id);

        if (professorError) {
            throw new Error(`Erro ao atualizar professor: ${professorError.message}`);
        }

        // 2. Atualiza as tabelas 'TEL_PROFESSOR' e 'END_PROFESSOR'
        const [telefoneResult, enderecoResult] = await Promise.all([
            supabase.from('TEL_PROFESSOR').update({ // <-- Nome da tabela
                ddd: ddd,                         // <-- Coluna 'ddd'
                numero: numero                    // <-- Coluna 'numero'
            }).eq('professor_id', id), 
            
            supabase.from('END_PROFESSOR').update({ // <-- Nome da tabela
                end_descricao: Endereço           // <-- Coluna 'end_descricao'
            }).eq('professor_id', id) 
        ]);

        if (telefoneResult.error || enderecoResult.error) {
            console.warn('Professor atualizado, mas falha ao atualizar contato/endereço:', telefoneResult.error, enderecoResult.error);
        }

        // 3. Redireciona
        res.redirect('/professores');

    } catch (err) {
        console.error('Erro ao atualizar professor:', err);
        return res.status(500).send(err.message);
    }
});

// --- ROTA PARA ARQUIVAR UM PROFESSOR (EXCLUSÃO LÓGICA) ---
router.post('/arquivar/:id', async (req, res) => {
    const { id } = req.params;
    
    // Assume que a coluna 'ativo' (boolean) existe na tabela 'PROFESSOR'
    const { error } = await supabase.from('PROFESSOR').update({ ativo: false }).eq('id', id); // <-- Nome da tabela

    if (error) {
        console.error('Erro ao arquivar professor:', error);
        return res.status(500).send('Erro ao arquivar o professor.');
    }
    
    res.redirect('/professores');
});

// --- ROTA PARA ARQUIVAR (SOFT DELETE) O PROFESSOR ---
router.post("/arquivar/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('professor')
            .update({ ativo: false }) // <-- A MÁGICA ACONTECE AQUI
            .eq('id', id);

        if (error) {
            throw new Error(`Erro ao arquivar professor: ${error.message}`);
        }

        // Redireciona de volta para a lista, que agora não mostrará o arquivado
        res.redirect("/professores");

    } catch (err) {
        console.error(err.message);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA VER DETALHES DE UM PROFESSOR ---
router.get("/ver/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const { data: professor, error } = await supabase
            .from('professor')
            .select(`
                id,
                nome, 
                cpf, 
                email, 
                classificacao,
                ativo,
                tel_professor ( ddd, numero ), 
                end_professor ( end_descricao )
            `)
            .eq('id', id)
            .single(); // .single() pega apenas um resultado como objeto

        if (error) {
            throw new Error(`Erro ao buscar detalhes do professor: ${error.message}`);
        }

        if (!professor) {
            return res.status(404).send("Professor não encontrado.");
        }

        // Renderiza a nova página de detalhes
        res.json(professor);

    } catch (err) {
        console.error(err.message);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA MOSTRAR O FORMULÁRIO DE EDIÇÃO (GET) ---
router.get("/editar/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Busca os dados completos do professor (igual à rota /ver/)
        const { data: professor, error } = await supabase
            .from('professor')
            .select(`
                id, nome, cpf, email, classificacao,
                tel_professor ( id, ddd, numero ), 
                end_professor ( id, end_descricao )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Renderiza a página de edição, passando os dados do professor
        res.render("PROFESSOR/editarp", { professor: professor });

    } catch (err) {
        console.error("Erro ao buscar professor para editar:", err.message);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA SALVAR AS ALTERAÇÕES DA EDIÇÃO (POST) ---
router.post("/editar/:id", async (req, res) => {
    const { id } = req.params;
    // Pega os dados do formulário
    const { professor, cpf, Telefone, Email, Endereço, classificação } = req.body;

    // Processa o telefone
    const telLimpo = String(Telefone).replace(/\D/g, ''); 
    const ddd = telLimpo.substring(0, 2);
    const numero = telLimpo.substring(2);

    try {
        // 1. Atualiza a tabela principal 'professor'
        const { error: professorError } = await supabase
            .from('professor')
            .update({
                nome: professor,
                cpf: cpf,
                email: Email,
                classificacao: classificação
            })
            .eq('id', id);
        
        if (professorError) throw new Error(`Erro ao atualizar professor: ${professorError.message}`);

        // 2. Atualiza as tabelas relacionadas (Telefone e Endereço)
        // (Supõe que o professor só tem 1 telefone e 1 endereço)
        const [telResult, endResult] = await Promise.all([
            supabase.from('tel_professor')
                .update({ ddd: ddd, numero: numero })
                .eq('professor_id', id), // Atualiza onde o ID do professor bate
            
            supabase.from('end_professor')
                .update({ end_descricao: Endereço })
                .eq('professor_id', id) // Atualiza onde o ID do professor bate
        ]);

        if (telResult.error) throw new Error(`Erro ao atualizar telefone: ${telResult.error.message}`);
        if (endResult.error) throw new Error(`Erro ao atualizar endereço: ${endResult.error.message}`);

        // 3. Se tudo deu certo, redireciona para a lista
        res.redirect("/professores");

    } catch (err) {
        console.error("Falha ao salvar alterações:", err);
        return res.status(500).send(err.message);
    }
});

export default router;