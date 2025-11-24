import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../supabase.js';

const router = express.Router();
const SALT_ROUNDS = 10;

// -------------------------------------------------------------------
// MIDDLEWARE DE AUTENTICAÇÃO
// -------------------------------------------------------------------
const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Usuário não autenticado.' });
    }
};

// -------------------------------------------------------------------
// ROTA PARA RENDERIZAR A PÁGINA DE PERFIL
// GET /meuperfil
// -------------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            console.log('❌ Usuário não autenticado, redirecionando para login');
            return res.redirect('/login');
        }

        const userId = req.session.userId;
        console.log(`🔍 Buscando dados do perfil para ID: ${userId}`);

        // 1. Buscar dados da creche - CORRIGIDO: nome_creche -> nome
        const { data: dadosCreche, error: errCreche } = await supabase
            .from('cadastro_creche')
            .select('id, nome, cnpj, email, url_foto') // Coluna 'nome'
            .eq('id', userId)
            .single();

        if (errCreche && errCreche.code !== 'PGRST116') {
            console.error('❌ Erro ao buscar dados da creche:', errCreche);
            return res.redirect('/login');
        }

        if (!dadosCreche) {
            console.error('❌ Creche não encontrada');
            return res.redirect('/login');
        }

        // CORRIGIDO: nome_creche -> nome
        console.log(`✅ Dados da creche encontrados: ${dadosCreche.nome}`); 

        // 2. Buscar endereço da creche
        const { data: dadosEndereco, error: errEndereco } = await supabase
            .from('endereco_creche')
            .select('cep, rua, numero, complemento, bairro, cidade, estado')
            .eq('cadastro_id', dadosCreche.id)
            .single();

        if (errEndereco && errEndereco.code !== 'PGRST116') {
            console.error('⚠️ Erro ao buscar endereço:', errEndereco);
        }

        console.log(`✅ Endereço ${dadosEndereco ? 'encontrado' : 'não cadastrado'}`);

        // Renderizar com estrutura correta para o EJS
        res.render('PERFIL/meuperfil', {
            perfil: {
                creche: {
                    id: dadosCreche.id,
                    nome: dadosCreche.nome, // CORRIGIDO
                    email: dadosCreche.email,
                    cnpj: dadosCreche.cnpj || '',
                    foto_url: dadosCreche.url_foto || null
                },
                endereco: dadosEndereco ? {
                    cep: dadosEndereco.cep || '',
                    rua: dadosEndereco.rua || '',
                    numero: dadosEndereco.numero || '',
                    complemento: dadosEndereco.complemento || '',
                    bairro: dadosEndereco.bairro || '',
                    cidade: dadosEndereco.cidade || '',
                    estado: dadosEndereco.estado || ''
                } : {
                    cep: '',
                    rua: '',
                    numero: '',
                    complemento: '',
                    bairro: '',
                    cidade: '',
                    estado: ''
                }
            }
        });

    } catch (error) {
        console.error('💥 Erro ao carregar perfil:', error);
        res.redirect('/login');
    }
});

// -------------------------------------------------------------------
// ROTA: BUSCAR INFORMAÇÕES COMPLETAS (GET)
// GET /meuperfil/dados-cadastro
// -------------------------------------------------------------------
router.get('/dados-cadastro', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        const { data, error } = await supabase
            .from('cadastro_creche')
            .select('id, nome, cnpj, email, url_foto') // CORRIGIDO: nome_creche -> nome
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({ error: 'Creche não encontrada.' });
        }

        // Retornar com o nome correto
        res.json({ 
            creche: {
                id: data.id,
                nome: data.nome, // CORRIGIDO: nome_creche -> nome
                cnpj: data.cnpj,
                email: data.email,
                url_foto: data.url_foto
            }
        });

    } catch (e) {
        console.error('Erro ao buscar dados de cadastro:', e.message);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar dados de cadastro.' });
    }
});

