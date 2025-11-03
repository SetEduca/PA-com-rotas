import express from 'express';
import supabase from '../supabase.js';
import crypto from 'crypto'; // Importa o módulo crypto

const router = express.Router();

// -------------------------------------------------------------------------
// 1. ROTA PARA EXIBIR A PÁGINA (LISTAGEM INICIAL)
// -------------------------------------------------------------------------
// Rota: /acessar-aluno/
router.get('/', async (req, res) => {
    try {
        // A página 'acessar-aluno.ejs' [cite: 1-234] faz sua própria chamada fetch [cite: 169-173],
        // então não precisamos passar os 'alunos' aqui.
        // Apenas renderizamos a página base.
        res.render('ALUNO/acessar-aluno', { alunos: [] }); // Passa array vazio

    } catch (error) {
        console.error("Erro geral ao renderizar página:", error.message);
        res.status(500).send('Erro ao carregar página. Verifique o console do servidor.');
    }
});

// -------------------------------------------------------------------------
// 2. API PARA LISTAR TODAS AS CRIANÇAS
// -------------------------------------------------------------------------
// Rota: /acessar-aluno/api/listar
router.get('/api/listar', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cadastro_crianca') // <-- CORRIGIDO
            .select(`
                id, 
                nome, 
                data_nascimento,
                ativo,
                sexo, 
                naturalidade, 
                responsavel_principal, 
                responsavel_secundario,
                endereco_crianca(rua, numero, bairro, cidade, estado, cep), 
                saude_crianca(observacoes)
            `) // <-- CORRIGIDO
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) throw error;
        
        // Normaliza os dados para o que o EJS espera [cite: 161-162]
        const alunosNormalizados = data.map(aluno => ({
            ...aluno,
            ENDERECO_CRIANCA: aluno.endereco_crianca || [], 
            SAUDE_CRIANCA: aluno.saude_crianca || []
        }));
        
        res.json(alunosNormalizados); // O EJS pega esse JSON

    } catch (error) {
        console.error("Erro ao listar crianças:", error.message);
        res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
});

