// Alterado de 'require' para 'import'
import axios from 'axios';
import 'dotenv/config'; // Forma ESM de carregar o .env

// Configura o "telefone" com o endereço e a senha já prontos
const asaasAPI = axios.create({
    baseURL: process.env.ASAAS_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
    }
});

/**
 * @description Busca todos os clientes (alunos) cadastrados no Asaas.
 * @returns {Promise<Array>} Lista de clientes.
 */
const getClientes = async () => {
    try {
        const response = await asaasAPI.get('/customers');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar clientes no Asaas:", error.response.data);
        return [];
    }
};

/**
 * @description Busca todas as cobranças (receitas) no Asaas.
 * @returns {Promise<Array>} Lista de cobranças.
 */
const getCobrancas = async () => {
    try {
        const response = await asaasAPI.get('/payments');
        return response.data.data;
    } catch (error) {
        console.error("Erro ao buscar cobranças no Asaas:", error.response.data);
        return [];
    }
};

/**
 * @description Cria uma nova cobrança (mensalidade) no Asaas.
 * @param {Object} dadosCobranca - Dados da cobrança a ser criada.
 * @returns {Promise<Object>} A cobrança criada.
 */
const criarCobranca = async (dadosCobranca) => {
    try {
        const response = await asaasAPI.post('/payments', dadosCobranca);
        return response.data;
    } catch (error) {
        console.error("Erro ao criar cobrança no Asaas:", error.response.data);
        throw error;
    }
};

// Alterado de 'module.exports' para 'export default'
export default {
    getClientes,
    getCobrancas,
    criarCobranca
};