const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');
// Importa nossas "prateleiras" do BD
const Aluno = require('../models/Aluno');
const Transacao = require('../models/Transacao');

// Rota GET /transacoes (Agora busca de 2 lugares!)
router.get('/transacoes', async (req, res) => {
    try {
        // 1. Busca Receitas no Asaas
        const receitasDoAsaas = await asaasService.getCobrancas();
        const receitasFormatadas = receitasDoAsaas.map(c => ({
            id: c.id, date: c.dueDate, description: c.description,
            category: 'Mensalidade', value: c.value, type: 'Receita',
            status: c.status === 'PAID' ? 'ativo' : 'pendente'
        }));

        // 2. Busca Despesas no nosso BD
        const despesasDoBanco = await Transacao.findAll();
        const despesasFormatadas = despesasDoBanco.map(d => ({
            id: d.id, date: d.data, description: d.descricao,
            category: d.categoria, value: -Math.abs(d.valor), // Despesa é negativa
            type: 'Despesa', status: 'ativo'
        }));

        // 3. Junta tudo e envia
        const transacoesCompletas = [...receitasFormatadas, ...despesasFormatadas];
        transacoesCompletas.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(transacoesCompletas);

    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar transações." });
    }
});

// Rota GET /alunos (Agora busca do nosso BD)
router.get('/alunos', async (req, res) => {
    try {
        const alunos = await Aluno.findAll();
        // Formata os dados (aqui você pode adicionar a lógica de status financeiro)
        const alunosFormatados = alunos.map(aluno => ({
             id: aluno.id, // ID do nosso BD
             asaasId: aluno.asaasCustomerId, // O ID do Asaas
             studentName: aluno.nomeCompleto,
             parentName: aluno.nomeResponsavel,
             mensalidade: 550.00, // Simplificado
             vencimento: '10/11/2025',
             status: 'pago' // Simplificado
         }));
        res.json(alunosFormatados);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar alunos." });
    }
});

// Rota POST /transacoes (Para criar Receitas ou Despesas)
router.post('/transacoes', async (req, res) => {
    const { tipo, valor, data, descricao, categoria, alunoId } = req.body;

    try {
        if (tipo === 'Receita') {
            // 1. Achar o aluno no NOSSO BD para pegar o ID do Asaas
            const aluno = await Aluno.findByPk(alunoId);
            if (!aluno || !aluno.asaasCustomerId) {
                return res.status(400).json({ message: 'Aluno não encontrado ou não sincronizado com Asaas.' });
            }

            // 2. Criar a cobrança no ASAAS
            const novaCobranca = await asaasService.criarCobranca({
                customer: aluno.asaasCustomerId, // Usa o ID da "ponte"
                billingType: 'BOLETO',
                dueDate: data,
                value: valor,
                description: descricao
            });
            res.status(201).json(novaCobranca);

        } else if (tipo === 'Despesa') {
            // 1. Salvar a despesa no NOSSO BD
            const novaDespesa = await Transacao.create({
                descricao, valor, categoria, data, tipo
            });
            res.status(201).json(novaDespesa);
        }
    } catch (error) {
         res.status(500).json({ message: "Erro ao salvar lançamento." });
    }
});

module.exports = router;
