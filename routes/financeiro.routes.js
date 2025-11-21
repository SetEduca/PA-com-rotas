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
// Rota para buscar transações (COM FILTRO DE ATIVOS)
router.get('/transacoes', async (req, res) => {
    try {
        // 1. Busca Receitas do Asaas (Mensalidades)
        let receitasAsaas = [];
        try {
            const dadosAsaas = await asaasService.getCobrancas();
            receitasAsaas = dadosAsaas.map(c => ({
                id: c.id, // ID do Asaas (string)
                date: c.dueDate,
                description: c.description || 'Mensalidade',
                category: 'Mensalidade',
                value: c.value,
                type: 'Receita',
                status: c.status === 'PAID' ? 'pago' : 'pendente'
            }));
        } catch (e) { console.error("Asaas off:", e.message); }

        // 2. Busca Transações Internas (Despesas + Receitas Manuais de Uniforme, etc)
        // Importante: Buscamos TUDO que está ativo no banco
        const transacoesBanco = await Transacao.findAll({
            where: { ativo: true }
        });

        const itensBanco = transacoesBanco.map(t => ({
            id: t.id, // ID do Banco (número)
            date: t.data,
            description: t.descricao,
            category: t.categoria,
            value: parseFloat(t.valor),
            // Se valor for positivo é Receita, negativo é Despesa
            type: parseFloat(t.valor) >= 0 ? 'Receita' : 'Despesa',
            status: 'ativo' // Itens manuais geralmente já nascem "pagos" ou ativos
        }));

        // 3. Mistura tudo e ordena por data
        const relatorioFinal = [...receitasAsaas, ...itensBanco];
        relatorioFinal.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(relatorioFinal);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar transações' });
    }
});
// ... (mantenha os 'import' do topo do arquivo)

// Rota para criar um novo lançamento
// Rota Inteligente para Criar Transações
// api.js - Rota POST /transacoes
router.post('/transacoes', async (req, res) => {
    const { tipo, valor, data, descricao, categoria, alunoId } = req.body;

    try {
        // ==========================================
        // CASO 1: DESPESA (Saiu dinheiro)
        // ==========================================
        if (tipo === 'Despesa') {
            const novaDespesa = await Transacao.create({
                descricao, 
                valor: -Math.abs(valor), // Valor negativo
                categoria, 
                data, 
                ativo: true
            });
            return res.status(201).json(novaDespesa);
        }

        // ==========================================
        // CASO 2: RECEITA (Entrou dinheiro)
        // ==========================================
        else if (tipo === 'Receita') {
            
            // Lista do que OBRIGATORIAMENTE vira boleto
            const geraBoleto = ['Mensalidade', 'Matrícula', 'Material Didático'].includes(categoria);

            if (geraBoleto) {
                // --- FLUXO ASAAS ---
                const aluno = await Aluno.findByPk(alunoId, { include: ['responsavel'] });
                
                if (!aluno?.responsavel?.asaasCustomerId) {
                    return res.status(400).json({ message: 'Aluno sem cadastro no Asaas. Verifique o responsável.' });
                }

                // 1. Cria no Asaas
                const cobranca = await asaasService.criarCobranca({
                    customer: aluno.responsavel.asaasCustomerId,
                    billingType: 'BOLETO',
                    dueDate: data,
                    value: valor,
                    description: `${categoria} - ${aluno.nome}`
                });
                
                // 2. Opcional: Você pode salvar no seu banco Transacao também, 
                // mas geralmente a gente deixa a rota GET /transacoes buscar do Asaas
                // para não ficar duplicado na tela.
                return res.status(201).json(cobranca);

            } else {
                // --- FLUXO MANUAL (Uniforme, Evento, etc) ---
                // Aqui atende seu pedido: Faz o relatório direto no seu banco!
                
                const novaReceita = await Transacao.create({
                    descricao: `${descricao} - ${categoria}`,
                    valor: Math.abs(valor), // Valor positivo
                    categoria: categoria,
                    data: data,
                    ativo: true,
                    // Não tem ID do Asaas, é interno
                });

                return res.status(201).json(novaReceita);
            }
        }

    } catch (error) {
        console.error("Erro ao salvar:", error);
        res.status(500).json({ message: "Erro interno ao processar." });
    }
});

// O Frontend vai chamar essa rota quando você criar a página de histórico
router.get('/transacoes/historico', async (req, res) => {
    try {
        // Busca apenas onde "ativo" é FALSO
        const despesasInativas = await Transacao.findAll({
            where: { ativo: false },
            order: [['data', 'DESC']] // Ordena da mais recente para a mais antiga
        });
        
        // Formata para o frontend
        const formatadas = despesasInativas.map(d => ({
            id: d.id,
            description: d.descricao,
            category: d.categoria,
            value: -Math.abs(d.valor),
            date: d.data,
            type: 'Despesa',
            status: 'arquivado'
        }));
        
        res.json(formatadas);
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        res.status(500).json({ message: 'Erro ao buscar histórico.' });
    }
});

