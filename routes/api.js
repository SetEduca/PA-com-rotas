// Alterado de 'require' para 'import'
import express from 'express';
const router = express.Router();
import asaasService from '../services/asaasService.js';
import Aluno from '../models/Aluno.js';
import Transacao from '../models/Transacao.js';

// Rota para buscar os alunos (AGORA DO NOSSO BANCO)
router.get('/alunos', async (req, res) => {
    try {
        const alunosDoBanco = await Aluno.findAll(); 
        
        // Formata os dados para o frontend (com nomes das crianças)
        const alunosFormatados = alunosDoBanco.map(aluno => ({
            id: aluno.id, // ID do nosso banco (ex: 1, 2, 3)
            asaasId: aluno.asaasCustomerId, // A "ponte" (ex: cus_123)
            studentName: aluno.nomeCrianca, // Nome correto
            parentName: aluno.nomeResponsavel,
            mensalidade: 550.00, // Exemplo
            vencimento: 'N/A', 
            status: 'pago' 
        }));
        res.json(alunosFormatados);
    } catch (error) {
        console.error('Erro ao buscar alunos no BD:', error);
        res.status(500).json({ message: 'Erro ao buscar alunos' });
    }
});

// Rota para buscar transações (AGORA DE DOIS LUGARES)
router.get('/transacoes', async (req, res) => {
    try {
        // 1. Buscar RECEITAS no Asaas
        const cobrancasAsaas = await asaasService.getCobrancas();
        const receitasFormatadas = cobrancasAsaas.map(cobranca => ({
            id: cobranca.id,
            customerId: cobranca.customer, // ID do Asaas (a "ponte")
            date: cobranca.dueDate,
            description: cobranca.description,
            category: 'Mensalidade',
            value: cobranca.value,
            type: 'Receita', 
            status: cobranca.status === 'PAID' ? 'ativo' : 'pendente' 
        }));

        // 2. Buscar DESPESAS no nosso banco (Supabase)
        const despesasDoBanco = await Transacao.findAll();
        const despesasFormatadas = despesasDoBanco.map(despesa => ({
            id: despesa.id,
            customerId: null, // Despesa não tem cliente
            date: despesa.data,
            description: despesa.descricao,
            category: despesa.categoria,
            value: -Math.abs(despesa.valor), // Valor negativo
            type: 'Despesa',
            status: 'ativo'
        }));

        // 3. Juntar tudo e enviar
        const transacoesCompletas = [...receitasFormatadas, ...despesasFormatadas];
        transacoesCompletas.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json(transacoesCompletas);

    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({ message: 'Erro ao buscar transações' });
    }
});

// Rota para criar um novo lançamento (AGORA INTELIGENTE)
router.post('/transacoes', async (req, res) => {
    const { tipo, valor, data, descricao, categoria, alunoId } = req.body;

    try {
        if (tipo === 'Receita') {
            // 1. Achar o aluno no NOSSO BD para pegar o ID do Asaas
            const aluno = await Aluno.findByPk(alunoId); // alunoId é o ID do *nosso* banco (ex: 1)
            
            if (!aluno || !aluno.asaasCustomerId) {
                return res.status(400).json({ message: 'Aluno não encontrado ou não sincronizado com Asaas.' });
            }

            // 2. Criar a cobrança no ASAAS usando o ID da "ponte"
            const novaCobranca = await asaasService.criarCobranca({
                customer: aluno.asaasCustomerId, // Usa o ID da "ponte" (ex: cus_123)
                billingType: 'BOLETO',
                dueDate: data,
                value: valor,
                description: descricao
            });
            res.status(201).json(novaCobranca);

        } else if (tipo === 'Despesa') {
            // 1. Salvar a despesa DIRETAMENTE no Supabase
            const novaDespesa = await Transacao.create({
                descricao, valor, categoria, data
            });
            res.status(201).json(novaDespesa);
        }
    } catch (error) {
         res.status(500).json({ message: "Erro ao salvar lançamento." });
    }
});

// Alterado de 'module.exports' para 'export default'
export default router;