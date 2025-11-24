import express from 'express';
import supabase from '../supabase.js';
import axios from 'axios';

const router = express.Router();

// CONFIGURAÇÃO DO ASAAS (Igual fizemos no Financeiro)
// =================================================================
const asaasAPI = axios.create({
    baseURL: process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3',
    headers: {
        'access_token': process.env.ASAAS_API_KEY,
        'Content-Type': 'application/json'
    }
});
// 1. LISTAR ALUNOS (GET /)
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cadastro_crianca')
            .select(`
                id, nome, foto_crianca,
                responsavel:responsavel_id (
                    nome,
                    tel_resp (ddd, numero)
                )
            `)
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) throw error;

        const alunosFormatados = data.map(aluno => {
            let telefoneFormatado = '-';
            if (aluno.responsavel?.tel_resp && aluno.responsavel.tel_resp.length > 0) {
                const t = aluno.responsavel.tel_resp[0];
                // Correção: Adicionadas crases (backticks)
                telefoneFormatado = `(${t.ddd}) ${t.numero}`;
            }

            return {
                id: aluno.id,
                nome: aluno.nome,
                responsavel: aluno.responsavel ? aluno.responsavel.nome : 'Não informado',
                telefone: telefoneFormatado,
                foto: aluno.foto_crianca
            };
        });

        res.render('ALUNO/acessar-aluno', { alunos: alunosFormatados });

    } catch (error) {
        console.error("Erro ao listar alunos:", error.message);
        res.render('ALUNO/acessar-aluno', { alunos: [] });
    }
});

// 2. VER DETALHES NO MODAL (API JSON)
router.get('/ver/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: crianca, error: errCrianca } = await supabase
            .from('cadastro_crianca')
            // Correção: Ajustado para buscar todos os campos (*) e o relacionamento, removendo a vírgula solta
            .select('*, responsavel:responsavel_id(*)')
            .eq('id', id)
            .single();

        if (errCrianca) throw errCrianca;

        let telData = [];
        if (crianca.responsavel_id) {
            const { data: t } = await supabase.from('tel_resp').select('*').eq('responsavel_id', crianca.responsavel_id);
            telData = t || [];
        }

        const { data: enderecoData } = await supabase.from('endereco_crianca').select('*').eq('crianca_id', id);
        const { data: saudeData } = await supabase.from('saude_crianca').select('*').eq('crianca_id', id);

        let tel = '-';
        // Correção: Adicionadas crases (backticks)
        if (telData.length > 0) { tel = `(${telData[0].ddd}) ${telData[0].numero}`; }

        let dataFormatada = crianca.data_nascimento || '-';
        if (dataFormatada && dataFormatada.includes('-')) {
            const [ano, mes, dia] = dataFormatada.split('-');
            // Correção: Adicionadas crases (backticks)
            dataFormatada = `${dia}/${mes}/${ano}`;
        }

        const end = (enderecoData && enderecoData.length > 0) ? enderecoData[0] : {};
        const saude = (saudeData && saudeData.length > 0) ? saudeData[0] : {};

        res.json({
            nome: crianca.nome,
            dataNascimento: dataFormatada,
            cpf: crianca.cpf || '-',
            sexo: crianca.sexo || '-',
            naturalidade: crianca.naturalidade || '-',
            responsavel: crianca.responsavel?.nome || '-',
            cpf_responsavel: crianca.responsavel?.cpf || '-',
            email: crianca.responsavel?.email || '-',
            telefone: tel,
            cep: end.cep || '-',
            cidade: end.cidade || '-',
            estado: end.estado || '-',
            logradouro: end.rua || '-', 
            numero: end.numero || 'S/N',
            bairro: end.bairro || '-',
            observacoes: saude.observacoes || 'Nenhuma observação.',
            alergias: saude.alergias || '',
            deficiencias: saude.deficiencias || ''
        });

    } catch (error) {
        console.error("Erro API Ver Detalhes:", error);
        res.status(500).json({ error: 'Erro ao buscar detalhes' });
    }
});

