import express from 'express';
import axios from 'axios';
import supabase from '../supabase.js';
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
// =================================================================
// 3. ROTA DE LISTAGEM (STATUS CORRIGIDOS: PAGO, PENDENTE, VENCIDA)
// =================================================================
router.get('/transacoes', async (req, res) => {
    try {
        let receitasAsaas = [];
        try {
            // Busca cobranças do Asaas
            const dadosAsaas = await asaasService.getCobrancas(); 
            const transacoesBanco = await Transacao.findAll({ 
    where: { ativo: true } // <--- ESSE É O FILTRO MÁGICO
});
            
            if(Array.isArray(dadosAsaas)) {
                receitasAsaas = dadosAsaas.map(c => {
                    
                    // --- LÓGICA DE STATUS DO ASAAS ---
                    let statusFinal = 'pendente'; // Padrão

                    // Lista de status que significam "Dinheiro na Mão"
                    const statusPagos = ['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED', 'PAID'];
                    
                    if (statusPagos.includes(c.status)) {
                        statusFinal = 'pago';
                    } else if (c.status === 'OVERDUE') {
                        statusFinal = 'vencida'; // Está atrasado
                    } else {
                        statusFinal = 'pendente'; // Ainda vai vencer
                    }

                    return {
                        id: c.id, 
                        date: c.dueDate, 
                        description: c.description || 'Mensalidade',
                        category: 'Mensalidade', 
                        value: c.value, 
                        type: 'Receita',
                        status: statusFinal
                    };
                });
            }
        } catch (e) { 
            console.log("Aviso: Erro ao buscar do Asaas.", e.message); 
        }

        // --- LÓGICA DAS TRANSAÇÕES MANUAIS (BANCO) ---
        const transacoesBanco = await Transacao.findAll({ where: { ativo: true } });
        
        const itensBanco = transacoesBanco.map(t => {
            // Se foi lançado manualmente (Dinheiro/Pix na mão), consideramos como 'pago'
            // Se você quiser lançar dívida manual pendente, precisaria de um campo 'status' no banco
            return {
                id: t.id, 
                date: t.data, 
                description: t.descricao, 
                category: t.categoria,
                value: parseFloat(t.valor), 
                type: parseFloat(t.valor) >= 0 ? 'Receita' : 'Despesa',
                status: 'pago' // Mudamos de 'ativo' para 'pago' para não confundir
            };
        });

        // Junta tudo e ordena
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
// Rota para Situação Financeira (Versão Blindada contra Erros)
// Rota para Situação Financeira (Versão Blindada contra Erros)
// Rota Inteligente: Consulta Status e Corrige IDs errados sozinho
// Rota para Situação Financeira (Versão Blindada contra Erros)
router.get('/alunos-status', async (req, res) => {
    try {
        const alunos = await Aluno.findAll({
            include: [{ model: Responsavel, as: 'responsavel' }]
        });

        const relatorio = await Promise.all(alunos.map(async (aluno) => {
            let status = 'Em dia';
            let cor = 'green';
            
            // Verifica se tem responsável e se tem o ID do Asaas
            const idAsaas = aluno.responsavel ? aluno.responsavel.asaasCustomerId : null;

            if (idAsaas) {
                // SÓ ENTRA AQUI SE TIVER ID REAL
                try {
                    const cobrancas = await asaasService.listarCobrancasPorCliente(idAsaas);
                    const temAtraso = cobrancas.some(c => c.status === 'OVERDUE');
                    
                    if (temAtraso) {
                        status = 'Inadimplente';
                        cor = 'red';
                    }
                } catch (err) {
                    // Se der erro de conexão, avisa, mas não trava
                    console.error(`Erro de conexão Asaas para ${aluno.nome}:`, err.message);
                    status = 'Cadastrado no Asaas';
                    cor = 'gray';
                }
            } else {
                // Se não tem ID, cai aqui direto (sem dar erro vermelho no terminal)
                status = 'Sem Cadastro Asaas';
                cor = 'yellow';
            }

            return {
                id: aluno.id,
                nome: aluno.nomeCrianca || aluno.nome,
                responsavel: aluno.responsavel ? aluno.responsavel.nome : 'Sem Responsável',
                telefone: aluno.responsavel ? (aluno.responsavel.mobilePhone || aluno.responsavel.telefone) : '-',
                status: status,
                cor: cor
            };
        }));

        res.json(relatorio);

    } catch (error) {
        console.error("ERRO GERAL na rota /alunos-status:", error);
        res.status(500).json({ message: "Erro interno ao buscar status." });
    }
});

// --- FUNÇÕES AJUDANTES (Cole isso logo abaixo da rota, ou antes dela) ---

function montarObjeto(aluno, status, cor) {
    return {
        id: aluno.id,
        nome: aluno.nomeCrianca || aluno.nome,
        responsavel: aluno.responsavel ? aluno.responsavel.nome : 'Sem Resp.',
        telefone: aluno.responsavel ? (aluno.responsavel.mobilePhone || aluno.responsavel.telefone) : '-',
        status: status,
        cor: cor
    };
}

async function buscarPorCpfNoAsaas(cpf) {
    try {
        // Usa a API direta para buscar por CPF
        const response = await asaasAPI.get('/customers', {
            params: { cpfCnpj: cpf }
        });
        if (response.data.data && response.data.data.length > 0) {
            return response.data.data[0]; // Retorna o cliente achado
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Rota para o Dashboard (Resumo Financeiro do Mês)
// Rota para o Dashboard (Resumo Financeiro do Mês)
// =================================================================
// 4. ROTA DO DASHBOARD (COM PROTEÇÃO CONTRA FALHAS)
// =================================================================
router.get('/dashboard-resumo', async (req, res) => {
    console.log(">>> Calculando Dashboard...");
    try {
        const hoje = new Date();
        // Pega o primeiro dia do mês atual (Ex: 2023-11-01)
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];

        // 1. Tenta somar RECEITAS DO ASAAS (Se falhar, considera 0)
        let totalAsaas = 0;
        try {
            // Busca apenas pagamentos CONFIRMADOS/RECEBIDOS deste mês
            const cobrancas = await asaasService.listarCobrancas({ 
                status: 'RECEIVED', 
                datePaymentAfter: inicioMes 
            });
            
            if (cobrancas && Array.isArray(cobrancas)) {
                totalAsaas = cobrancas.reduce((acc, c) => acc + c.value, 0);
            }
        } catch (e) {
            console.log("Aviso: Não foi possível somar Asaas (ou não tem dados).", e.message);
        }

        // 2. Soma o BANCO DE DADOS (Manual)
        const transacoes = await Transacao.findAll({ where: { ativo: true } });
        let totalManuais = 0; 
        let totalDespesas = 0;

        transacoes.forEach(t => {
            // Filtra só o mês atual (opcional, se quiser geral tire o if)
            if (t.data >= inicioMes) {
                const val = parseFloat(t.valor);
                if (val >= 0) {
                    totalManuais += val; // Receita Manual
                } else {
                    totalDespesas += val; // Despesa (já é negativo)
                }
            }
        });

        // 3. Calcula o Final
        const totalReceitas = totalAsaas + totalManuais;
        const saldoFinal = totalReceitas + totalDespesas; // Despesa é negativa, então soma subtraindo

        console.log(`>>> RESUMO: Receitas: ${totalReceitas} | Despesas: ${totalDespesas} | Saldo: ${saldoFinal}`);

        res.json({
            saldo: saldoFinal,
            receitas: totalReceitas,
            despesas: totalDespesas
        });

    } catch (error) {
        console.error("Erro fatal no dashboard:", error);
        // Em último caso, retorna tudo zero para não quebrar a tela
        res.json({ saldo: 0, receitas: 0, despesas: 0 });
    }
});

// Rota para Forçar Sincronização do Responsável com Asaas
router.post('/responsavel/:id/sincronizar', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Busca o Responsável no seu banco
        const responsavel = await Responsavel.findByPk(id);
        if (!responsavel) {
            return res.status(404).json({ message: 'Responsável não encontrado.' });
        }

        console.log(`>>> Tentando sincronizar CPF: ${responsavel.cpf}`);

        // 2. Pergunta pro Asaas: "Vocês tem alguém com esse CPF?"
        // Nota: O método listarClientes precisa aceitar filtro por cpfCnpj
        // Se seu asaasService não tiver isso, vamos usar o axios direto aqui pra garantir
        const response = await asaasAPI.get('/customers', {
            params: { cpfCnpj: responsavel.cpf }
        });

        let novoIdAsaas = null;

        // CENÁRIO A: O cara já existe no Asaas (Recupera o ID)
        if (response.data.data && response.data.data.length > 0) {
            novoIdAsaas = response.data.data[0].id;
            console.log(`>>> Encontrado no Asaas! ID recuperado: ${novoIdAsaas}`);
        } 
        // CENÁRIO B: Não existe (Cria um novo)
        else {
            console.log(">>> Não encontrado no Asaas. Criando novo...");
            const novoCliente = await asaasService.criarCliente({
                name: responsavel.nome,
                cpfCnpj: responsavel.cpf,
                email: responsavel.email,
                mobilePhone: responsavel.telefone || responsavel.mobilePhone
            });
            novoIdAsaas = novoCliente.id;
        }

        // 3. Salva o ID correto no seu banco (A AUTO-CORREÇÃO)
        await responsavel.update({ asaasCustomerId: novoIdAsaas });

        res.json({ message: 'Sincronizado com sucesso!', asaasId: novoIdAsaas });

    } catch (error) {
        console.error("Erro ao sincronizar:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Erro ao tentar sincronizar." });
    }
});

// =================================================================
// 🕵️ ROTA DE EXCLUSÃO - MODO DETETIVE (DEBUG)
// =================================================================
// =================================================================
// ROTA DELETE "METRALHADORA" (Tenta todos os nomes de tabela possíveis)
// =================================================================
// =================================================================
// ROTA DELETE DEBUG (VAI MOSTRAR O ERRO REAL NA TELA)
// =================================================================
// =================================================================
// ROTA DE EXCLUSÃO (TENTATIVA CORRIGIDA)
// =================================================================
// =================================================================
// ROTA EXCLUSIVA: ARQUIVAR APENAS DESPESAS (BANCO DE DADOS)
// =================================================================
router.delete('/transacoes/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`>>> Arquivando Despesa ID: ${id}`);

    try {
        // Validação: Se não for número, nem tenta (porque despesa tem ID numérico)
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ 
                message: "Este item não é uma despesa do banco (ID inválido)." 
            });
        }

        const idInt = parseInt(id);

        // Vai direto na tabela 'Transacaos' e desativa
        const { error } = await supabase
            .from('Transacaos') // Nome exato que vimos na sua foto
            .update({ ativo: false })
            .eq('id', idInt);

        if (error) {
            console.error("Erro Supabase:", error);
            return res.status(500).json({ message: "Erro no banco: " + error.message });
        }

        return res.json({ message: 'Despesa arquivada com sucesso!' });

    } catch (error) {
        console.error("Erro:", error);
        res.status(500).json({ message: "Erro interno." });
    }
});
// ... (o restante do seu arquivo routes/api.js)
export default router;