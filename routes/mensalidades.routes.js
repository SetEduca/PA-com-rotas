import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// 1. ROTA GET: EXIBIR A PÁGINA E LISTAR AS MENSALIDADES
// Esta rota busca todos os planos de mensalidade no banco e os envia para a página.
router.get('/', async (req, res) => {
    const { data: mensalidades, error } = await supabase
        .from('mensalidade')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Erro ao buscar mensalidades:", error);
        return res.status(500).send("Erro no servidor.");
    }

    // Renderiza a página EJS e passa a lista de mensalidades para ela
    res.render('PERFIL/mensalidade', { mensalidades: mensalidades || [] });
});

// 2. ROTA POST: CADASTRAR UMA NOVA MENSALIDADE
// Esta rota recebe os dados do formulário e salva no banco.
router.post('/', async (req, res) => {
    // Atenção aos nomes aqui, eles devem corresponder aos 'name' dos inputs no formulário
    const { faixa_etaria, turno, valor } = req.body;

    // Validação simples no backend
    if (!faixa_etaria || !turno || !valor || valor <= 0) {
        return res.status(400).send("Dados inválidos. Verifique os campos.");
    }

    const { error } = await supabase
        .from('mensalidade')
        .insert({ 
            faixa_etaria: faixa_etaria, 
            turno: turno, 
            valor: valor 
        });

    if (error) {
        console.error("Erro ao cadastrar mensalidade:", error);
        return res.status(500).send("Erro ao cadastrar mensalidade.");
    }

    // Redireciona de volta para a página de mensalidades, que irá recarregar com o novo item.
    res.redirect('/mensalidade');
});

// 3. ROTA POST PARA REMOVER: (Vamos usar POST para exclusão por segurança)
router.post('/remover/:id', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('mensalidade')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Erro ao remover mensalidade:", error);
        return res.status(500).send("Erro ao remover mensalidade.");
    }

    res.redirect('/mensalidade');
});

export default router;