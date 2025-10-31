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
        res.render("PROFESSOR/cadastrop");
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA PROCESSAR O CADASTRO DO NOVO PROFESSOR ---
// --- ROTA PARA PROCESSAR O CADASTRO DO NOVO PROFESSOR ---
router.post("/cadastro", async (req, res) => {
    // 1. Pega os dados do formulário
    const { professor, cpf, Telefone, Email, Endereço, classificação } = req.body;
    
    // 1b. Processa o telefone para dividir em DDD e Numero
    const telLimpo = String(Telefone).replace(/\D/g, ''); 
    const ddd = telLimpo.substring(0, 2);      // Pega os 2 primeiros dígitos
    const numero = telLimpo.substring(2);     // Pega o resto

    let newProfessorId;

    try {
        // 2. Insere na tabela 'PROFESSOR'
        const { data: newProfessor, error: professorError } = await supabase
            .from('professor')
            .insert([{
                nome: professor, 
                cpf, 
                email: Email, 
                classificacao: classificação // <-- Corrigido (deve ser 'classificação' com 'ç')
            }])
            .select('id') 
            .single();   

        if (professorError) {
            throw new Error(`Erro ao cadastrar professor: ${professorError.message}`);
        }

        newProfessorId = newProfessor.id;

        // 3. Usa o ID para inserir nas tabelas 'TEL_PROFESSOR' e 'END_PROFESSOR'
        const [telefoneResult, enderecoResult] = await Promise.all([
            supabase.from('tel_professor').insert({
                professor_id: newProfessorId,
                ddd: ddd,
                numero: numero
            }),
            supabase.from('end_professor').insert({
                professor_id: newProfessorId,
                end_descricao: Endereço
            })
        ]);

        // 4. Verifica se houve erro ao salvar telefone ou endereço
        if (telefoneResult.error || enderecoResult.error) {
            console.error("Erro Supabase (Telefone):", telefoneResult.error);
            console.error("Erro Supabase (Endereço):", enderecoResult.error);

            // Reverte o cadastro
            await supabase.from('professor').delete().eq('id', newProfessorId); 
            
            const erroMsg = telefoneResult.error?.message || enderecoResult.error?.message;
            throw new Error(`Erro do Supabase ao salvar contato: ${erroMsg}. Cadastro revertido.`);
        }
        
        // 5. Se tudo deu certo, redireciona
        res.redirect("/professores"); 

    } catch (err) {
        // Captura qualquer erro
        console.error("Falha no cadastro do professor:", err);
        return res.status(500).send(err.message);
    }
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