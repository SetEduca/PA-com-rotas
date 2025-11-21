import axios from 'axios';
import 'dotenv/config';


console.log(">>> AMBIENTE ASAAS:", process.env.ASAAS_API_URL);
// Mostra só os 10 primeiros caracteres da chave para conferir se é a certa
console.log(">>> CHAVE USADA:", process.env.ASAAS_API_KEY ? process.env.ASAAS_API_KEY.substring(0, 10) + "..." : "SEM CHAVE");
// ----------------------------------------------------------

const asaasAPI = axios.create({
    // Forçando a URL de produção direto aqui:
    baseURL: 'https://www.asaas.com/api/v3', 
    headers: { 'access_token': process.env.ASAAS_API_KEY }
});

export default asaasAPI; // ou export { ... } dependendo do seu arquivo

// Troca "module.exports" por "export"
export const getClientes = async () => {
    try {
        const response = await asaasAPI.get('/customers');
        return response.data.data;
    } catch (error) { 
        console.error("Erro no Asaas (getClientes):", error.message);
        return []; 
    }
};

export const getCobrancas = async () => {
    try {
        const response = await asaasAPI.get('/payments');
        return response.data.data;
    } catch (error) { 
        console.error("Erro no Asaas (getCobrancas):", error.message);
        return []; 
    }
};

export const criarCobranca = async (dadosCobranca) => {
    try {
        const response = await asaasAPI.post('/payments', dadosCobranca);
        return response.data;
    } catch (error) { 
        console.error("Erro no Asaas (criarCobranca):", error.response?.data || error.message);
        throw error; 
    }
};

// ADICIONE ESTA NOVA FUNÇÃO:
export const criarCliente = async (dadosCliente) => {
    // O Asaas espera um objeto com: { name, cpfCnpj, email, mobilePhone, ... }
    try {
        console.log(">>> Enviando cliente para o Asaas:", dadosCliente);
        const response = await asaasAPI.post('/customers', dadosCliente);
        
        // Retorna o cliente criado (onde estará o ID 'cus_...')
        return response.data; 
    } catch (error) {
        console.error("Erro ao criar cliente no Asaas:", error.response?.data || error.message);
        // É importante lançar o erro para o seu sistema saber que falhou
        throw error;
    }
};