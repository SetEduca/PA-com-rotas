import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// --- ROTA PARA LISTAR TODOS OS PROFESSORES ATIVOS ---
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from('professor')
        .select(`
            id, 
            nome, 
            cpf, 
            email, 
            classificacao,
            tel_professor ( ddd, numero ), 
            end_professor ( end_descricao )
        `)
        .eq('ativo', true)
        .order('nome');

    if (error) {
        console.error("Erro ao buscar professores:", error);
        return res.status(500).send("Erro no servidor.");
    }
    
    res.render("PROFESSOR/acessop", { professores: data });
});

// --- ROTA PARA EXIBIR O FORMULÁRIO DE CADASTRO ---
router.get("/cadastro", async (req, res) => {
    try {
        // Renderiza a página sem mensagem inicial
        res.render("PROFESSOR/cadastrop");
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA PROCESSAR O CADASTRO DO NOVO PROFESSOR (CORRIGIDA) ---
router.post("/cadastro", async (req, res) => {
    // 1. Pega os dados do formulário
    const { professor, cpf, Telefone, Email, Endereço, classificação } = req.body;

    // Objeto para preencher o formulário em caso de erro (para evitar perda de dados)
    const dadosParaPreenchimento = {
        nome: professor, 
        cpf: cpf, 
        telefone: Telefone, 
        email: Email, 
        endereço: Endereço, 
        classificacao: classificação 
    };

    // 1b. Processa o telefone para dividir em DDD e Numero
    const telLimpo = String(Telefone).replace(/\D/g, ''); 
    const ddd = telLimpo.substring(0, 2);      
    const numero = telLimpo.substring(2);     
    
    let newProfessorId;

    try {
        // 2. Insere na tabela 'PROFESSOR'
        const { data: newProfessor, error: professorError } = await supabase
            .from('professor')
            .insert([{
                nome: professor, 
                cpf, 
                email: Email, 
                classificacao: classificação
            }])
            .select('id') 
            .single();    

        if (professorError) {
            // AQUI, o erro de chave duplicada (23505) será lançado
            throw professorError;
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
            
            // Reverte o cadastro do professor (Rollback)
            await supabase.from('professor').delete().eq('id', newProfessorId); 
            
            const erroMsg = telefoneResult.error?.message || enderecoResult.error?.message;
            throw new Error(`Erro do Supabase ao salvar contato: ${erroMsg}. Cadastro revertido.`);
        }
        
        // 5. Se tudo deu certo, redireciona
        // O ideal seria renderizar com mensagem de sucesso:
        // res.render('PROFESSOR/cadastrop', { mensagem: 'Professor cadastrado com sucesso!', tipo: 'alerta-sucesso' });
        res.redirect("/professores"); 

    } catch (err) {
        // ✅ NOVO BLOCO: TRATAMENTO DE ERRO DE DUPLICAÇÃO
        
        // Captura o erro
        if (err.code === '23505') { 
            // 💡 23505 é o código do PostgreSQL para violação de UNIQUE CONSTRAINT (chave duplicada)
            return res.render('PROFESSOR/cadastrop', {
                mensagem: 'Erro: O e-mail (ou CPF) informado já está cadastrado. Por favor, utilize um valor único.',
                dadosAnteriores: dadosParaPreenchimento // Mantém o formulário preenchido
            });
        }
        
        // Captura qualquer outro erro que não seja de duplicação
        console.error("Falha no cadastro do professor (Outro Erro):", err);
        return res.render('PROFESSOR/cadastrop', { 
            mensagem: `Erro inesperado: ${err.message}. Tente novamente mais tarde.`,
            dadosAnteriores: dadosParaPreenchimento 
        });
    }
});


// --- ROTA PARA EXIBIR O FORMULÁRIO DE EDIÇÃO (GET) ---
router.get("/editar/:id", async (req, res) => {
    const { id } = req.params;
    try {
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

        res.render("PROFESSOR/editarp", { professor: professor });
    } catch (err) {
        console.error("Erro ao buscar professor para editar:", err.message);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA SALVAR AS ALTERAÇÕES DA EDIÇÃO (POST) ---
router.post("/editar/:id", async (req, res) => {
    const { id } = req.params;
    const { professor, cpf, Telefone, Email, Endereço, classificação } = req.body;

    const telLimpo = String(Telefone).replace(/\D/g, ''); 
    const ddd = telLimpo.substring(0, 2);
    const numero = telLimpo.substring(2);

    try {
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

        const [telResult, endResult] = await Promise.all([
            supabase.from('tel_professor')
                .update({ ddd: ddd, numero: numero })
                .eq('professor_id', id), 
            
            supabase.from('end_professor')
                .update({ end_descricao: Endereço })
                .eq('professor_id', id) 
        ]);

        if (telResult.error) throw new Error(`Erro ao atualizar telefone: ${telResult.error.message}`);
        if (endResult.error) throw new Error(`Erro ao atualizar endereço: ${endResult.error.message}`);

        res.redirect("/professores");

    } catch (err) {
        console.error("Falha ao salvar alterações:", err);
        return res.status(500).send(err.message);
    }
});


// --- OUTRAS ROTAS (VER E ARQUIVAR) ---

router.post("/arquivar/:id", async (req, res) => {
    const { id } = req.params; 
    try {
        const { error } = await supabase
            .from('professor')
            .update({ ativo: false })
            .eq('id', id);

        if (error) throw error;
        res.redirect("/professores");
    } catch (err) {
        console.error("Erro ao arquivar professor:", err.message);
        res.status(500).send(err.message);
    }
});

router.get("/ver/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const { data: professores, error } = await supabase
            .from('professor')
            .select(`
                id, nome, cpf, email, classificacao, ativo,
                tel_professor ( ddd, numero ), 
                end_professor ( end_descricao )
            `)
            .eq('id', id);

        if (error) throw error;

        const professor = professores?.[0];

        if (!professor) {
            return res.status(404).json({ error: "Professor não encontrado." });
        }

        res.json(professor);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- CORREÇÃO FINAL DE EXPORTAÇÃO ---
export default router;