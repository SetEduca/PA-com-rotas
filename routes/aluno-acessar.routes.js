import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// -------------------------------------------------------------------------
// 1. ROTA PARA EXIBIR A PÁGINA (LISTAGEM INICIAL)
// -------------------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('CADASTRO_CRIANCA')
            .select(`
                id, 
                nome, 
                data_nascimento,
                sexo, 
                naturalidade, 
                responsavel_principal, 
                responsavel_secundario,
                ENDERECO_CRIANCA(rua, numero, bairro, cidade, estado, cep),
                SAUDE_CRIANCA(observacoes)
            `)
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) {
            console.error("Erro Supabase (Listar):", error.message);
            throw error;
        }
        
        // Normaliza os dados para o formato esperado pelo frontend
        const alunosNormalizados = data.map(aluno => ({
            id: aluno.id,
            nome: aluno.nome,
            dataNasc: aluno.data_nascimento,
            sexo: aluno.sexo,
            naturalidade: aluno.naturalidade,
            responsavelPrincipal: aluno.responsavel_principal,
            responsavelSecundario: aluno.responsavel_secundario,
            ENDERECO_CRIANCA: aluno.ENDERECO_CRIANCA || [],
            SAUDE_CRIANCA: aluno.SAUDE_CRIANCA || []
        }));
        
        res.render('ALUNO/acessar-aluno', { alunos: alunosNormalizados }); 

    } catch (error) {
        console.error("Erro geral ao listar crianças:", error.message);
        res.status(500).send('Erro ao buscar crianças. Verifique o console do servidor.');
    }
});

// -------------------------------------------------------------------------
// 2. API PARA LISTAR TODAS AS CRIANÇAS
// -------------------------------------------------------------------------
router.get('/api/listar', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('CADASTRO_CRIANCA')
            .select(`
                id, 
                nome, 
                data_nascimento,
                sexo, 
                responsavel_principal,
                responsavel_secundario,
                ENDERECO_CRIANCA(rua, numero, bairro, cidade, estado, cep)
            `)
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) throw error;
        
        // Normaliza os dados para o formato esperado pelo frontend
        const criancasNormalizadas = data.map(crianca => ({
            id: crianca.id,
            nome: crianca.nome,
            dataNasc: crianca.data_nascimento,
            sexo: crianca.sexo,
            responsavelPrincipal: crianca.responsavel_principal,
            responsavelSecundario: crianca.responsavel_secundario,
            ENDERECO_CRIANCA: crianca.ENDERECO_CRIANCA || []
        }));
        
        res.json(criancasNormalizadas);

    } catch (error) {
        console.error("Erro ao listar crianças:", error.message);
        res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
});

// -------------------------------------------------------------------------
// 3. API PARA BUSCAR CRIANÇAS POR NOME
// -------------------------------------------------------------------------
router.get('/api/buscar', async (req, res) => {
    const { termo } = req.query;
    
    if (!termo || termo.trim().length === 0) {
        return res.status(400).json({ error: 'Termo de busca inválido' });
    }

    try {
        const { data, error } = await supabase
            .from('CADASTRO_CRIANCA')
            .select(`
                id, 
                nome, 
                data_nascimento,
                sexo, 
                responsavel_principal,
                responsavel_secundario,
                ENDERECO_CRIANCA(rua, numero, bairro, cidade, estado, cep)
            `)
            .eq('ativo', true)
            .ilike('nome', `%${termo}%`)
            .order('nome', { ascending: true });

        if (error) throw error;
        
        // Normaliza os dados para o formato esperado pelo frontend
        const criancasNormalizadas = data.map(crianca => ({
            id: crianca.id,
            nome: crianca.nome,
            dataNasc: crianca.data_nascimento,
            sexo: crianca.sexo,
            responsavelPrincipal: crianca.responsavel_principal,
            responsavelSecundario: crianca.responsavel_secundario,
            ENDERECO_CRIANCA: crianca.ENDERECO_CRIANCA || []
        }));
        
        res.json(criancasNormalizadas);

    } catch (error) {
        console.error("Erro ao buscar crianças:", error.message);
        res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
});

// -------------------------------------------------------------------------
// 4. API PARA BUSCAR DETALHES DE UMA CRIANÇA
// -------------------------------------------------------------------------
router.get('/api/detalhes/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('CADASTRO_CRIANCA')
            .select(`
                id,
                nome,
                data_nascimento,
                sexo,
                naturalidade,
                responsavel_principal,
                responsavel_secundario,
                ENDERECO_CRIANCA(rua, numero, bairro, cidade, estado, cep),
                SAUDE_CRIANCA(observacoes),
                TEL_CRIANCA(telefone, tipo)
            `)
            .eq('id', id)
            .eq('ativo', true)
            .single(); 

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Criança não encontrada' });
            }
            throw error;
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Criança não encontrada' });
        }

        // Normaliza os dados para o formato esperado pelo frontend
        const criancaNormalizada = {
            id: data.id,
            nome: data.nome,
            dataNasc: data.data_nascimento,
            sexo: data.sexo,
            naturalidade: data.naturalidade,
            responsavelPrincipal: data.responsavel_principal,
            responsavelSecundario: data.responsavel_secundario,
            ENDERECO_CRIANCA: data.ENDERECO_CRIANCA || [],
            SAUDE_CRIANCA: data.SAUDE_CRIANCA || [],
            TEL_CRIANCA: data.TEL_CRIANCA || []
        };

        res.json(criancaNormalizada);

    } catch (error) {
        console.error("Erro ao buscar detalhes da criança:", error.message);
        res.status(500).json({ error: 'Erro ao buscar detalhes' });
    }
});

// -------------------------------------------------------------------------
// 5. ROTA PARA ARQUIVAR (EXCLUSÃO LÓGICA)
// -------------------------------------------------------------------------
router.post('/arquivar/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Primeiro verifica se a criança existe
        const { data: criancaExiste, error: erroVerificacao } = await supabase
            .from('CADASTRO_CRIANCA')
            .select('id')
            .eq('id', id)
            .eq('ativo', true)
            .single();

        if (erroVerificacao || !criancaExiste) {
            return res.status(404).json({ 
                error: 'Criança não encontrada ou já está arquivada' 
            });
        }

        // Arquiva a criança
        const { error } = await supabase
            .from('CADASTRO_CRIANCA')
            .update({ ativo: false })
            .eq('id', id);

        if (error) {
            console.error("Erro ao arquivar:", error.message);
            throw error;
        }
        
        res.json({ message: 'Cadastro arquivado com sucesso' });

    } catch (error) {
        console.error("Erro geral ao arquivar criança:", error.message);
        res.status(500).json({ 
            error: 'Erro ao arquivar cadastro.', 
            details: error.message 
        });
    }
});

export default router;