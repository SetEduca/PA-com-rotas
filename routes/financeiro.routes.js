import express from 'express';
// Use "export named" do asaasService
import * as asaasService from '../services/asaasService.js';
// Use a extensão .js
import Aluno from '../models/Aluno.js';
import Transacao from '../models/Transacao.js';
import Responsavel from '../models/Responsavel.js';

const router = express.Router();

// Rota para buscar os alunos (COM JOIN)
router.get('/alunos', async (req, res) => {
    try {
        console.log('>>> [TESTE ESM] Buscando alunos na rota GET /api/alunos...');
        
        const alunosDoBanco = await Aluno.findAll({
            include: [{
                model: Responsavel,
                as: 'responsavel', 
                required: false 
            }]
        }); 
        
        console.log('>>> [TESTE ESM] Alunos encontrados:', alunosDoBanco.length);

        const alunosFormatados = alunosDoBanco.map(aluno => ({
            id: aluno.id, 
            asaasId: aluno.asaasCustomerId, 
            studentName: aluno.nomeCrianca, 
            parentName: aluno.responsavel ? aluno.responsavel.nome : 'Sem Responsável',
            mensalidade: 550.00,
            vencimento: 'N/A', 
            status: 'pago' 
        }));
        res.json(alunosFormatados);
    } catch (error) {
        console.error('Erro ao buscar alunos com JOIN (ESM):', error);
        res.status(500).json({ message: 'Erro ao buscar alunos' });
    }
});

// Rota de Transações (GET)
router.get('/transacoes', async (req, res) => {
    try {
        const cobrancasAsaas = await asaasService.getCobrancas();
        const receitasFormatadas = cobrancasAsaas.map(c => ({
            id: c.id, customerId: c.customer, date: c.dueDate,
            description: c.description, category: 'Mensalidade',
            value: c.value, type: 'Receita', 
            status: c.status === 'PAID' ? 'ativo' : 'pendente' 
        }));

        const despesasDoBanco = await Transacao.findAll();
        const despesasFormatadas = despesasDoBanco.map(d => ({
            id: d.id, customerId: null, date: d.data,
            description: d.descricao, category: d.categoria,
            value: -Math.abs(d.valor), type: 'Despesa', status: 'ativo'
        }));

        const transacoesCompletas = [...receitasFormatadas, ...despesasFormatadas];
        transacoesCompletas.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(transacoesCompletas);

    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar transações' });
    }
});

// ... (mantenha os 'import' do topo do arquivo)

// Rota para criar um novo lançamento
router.post('/transacoes', async (req, res) => {
    const { tipo, valor, data, descricao, categoria, alunoId } = req.body;
    console.log('>>> [POST /transacoes] Recebido:', { tipo, valor, data, descricao, categoria, alunoId });
    try {
        if (tipo === 'Receita') {
            const aluno = await Aluno.findByPk(alunoId); 
            if (!aluno) {
                console.error('>>> [POST /transacoes - Receita] Aluno não encontrado com ID:', alunoId);
                return res.status(400).json({ message: 'Aluno não encontrado.' });
            }
            if (!aluno.asaasCustomerId) {
                console.error('>>> [POST /transacoes - Receita] Aluno sem Asaas Customer ID:', aluno.id);
                return res.status(400).json({ message: 'Aluno não sincronizado com Asaas (ID de cliente Asaas ausente).' });
            }
            
            console.log('>>> [POST /transacoes - Receita] Criando cobrança Asaas para Customer ID:', aluno.asaasCustomerId);
            const novaCobranca = await asaasService.criarCobranca({
                customer: aluno.asaasCustomerId,
                billingType: 'BOLETO', // Ou 'CREDIT_CARD', 'UNDEFINED'
                dueDate: data, 
                value: valor, 
                description: descricao
            });
            console.log('>>> [POST /transacoes - Receita] Cobrança Asaas criada com sucesso:', novaCobranca.id);
            res.status(201).json(novaCobranca);

        } else if (tipo === 'Despesa') {
            console.log('>>> [POST /transacoes - Despesa] Criando despesa no Supabase.');
            const novaDespesa = await Transacao.create({
                descricao, valor, categoria, data
            });
            console.log('>>> [POST /transacoes - Despesa] Despesa salva no Supabase com sucesso:', novaDespesa.id);
            res.status(201).json(novaDespesa);
        }
    } catch (error) {
         // --- ESTA É A MENSAGEM DE ERRO CRÍTICA ---
         console.error('>>> ERRO AO SALVAR LANÇAMENTO:', error.response?.data || error.message || error);
         res.status(500).json({ message: "Erro ao salvar lançamento." });
    }
});

// ... (o restante do seu arquivo routes/api.js)
export default router;