import express from 'express';
import supabase from '../supabase.js'; // Importa a conexão do banco

const router = express.Router();

// -------------------------------------------------------------------------
// 1. ROTA PARA EXIBIR A PÁGINA
// (Quando o usuário acessa /acessar-aluno)
// -------------------------------------------------------------------------
router.get('/', (req, res) => {
    // Apenas renderiza a página EJS.
    // O script dentro do EJS [cite: 95] fará a chamada para /api/listar
    res.render('CRIANCAS/acessar-aluno'); // Confirme se o caminho do seu EJS está correto
});

// -------------------------------------------------------------------------
// 2. API PARA LISTAR TODAS AS CRIANÇAS
// (Chamada pela função carregarCriancas() no EJS) [cite: 66]
// ROTA COMPLETA: /acessar-aluno/api/listar
// -------------------------------------------------------------------------
router.get('/api/listar', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cadastro_crianca') // Nome EXATO da sua tabela no Supabase
            .select('*')
            .eq('ativo', true) // Filtra apenas crianças ativas
            .order('nome', { ascending: true });

        if (error) throw error;

        // O frontend espera 'dataNasc', 'responsavelPrincipal' [cite: 75-76].
        // O Supabase usa 'data_nasc', 'responsavel_principal'.
        // Este 'map' faz a tradução.
        const criancasMapeadas = data.map(c => ({
            id: c.id,
            nome: c.nome,
            dataNasc: c.data_nasc, // Traduzindo
            dataMatricula: c.data_matricula, // Traduzindo
            responsavelPrincipal: c.responsavel_principal, // Traduzindo
            responsavelSecundario: c.responsavel_secundario,
            telefone: c.telefone,
            endereco: c.endereco,
            status: c.status,
            observacoes: c.observacoes
        }));
        
        res.json(criancasMapeadas);

    } catch (error) {
        console.error("Erro ao listar crianças:", error.message);
        res.status(500).json({ error: 'Erro ao buscar crianças' });
    }
});

// -------------------------------------------------------------------------
// 3. API PARA BUSCAR CRIANÇAS POR NOME
// (Chamada pelo campo de pesquisa no EJS) [cite: 90]
// ROTA COMPLETA: /acessar-aluno/api/buscar?termo=...
// -------------------------------------------------------------------------
router.get('/api/buscar', async (req, res) => {
    const { termo } = req.query;

    if (!termo || termo.length < 2) {
        return res.json([]);
    }

    try {
        const { data, error } = await supabase
            .from('cadastro_crianca')
            .select('*') // Pega tudo para o 'map' funcionar
            .ilike('nome', `%${termo}%`) // 'ilike' não diferencia maiúscula/minúscula
            .eq('ativo', true)
            .limit(20);

        if (error) throw error;
        
        // Mapeia os dados da mesma forma que o /api/listar
        const criancasMapeadas = data.map(c => ({
            id: c.id,
            nome: c.nome,
            dataNasc: c.data_nasc,
            dataMatricula: c.data_matricula,
            responsavelPrincipal: c.responsavel_principal,
            responsavelSecundario: c.responsavel_secundario,
            telefone: c.telefone,
            endereco: c.endereco,
            status: c.status,
            observacoes: c.observacoes
        }));

        res.json(criancasMapeadas);
    
    } catch (error) {
        console.error("Erro ao buscar crianças:", error.message);
        res.status(500).json({ error: 'Erro ao buscar crianças' });
    }
});

// -------------------------------------------------------------------------
// 4. API PARA DETALHES DE UMA CRIANÇA
// (Chamada pela função visualizarCrianca() no EJS) [cite: 70]
// ROTA COMPLETA: /acessar-aluno/api/detalhes/:id
// -------------------------------------------------------------------------
router.get('/api/detalhes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('cadastro_crianca')
            .select('*')
            .eq('id', id)
            .single(); // Espera um único resultado

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Criança não encontrada' });

        // Mapeia para o frontend
        const criancaDetalhe = {
            id: data.id,
            nome: data.nome,
            dataNasc: data.data_nasc,
            dataMatricula: data.data_matricula,
            responsavelPrincipal: data.responsavel_principal,
            responsavelSecundario: data.responsavel_secundario,
            telefone: data.telefone,
            endereco: data.endereco,
            status: data.status,
            observacoes: data.observacoes
        };

        res.json(criancaDetalhe);

    } catch (error) {
        console.error("Erro ao buscar detalhes da criança:", error.message);
        res.status(500).json({ error: 'Erro ao buscar detalhes' });
    }
});

// Rota de arquivar (standby, já que o frontend [cite: 65] não tem o botão)
router.delete('/api/arquivar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('cadastro_crianca')
            .update({ status: 'inativo', ativo: false })
            .eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Criança arquivada com sucesso.' });
    } catch (error) {
        console.error("Erro ao arquivar criança:", error.message);
        res.status(500).json({ error: 'Erro ao arquivar' });
    }
});

export default router;
