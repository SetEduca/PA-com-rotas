import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// --- ROTA PARA LISTAR TODOS OS PROFESSORES ATIVOS ---
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from('PROFESSOR') // <-- Nome da tabela corrigido
        .select(` 
            id, 
            nome, 
            cpf, 
            email, 
            classificacao,
            TEL_PROFESSOR ( ddd, numero ), 
            END_PROFESSOR ( end_descricao )
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
    res.render("PROFESSOR/acessar", { professores: data });
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
            .from('PROFESSOR')
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
            supabase.from('TEL_PROFESSOR').insert({
                professor_id: newProfessorId,
                ddd: ddd,
                numero: numero
            }),
            supabase.from('END_PROFESSOR').insert({
                professor_id: newProfessorId,
                end_descricao: Endereço
            })
        ]);

        // 4. Verifica se houve erro ao salvar telefone ou endereço
        if (telefoneResult.error || enderecoResult.error) {
            console.error("Erro Supabase (Telefone):", telefoneResult.error);
            console.error("Erro Supabase (Endereço):", enderecoResult.error);

            // Reverte o cadastro
            await supabase.from('PROFESSOR').delete().eq('id', newProfessorId); 
            
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

export default router;