// 3. ABRIR TELA DE EDIÇÃO (GET)
router.get('/editar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: crianca, error } = await supabase
            .from('cadastro_crianca')
            .select('*, responsavel:responsavel_id(*)')
            .eq('id', id)
            .single();

        if (error) throw error;

        const { data: enderecoData } = await supabase.from('endereco_crianca').select('*').eq('crianca_id', id);
        const { data: saudeData } = await supabase.from('saude_crianca').select('*').eq('crianca_id', id);
        
        let telData = [];
        if (crianca.responsavel_id) {
            const { data: t } = await supabase.from('tel_resp').select('*').eq('responsavel_id', crianca.responsavel_id);
            telData = t;
        }

        const alunoCompleto = {
            ...crianca,
            endereco_crianca: enderecoData || [],
            saude_crianca: saudeData || [],
            responsavel: {
                ...(crianca.responsavel || {}),
                tel_resp: telData || []
            }
        };

        res.render('ALUNO/editar-aluno', { aluno: alunoCompleto });

    } catch (error) {
        console.error("Erro ao carregar edição:", error.message);
        res.redirect('/acessar-aluno');
    }
});

// 4. SALVAR EDIÇÃO (POST)
router.post('/editar/:id', async (req, res) => {
    const { id } = req.params;
    const {
        nome, dataNascimento, cpf, sexo, naturalidade,
        responsavel: nomeResp, cpf_responsavel, telefone, email,
        cep, cidade, estado, logradouro, numero, bairro,
        observacoes, alergias, deficiencias,
        foto_crianca
    } = req.body;

    try {
        // Objeto de atualização da criança
        const updateCrianca = { 
            nome, 
            data_nascimento: dataNascimento, 
            cpf: cpf.replace(/\D/g, ''), 
            sexo, 
            naturalidade 
        };

        // Se enviou foto nova, atualiza
        if (foto_crianca && foto_crianca.length > 100) {
            updateCrianca.foto_crianca = foto_crianca;
        }

        // 1. Atualiza Criança
        const { data: crianca, error: errC } = await supabase.from('cadastro_crianca')
            .update(updateCrianca)
            .eq('id', id)
            .select('responsavel_id')
            .single();
            
        if (errC) throw errC;

        // 2. Atualiza Responsável
        if (crianca.responsavel_id) {
            await supabase.from('responsavel')
                .update({ nome: nomeResp, cpf: cpf_responsavel.replace(/\D/g, ''), email: email })
                .eq('id', crianca.responsavel_id);

            const telLimpo = telefone.replace(/\D/g, '');
            if (telLimpo.length >= 10) {
                await supabase.from('tel_resp').delete().eq('responsavel_id', crianca.responsavel_id);
                await supabase.from('tel_resp').insert({ 
                    ddd: telLimpo.substring(0, 2), 
                    numero: telLimpo.substring(2), 
                    responsavel_id: crianca.responsavel_id 
                });
            }
        }

        // 3. Atualiza Endereço
        const dadosEnd = { rua: logradouro, numero, bairro, cidade, estado, cep, crianca_id: id };
        const { data: endExistente } = await supabase.from('endereco_crianca').select('id').eq('crianca_id', id).maybeSingle();
        
        if (endExistente) {
            await supabase.from('endereco_crianca').update(dadosEnd).eq('crianca_id', id);
        } else {
            await supabase.from('endereco_crianca').insert(dadosEnd);
        }

        // 4. Atualiza Saúde
        const dadosSaude = { observacoes, alergias: alergias || '', deficiencias: deficiencias || '', crianca_id: id };
        const { data: saudeExistente } = await supabase.from('saude_crianca').select('id').eq('crianca_id', id).maybeSingle();
        if (saudeExistente) {
            await supabase.from('saude_crianca').update(dadosSaude).eq('crianca_id', id);
        } else {
            await supabase.from('saude_crianca').insert(dadosSaude);
        }

        res.redirect('/acessar-aluno');
    } catch (error) {
        console.error("Erro ao salvar edição:", error.message);
        res.status(500).send("Erro ao salvar alterações: " + error.message);
    }
});

