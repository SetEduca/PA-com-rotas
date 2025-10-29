// perfil.routes.js

// Certifique-se de que os caminhos de importação estão corretos em relação ao seu arquivo app.js
import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../supabase.js'; // Ajuste o caminho conforme a localização do seu supabase.js

const router = express.Router();
const SALT_ROUNDS = 10; // Fator de segurança do bcrypt

// -------------------------------------------------------------------
// MIDDLEWARE DE AUTENTICAÇÃO (MOCK)
// Em um sistema real, esta função deve validar um token JWT ou sessão.
// -------------------------------------------------------------------
const ensureAuthenticated = (req, res, next) => {
    // Para fins de modularidade e teste, usamos o ID do parâmetro da rota.
    const crecheId = req.params.id; 
    if (crecheId && !isNaN(parseInt(crecheId))) {
        // ID da creche logada, usado nas queries
        req.crecheId = parseInt(crecheId); 
        next();
    } else {
        // 403 - Forbidden
        res.status(403).json({ error: 'Acesso negado. ID da creche ausente ou inválido.' });
    }
};


// -------------------------------------------------------------------
// ROTAS DE API PARA SALVAMENTO
// Estas rotas devem ser montadas em '/api/perfil' no seu app.js.
// Exemplo: app.use('/api/perfil', perfilRouter);
// -------------------------------------------------------------------

// ROTA 1: ATUALIZAR INFORMAÇÕES BÁSICAS (Nome, Email)
// PUT /api/perfil/:id/info
router.put('/:id/info', ensureAuthenticated, async (req, res) => {
    const crecheId = req.params.id;
    const { nome, email } = req.body;

    if (!nome || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    try {
        const { data, error } = await supabase
            .from('CADASTRO_CRECHE')
            .update({ nome: nome, email: email })
            .eq('id', crecheId)
            .select();

        if (error) {
            // Verifica violação de restrição única (ex: e-mail duplicado - código 23505 no Postgres)
            if (error.code === '23505') { 
                return res.status(409).json({ error: 'Este e-mail já está em uso por outra conta.' });
            }
            throw error;
        }

        if (data.length === 0) {
            return res.status(404).json({ error: 'Creche não encontrada.' });
        }

        res.json({ message: 'Informações básicas atualizadas com sucesso!', creche: data[0] });

    } catch (e) {
        console.error('Erro ao atualizar informações:', e.message);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar informações.' });
    }
});


// ROTA 2: ALTERAR SENHA (SEGURA COM BCRYPT)
// PUT /api/perfil/:id/senha
router.put('/:id/senha', ensureAuthenticated, async (req, res) => {
    const crecheId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Senha atual e nova senha (mínimo 8 caracteres) são obrigatórias.' });
    }

    try {
        // 1. Buscar o hash da senha atual
        let { data, error } = await supabase
            .from('CADASTRO_CRECHE')
            .select('senha')
            .eq('id', crecheId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        
        const storedHash = data.senha;

        // 2. Comparar a senha atual (do formulário) com o hash armazenado
        const isMatch = await bcrypt.compare(currentPassword, storedHash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Senha atual incorreta.' }); // 401 - Unauthorized
        }

        // 3. Gerar o novo hash e atualizar
        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        const { error: updateError } = await supabase
            .from('CADASTRO_CRECHE')
            .update({ senha: newHash })
            .eq('id', crecheId);

        if (updateError) throw updateError;

        res.json({ message: 'Senha atualizada com sucesso.' });

    } catch (e) {
        console.error('Erro ao alterar senha:', e.message);
        res.status(500).json({ error: 'Erro interno do servidor ao alterar senha.' });
    }
});


// ROTA 3: ATUALIZAR ENDEREÇO (UPSERT)
// PUT /api/perfil/:id/endereco
router.put('/:id/endereco', ensureAuthenticated, async (req, res) => {
    const crecheId = req.params.id;
    const { cep, logradouro, numero, complemento, bairro, localidade, uf } = req.body;
    
    if (!cep || !logradouro || !numero || !localidade || !uf) {
        return res.status(400).json({ error: 'CEP, Logradouro, Número, Cidade e Estado são obrigatórios.' });
    }
    
    // Limpa o CEP para VARCHAR(8)
    const cepLimpo = cep.replace(/\D/g, '').substring(0, 8); 

    try {
        const addressData = {
            cadastro_id: crecheId, // Chave única para o UPSERT
            rua: logradouro,
            numero: numero,
            complemento: complemento || null,
            bairro: bairro,
            cidade: localidade,
            estado: uf,
            cep: cepLimpo
        };

        // Usa o método upsert do Supabase, que resolve o conflito na coluna 'cadastro_id'
        const { data, error } = await supabase
            .from('ENDERECO_CRECHE')
            .upsert(addressData, { onConflict: 'cadastro_id' })
            .select();

        if (error) throw error;

        res.json({ message: 'Endereço salvo com sucesso!', endereco: data[0] });

    } catch (e) {
        console.error('Erro ao atualizar endereço:', e.message);
        res.status(500).json({ error: 'Erro interno do servidor ao salvar endereço.' });
    }
});

export default router;