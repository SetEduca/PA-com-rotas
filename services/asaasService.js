import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';
const API_KEY = process.env.ASAAS_API_KEY;

// Configuração do Axios
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'access_token': API_KEY,
        'Content-Type': 'application/json'
    }
});

// ============================================================
// 1. LISTAR COBRANÇAS (Para o Dashboard e Tabela Geral)
// ============================================================
export const listarCobrancas = async (filtros = {}) => {
    try {
        // Filtros podem ser: { status: 'RECEIVED', datePaymentAfter: '2023-01-01' }
        const response = await api.get('/payments', { params: filtros });
        return response.data.data;
    } catch (error) {
        console.error("Erro ao listar cobranças no Asaas:", error.message);
        throw error;
    }
};

// Atalho para 'getCobrancas' (já que usamos esse nome em alguns lugares)
export const getCobrancas = async () => {
    return await listarCobrancas({ limit: 50 });
};

// ============================================================
// 2. LISTAR POR CLIENTE (Para ver se o aluno está devendo)
// ============================================================
export const listarCobrancasPorCliente = async (clienteId) => {
    try {
        const response = await api.get('/payments', {
            params: { customer: clienteId }
        });
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

// ============================================================
// 3. CRIAR COBRANÇA (Boleto, Pix, etc)
// ============================================================
export const criarCobranca = async (dados) => {
    try {
        const response = await api.post('/payments', dados);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar cobrança:", error.response ? error.response.data : error.message);
        throw error;
    }
};

// ============================================================
// 4. CLIENTES (Criar e Buscar)
// ============================================================
export const criarCliente = async (dadosCliente) => {
    try {
        const response = await api.post('/customers', dadosCliente);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar cliente:", error.message);
        throw error;
    }
};

export const buscarClientePorCpf = async (cpf) => {
    try {
        const response = await api.get('/customers', { params: { cpfCnpj: cpf } });
        return response.data.data; // Retorna array
    } catch (error) {
        return [];
    }
};

// ============================================================
// 5. DELETAR / CANCELAR
// ============================================================
export const removerCobranca = async (idCobranca) => {
    try {
        const response = await api.delete(`/payments/${idCobranca}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Exporta tudo como um objeto padrão também (para garantir compatibilidade)
export default {
    listarCobrancas,
    getCobrancas,
    listarCobrancasPorCliente,
    criarCobranca,
    criarCliente,
    buscarClientePorCpf,
    removerCobranca
};