// Rota para Situação Financeira (COLE ISSO NO FINAL DO api.js)
router.get('/alunos-status', async (req, res) => {
    try {
        // Busca alunos INCLUINDO o responsável
        const alunos = await Aluno.findAll({
            include: [{ model: Responsavel, as: 'responsavel' }]
        });

        // Se não achar ninguém, retorna lista vazia
        if (!alunos) return res.json([]);

        const relatorio = await Promise.all(alunos.map(async (aluno) => {
            let status = 'Em dia';
            let cor = 'green';

            // Verifica Asaas
            if (aluno.responsavel && aluno.responsavel.asaasCustomerId) {
                try {
                    // Tenta buscar no Asaas
                    const cobrancas = await asaasService.listarCobrancasPorCliente(aluno.responsavel.asaasCustomerId);
                    const temAtraso = cobrancas.some(c => c.status === 'OVERDUE');
                    
                    if (temAtraso) {
                        status = 'Inadimplente';
                        cor = 'red';
                    }
                } catch (err) {
                    console.error("Erro ao consultar Asaas para:", aluno.nome);
                    // Não trava o sistema, só marca como erro na consulta
                    status = 'Erro Asaas';
                    cor = 'gray';
                }
            } else {
                status = 'Sem Asaas';
                cor = 'yellow';
            }

            return {
                id: aluno.id,
                nome: aluno.nomeCrianca || aluno.nome, // Tenta os dois nomes
                responsavel: aluno.responsavel ? aluno.responsavel.nome : 'Sem Resp.',
                telefone: aluno.responsavel ? (aluno.responsavel.mobilePhone || aluno.responsavel.telefone) : '-',
                status: status,
                cor: cor
            };
        }));

        res.json(relatorio);

    } catch (error) {
        console.error("ERRO CRÍTICO na rota /alunos-status:", error);
        res.status(500).json({ message: "Erro interno ao buscar status." });
    }
});

// Rota para o Dashboard (Resumo Financeiro do Mês)
// Rota para o Dashboard (Resumo Financeiro do Mês)
router.get('/dashboard-resumo', async (req, res) => {
    try {
        // Define o início do mês atual (ex: 2025-11-01)
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth(); // 0 a 11
        
        // Data de corte: Primeiro dia do mês às 00:00:00
        const inicioMes = new Date(ano, mes, 1);

        console.log(">>> Calculando Dashboard a partir de:", inicioMes.toISOString());

        // 1. BUSCAR RECEITAS DO ASAAS (Só as Recebidas)
        let totalAsaas = 0;
        try {
            // Busca recebidas após o início do mês
            const cobrancas = await asaasService.listarCobrancas({ 
                status: 'RECEIVED', 
                datePaymentAfter: inicioMes.toISOString().split('T')[0] // Formato YYYY-MM-DD
            });
            
            if (cobrancas && cobrancas.length > 0) {
                totalAsaas = cobrancas.reduce((acc, c) => acc + c.value, 0);
            }
        } catch (e) {
            console.warn("Aviso: Não foi possível somar Asaas (ou não tem dados).", e.message);
        }

        // 2. BUSCAR TRANSAÇÕES DO BANCO (ATIVAS)
        const transacoes = await Transacao.findAll({
            where: { ativo: true }
        });

        let totalReceitasManuais = 0;
        let totalDespesas = 0;

        transacoes.forEach(t => {
            // Converte a data do banco para Objeto JS para comparar corretamente
            // (Adiciona 'T00:00:00' para garantir que pegue o dia todo se for string simples)
            const dataTransacao = new Date(t.data.includes('T') ? t.data : t.data + 'T12:00:00');
            
            // Se a transação for deste mês (ou futuro)
            if (dataTransacao >= inicioMes) {
                
                const valor = parseFloat(t.valor);
                
                if (valor >= 0) {
                    totalReceitasManuais += valor;
                } else {
                    totalDespesas += valor; // Soma negativos
                }
            }
        });

        // 3. RESULTADO FINAL
        const totalReceitas = totalAsaas + totalReceitasManuais;
        const saldo = totalReceitas + totalDespesas;

        console.log(`>>> RESUMO: Receitas: ${totalReceitas} | Despesas: ${totalDespesas} | Saldo: ${saldo}`);

        res.json({
            saldo: saldo,
            receitas: totalReceitas,
            despesas: totalDespesas
        });

    } catch (error) {
        console.error("ERRO NO DASHBOARD:", error);
        res.status(500).json({ saldo: 0, receitas: 0, despesas: 0 });
    }
});
// ... (o restante do seu arquivo routes/api.js)
export default router;