// -------------------------------------------------------------------
// ROTA 1: ATUALIZAR INFORMAÇÕES BÁSICAS (Nome, Email)
// PUT /meuperfil/info
// -------------------------------------------------------------------
router.put('/info', ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const { nome, email } = req.body;

    if (!nome || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    try {
        const { data, error } = await supabase
            .from('cadastro_creche')
            .update({ nome: nome, email: email }) // CORRIGIDO: nome_creche -> nome
            .eq('id', userId)
            .select();

        if (error) {
            if (error.code === '23505') { 
                return res.status(409).json({ error: 'Este e-mail já está em uso por outra conta.' });
            }
            throw error;
        }

        if (data.length === 0) {
            return res.status(404).json({ error: 'Creche não encontrada.' });
        }

        res.json({ 
            message: 'Informações básicas atualizadas com sucesso!', 
            creche: {
                id: data[0].id,
                nome: data[0].nome, // CORRIGIDO: nome_creche -> nome
                email: data[0].email,
                cnpj: data[0].cnpj,
                url_foto: data[0].url_foto
            }
        });

    } catch (e) {
        console.error('Erro ao atualizar informações:', e.message);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar informações.' });
    }
});

// -------------------------------------------------------------------
// ROTA 2: ALTERAR SENHA (SEGURA COM BCRYPT)
// PUT /meuperfil/senha
// -------------------------------------------------------------------
router.put('/senha', ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    // CORRIGIDO: Mudar para senhaAntiga e senhaNova para bater com o frontend
    const { senhaAntiga, senhaNova } = req.body; 

    if (!senhaAntiga || !senhaNova || senhaNova.length < 8) {
        return res.status(400).json({ error: 'Senha atual e nova senha (mínimo 8 caracteres) são obrigatórias.' });
    }

    try {
        // 1. Buscar o hash da senha atual
        let { data, error } = await supabase
            .from('cadastro_creche')
            .select('senha')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        
        const storedHash = data.senha;

        // 2. Comparar a senha atual com o hash armazenado
        // CORRIGIDO: Usar a variável do frontend
        const isMatch = await bcrypt.compare(senhaAntiga, storedHash); 

        if (!isMatch) {
            return res.status(401).json({ error: 'Senha atual incorreta.' });
        }

        // 3. Gerar o novo hash e atualizar
        const newHash = await bcrypt.hash(senhaNova, SALT_ROUNDS); // CORRIGIDO: Usar a variável do frontend

        const { error: updateError } = await supabase
            .from('cadastro_creche')
            .update({ senha: newHash })
            .eq('id', userId);

        if (updateError) throw updateError;

        res.json({ message: 'Senha atualizada com sucesso.' });

    } catch (e) {
        console.error('Erro ao alterar senha:', e.message);
        res.status(500).json({ error: 'Erro interno do servidor ao alterar senha.' });
    }
});

// -------------------------------------------------------------------
// ROTA 3: ATUALIZAR ENDEREÇO (UPSERT)
// PUT /meuperfil/endereco
// -------------------------------------------------------------------
router.put('/endereco', ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    // Mantendo número, complemento e estado no backend, mas relaxando a validação de acordo com o frontend
    const { cep, logradouro, bairro, localidade } = req.body; 
    
    // CORRIGIDO: Validação relaxada (removendo numero e estado)
    if (!cep || !logradouro || !bairro || !localidade) {
        return res.status(400).json({ error: 'CEP, Logradouro, Bairro e Cidade são obrigatórios.' });
    }
    
    const cepLimpo = cep.replace(/\D/g, '').substring(0, 8); 

    try {
        const addressData = {
            cadastro_id: userId,
            rua: logradouro,
            // Valores que podem não vir do frontend
            numero: req.body.numero || null, 
            complemento: req.body.complemento || null,
            bairro: bairro,
            cidade: localidade,
            estado: req.body.uf || 'XX', // Usando 'XX' como placeholder se UF não for fornecido
            cep: cepLimpo
        };

        const { data, error } = await supabase
            .from('endereco_creche')
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