// 5. CADASTRAR NOVO (POST)
router.post('/cadastrar', async (req, res) => {
    const { 
        nome, dataNascimento, cpf, sexo, naturalidade, 
        responsavel: nomeResp, cpf_responsavel, telefone, email, 
        cep, cidade, estado, logradouro, numero, bairro, 
        observacoes, foto_crianca 
    } = req.body;

    const cpfRespClean = cpf_responsavel ? cpf_responsavel.replace(/\D/g, '') : null;

    try {
        let responsavelId;

        // 1. Responsável
        const { data: respExistente } = await supabase.from('responsavel').select('id').eq('cpf', cpfRespClean).maybeSingle();

        if (respExistente) {
            responsavelId = respExistente.id;
        } else {
            const { data: novoResp, error: errResp } = await supabase.from('responsavel')
                .insert({ nome: nomeResp, cpf: cpfRespClean, email })
                .select('id')
                .single();
            if (errResp) throw errResp;
            responsavelId = novoResp.id;
        }

        // 2. Telefone
        const telLimpo = telefone ? telefone.replace(/\D/g, '') : '';
        if (telLimpo.length >= 10) {
            await supabase.from('tel_resp').delete().eq('responsavel_id', responsavelId);
            await supabase.from('tel_resp').insert({ 
                ddd: telLimpo.substring(0, 2), 
                numero: telLimpo.substring(2), 
                responsavel_id: responsavelId 
            });
        }

        // 3. O GRANDE SEGREDO: CRIA O CLIENTE NO ASAAS AGORA!
        // =================================================================
        try {
            // Limpeza de dados para o Asaas
            let emailAsaas = email;
            if (!emailAsaas || !emailAsaas.includes('@')) emailAsaas = `cliente.${cpfRespClean}@seteeducca.com`;
            let foneAsaas = telLimpo.length >= 10 ? telLimpo : undefined;
            let cepAsaas = cep ? cep.replace(/\D/g, '') : '40000000'; // Padrão se faltar

            console.log(`>>> Cadastrando responsável no Asaas: ${nomeResp}`);
            
            const novoClienteAsaas = await asaasAPI.post('/customers', {
                name: nomeResp,
                cpfCnpj: cpfRespClean,
                email: emailAsaas,
                mobilePhone: foneAsaas,
                address: logradouro,
                addressNumber: numero || 'S/N',
                province: bairro,
                postalCode: cepAsaas
            });

            // SALVA O ID DO ASAAS DE VOLTA NO BANCO (VITAL!)
            if (novoClienteAsaas.data && novoClienteAsaas.data.id) {
                await supabase.from('responsavel')
                    .update({ asaasCustomerId: novoClienteAsaas.data.id })
                    .eq('id', responsavelId);
                console.log(`>>> Sucesso! ID Asaas vinculado: ${novoClienteAsaas.data.id}`);
            }

        } catch (erroAsaas) {
            // Se der erro no Asaas, NÃO trava o cadastro do aluno, mas avisa no console
            console.error("Aviso: Não foi possível criar no Asaas agora (será corrigido na auto-correção do financeiro):", 
                erroAsaas.response ? erroAsaas.response.data : erroAsaas.message);
        }
        // 3. Criança (INCLUINDO A FOTO)
        const { data: novaCrianca, error: errCrianca } = await supabase.from('cadastro_crianca')
            .insert({
                nome, 
                data_nascimento: dataNascimento, 
                cpf: cpf?.replace(/\D/g, ''), 
                sexo, 
                naturalidade, 
                responsavel_id: responsavelId, 
                ativo: true,
                foto_crianca: foto_crianca || null 
            })
            .select('id')
            .single();

        if (errCrianca) throw errCrianca;

        // 4. Endereço
        const { error: errEnd } = await supabase.from('endereco_crianca').insert({
            rua: logradouro, numero, bairro, cidade, estado, cep, crianca_id: novaCrianca.id
        });

        if (errEnd) throw new Error("Erro endereço: " + errEnd.message);

        // 5. Saúde
        if (observacoes) {
            await supabase.from('saude_crianca').insert({ observacoes, crianca_id: novaCrianca.id });
        }

        res.status(200).json({ message: 'Sucesso' });

    } catch (error) {
        console.error("Erro Fatal no Cadastro:", error);
        if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
             return res.status(400).json({ error: 'Este CPF já está cadastrado.' });
        }
        res.status(500).json({ error: error.message || "Erro interno." });
    }
});

router.post('/arquivar/:id', async (req, res) => {
    try { await supabase.from('cadastro_crianca').update({ ativo: false }).eq('id', req.params.id); res.redirect('/acessar-aluno'); }
    catch (error) { res.status(500).send("Erro ao arquivar."); }
});

export default router;