// -------------------------------------------------------------------------
// 3. API PARA BUSCAR CRIANÇAS POR NOME
// -------------------------------------------------------------------------
// Rota: /acessar-aluno/api/buscar
router.get('/api/buscar', async (req, res) => {
    const { termo } = req.query;
    
    if (!termo || termo.trim().length === 0) {
        return res.status(400).json({ error: 'Termo de busca inválido' });
    }

    try {
        const { data, error } = await supabase
            .from('cadastro_crianca') // <-- CORRIGIDO
            .select(`
                id, 
                nome, 
                data_nascimento,
                ativo,
                sexo, 
                naturalidade, 
                responsavel_principal, 
                responsavel_secundario,
                endereco_crianca(rua, numero, bairro, cidade, estado, cep), 
                saude_crianca(observacoes)
            `) // <-- CORRIGIDO
            .eq('ativo', true)
            .ilike('nome', `%${termo}%`)
            .order('nome', { ascending: true });

        if (error) throw error;
        
        const alunosNormalizados = data.map(aluno => ({
            ...aluno,
            ENDERECO_CRIANCA: aluno.endereco_crianca || [], 
            SAUDE_CRIANCA: aluno.saude_crianca || []
        }));
        
        res.json(alunosNormalizados);

    } catch (error) {
        console.error("Erro ao buscar crianças:", error.message);
        res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
});

// -------------------------------------------------------------------------
// 4. API PARA BUSCAR DETALHES DE UMA CRIANÇA
// -------------------------------------------------------------------------
// Rota: /acessar-aluno/api/detalhes/:id
router.get('/api/detalhes/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('cadastro_crianca') // <-- CORRIGIDO
            .select(`
                id,
                nome,
                data_nascimento,
                ativo,
                sexo,
                naturalidade,
                responsavel_principal,
                responsavel_secundario,
                endereco_crianca(rua, numero, bairro, cidade, estado, cep),
                saude_crianca(observacoes)
            `) // <-- CORRIGIDO
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

        // Normalizando para o EJS [cite: 185-189]
        const criancaNormalizada = {
            ...data,
            ENDERECO_CRIANCA: data.endereco_crianca,
            SAUDE_CRIANCA: data.saude_crianca
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
// Rota: /acessar-aluno/arquivar/:id
router.post('/arquivar/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data: criancaExiste, error: erroVerificacao } = await supabase
            .from('cadastro_crianca') // <-- CORRIGIDO
            .select('id')
            .eq('id', id)
            .eq('ativo', true)
            .single();

        if (erroVerificacao || !criancaExiste) {
            return res.status(404).json({ 
                error: 'Criança não encontrada ou já está arquivada' 
            });
        }

        const { error } = await supabase
            .from('cadastro_crianca') // <-- CORRIGIDO
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


// ========================================================================
// 6. ROTA POST PARA CADASTRAR NOVO ALUNO (ROTA ADICIONADA)
// ========================================================================
// Rota: /acessar-aluno/cadastrar
router.post('/cadastrar', async (req, res) => {
    
    const {
        nome, dataNascimento: data_nascimento, cpf, sexo, naturalidade,
        responsavel: responsavel_nome, cpf_responsavel,
        telefone: responsavel_telefone_completo, email: responsavel_email,
        logradouro: rua, numero: end_numero, bairro, cidade, estado, cep,
        observacoes
    } = req.body;

    // Limpeza de CPFs (remove pontos e traços)
    const cpfCriancaLimpo = cpf ? cpf.replace(/\D/g, '') : null;
    const cpfResponsavelLimpo = cpf_responsavel ? cpf_responsavel.replace(/\D/g, '') : null;

    let responsavelId;
    let criancaId;
    let responsavelFoiCriado = false; // Flag para rollback

    try {
        
        // Passo 1: Encontrar ou Criar Responsável
        const { data: responsavelExistente, error: erroConsulta } = await supabase
            .from('responsavel') // <-- CORRIGIDO
            .select('id')
            .eq('cpf', cpfResponsavelLimpo)
            .single();

        if (responsavelExistente) {
            // Se encontrou, apenas usa o ID
            responsavelId = responsavelExistente.id;
        
        } else if (erroConsulta && erroConsulta.code === 'PGRST116') {
            // CPF não existe, então criamos um novo.
            const { data: responsavelData, error: responsavelError } = await supabase
                .from('responsavel') // <-- CORRIGIDO
                .insert({
                    nome: responsavel_nome,
                    email: responsavel_email,
                    cpf: cpfResponsavelLimpo 
                })
                .select('id')
                .single();

            if (responsavelError) {
                throw new Error(`Erro ao criar responsável: ${responsavelError.message}`);
            }
            
            responsavelId = responsavelData.id;
            responsavelFoiCriado = true; // Marca que criamos este responsável

        } else if (erroConsulta) {
            throw new Error(`Erro ao consultar responsável: ${erroConsulta.message}`);
        }
        
        // Passo 2: Inserir Telefone do Responsável
        if (responsavel_telefone_completo) {
            const telLimpo = responsavel_telefone_completo.replace(/\D/g, '');
            const ddd = telLimpo.substring(0, 2);
            const numeroTel = telLimpo.substring(2);
            
            const { error: telError } = await supabase
                .from('tel_resp') // <-- CORRIGIDO
                .insert({
                    ddd: ddd,
                    numero: numeroTel,
                    responsavel_id: responsavelId
                });
            
            if (telError) {
                console.warn("Erro ao inserir telefone do responsável:", telError.message);
            }
        }
        
        // Passo 3: Inserir a Criança
        const { data: criancaData, error: criancaError } = await supabase
            .from('cadastro_crianca') // <-- CORRIGIDO
            .insert({
                cpf: cpfCriancaLimpo, 
                nome: nome,
                data_nascimento: data_nascimento,
                sexo: sexo,
                naturalidade: naturalidade, // Campo obrigatório
                responsavel_id: responsavelId,
                ativo: true,
                asaascustomerid: crypto.randomUUID() // Campo obrigatório
            })
            .select('id')
            .single();

        if (criancaError) {
            console.error("Erro ao inserir criança:", criancaError.message);
            
            // "Rollback": Só deleta o responsável se ele foi criado AGORA
            if (responsavelFoiCriado) {
                await supabase.from('responsavel').delete().eq('id', responsavelId);
            }
            
            if (criancaError.code === '23505') {
                 throw new Error(`O CPF ${cpf} da criança já está cadastrado.`);
            }
            throw new Error(`Erro ao cadastrar criança: ${criancaError.message}`);
        }
        criancaId = criancaData.id;

        // Passo 4: Inserir Endereço da Criança
        if (rua && end_numero && bairro && cidade && cep && estado) {
            const { error: endError } = await supabase
                .from('endereco_crianca') // <-- CORRIGIDO
                .insert({
                    rua: rua,
                    numero: end_numero,
                    bairro: bairro,
                    cidade: cidade,
                    cep: cep,
                    estado: estado, // Campo obrigatório
                    crianca_id: criancaId
                });
            
            if (endError) {
                console.warn("Erro ao inserir endereço da criança:", endError.message);
            }
        }

        // Passo 5: Inserir Saúde da Criança
        if (observacoes && observacoes.trim() !== '') {
            const { error: saudeError } = await supabase
                .from('saude_crianca') // <-- CORRIGIDO
                .insert({
                    observacoes: observacoes,
                    crianca_id: criancaId
                });

            if (saudeError) {
                console.warn("Erro ao inserir dados de saúde:", saudeError.message);
            }
        }

        // Se tudo deu certo
        res.status(201).json({ 
            message: 'Criança cadastrada com sucesso!', 
            criancaId: criancaId, 
            responsavelId: responsavelId 
        });

    } catch (error) {
        console.error("Erro geral no cadastro:", error.message);
        res.status(500).json({ 
            error: 'Erro interno ao processar cadastro.', 
            details: error.message 
        });
    }
});

export default router;