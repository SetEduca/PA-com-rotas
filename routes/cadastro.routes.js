// routes/cadastro.routes.js

// Importa as bibliotecas necessárias
import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer'; // <-- ATIVADO
import supabase from '../supabase.js';

// Cria o roteador Express
const router = express.Router();
const saltRounds = 10;

// --- Configuração do Upload (Multer) --- // <-- ATIVADO
const storage = multer.memoryStorage(); // Armazena em memória
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => { // Aceita apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas imagens.'), false); // Rejeita outros tipos
        }
    }
});
// --- FIM Configuração Multer ---

// --- ROTA GET /cadastro ---
router.get("/", (req, res) => {
    try {
        res.render("CADASTRO/cadastro", { error: null, success: null });
    } catch (renderError) {
        console.error("Erro ao renderizar GET /cadastro:", renderError);
        res.status(500).send("Erro ao carregar a página.");
    }
});

// --- ROTA POST /cadastro ---
// AGORA USA O MIDDLEWARE DO MULTER: upload.single('foto_creche') // <-- ATIVADO
router.post("/", upload.single('foto_creche'), async (req, res) => {
    // Log para depuração
    console.log("---------- POST /cadastro (com Multer e Endereço/Tel) ----------");
    console.log("Recebido req.body:", req.body); // Campos de texto
    console.log("Recebido req.file:", req.file ? req.file.originalname : 'Nenhum arquivo'); // Arquivo

    // Verifica se req.body existe
    if (!req.body) {
        console.error("ERRO GRAVE: req.body está undefined após Multer!");
        // Retorna JSON pois o fetch espera JSON
        return res.status(500).json({ success: false, message: 'Erro interno ao processar formulário.' });
    }

    // Pega todos os campos esperados do formulário
    const {
        nome_creche,
        cnpj,
        email,
        senha,
        confirmar_senha,
        terms,
        telefone, // <-- ATIVADO
        cep,      // <-- ATIVADO
        rua,      // <-- ATIVADO
        bairro,   // <-- ATIVADO
        cidade    // <-- ATIVADO
    } = req.body;
    const fotoFile = req.file; // <-- ATIVADO: Pega o arquivo do Multer

    // --- Validações Essenciais ---
    // Adiciona validação para campos de endereço/telefone se forem obrigatórios
    if (!nome_creche || !cnpj || !email || !senha || !confirmar_senha || !terms ||
        !telefone || !cep || !rua || !bairro || !cidade /* || !fotoFile */ ) { // Adicione !fotoFile se a foto for obrigatória
        console.warn('Tentativa de cadastro com campos faltando.');
        let campoFaltando = !nome_creche?'Nome':!cnpj?'CNPJ':!email?'Email':!senha?'Senha':!confirmar_senha?'Conf Senha':!terms?'Termos':!telefone?'Telefone':!cep?'CEP':!rua?'Rua':!bairro?'Bairro':!cidade?'Cidade':/* !fotoFile?'Foto': */'Campo';
        // Retorna JSON pois o fetch espera JSON
        return res.status(400).json({ success: false, message: `O campo "${campoFaltando}" é obrigatório.` });
    }
    if (senha !== confirmar_senha) {
        // Retorna JSON pois o fetch espera JSON
        return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
    }
    // TODO: Validar força da senha

    try {
        // 1. Verificar e-mail (igual antes)
        const { data: existingUser, error: checkError } = await supabase
            .from('cadastro_creche').select('email').eq('email', email).maybeSingle();
        if (checkError) throw checkError;
        if (existingUser) {
            // Retorna JSON pois o fetch espera JSON
            return res.status(409).json({ success: false, message: 'Este e-mail já está cadastrado.' });
        }

        // 2. Hash da Senha (igual antes)
        const hashedSenha = await bcrypt.hash(senha, saltRounds);

        // 3. Inserir na 'cadastro_creche' (igual antes)
        const { data: newUser, error: userError } = await supabase
            .from('cadastro_creche')
            .insert({ nome: nome_creche, cnpj: cnpj.replace(/\D/g, ''), email: email, senha: hashedSenha })
            .select('id').single();
        if (userError) throw userError;
        if (!newUser || !newUser.id) throw new Error('Falha ao obter ID do usuário.');
        const userId = newUser.id;
        console.log(`Usuário inserido (ID: ${userId})`);

        // --- Inserções Endereço e Telefone --- // <-- ATIVADO
        console.log("Tentando inserir endereço e telefone...");
        // Garante que temos os dados necessários antes de tentar inserir
        if (telefone && cep && rua && bairro && cidade) {
            const [enderecoResult, telResult] = await Promise.all([
                supabase.from('endereco_creche').insert({ // VERIFIQUE NOME DA TABELA
                    rua: rua,
                    bairro: bairro,
                    cidade: cidade,
                    cep: cep.replace(/\D/g, ''), // VERIFIQUE NOME DA COLUNA (cepa ou cep)
                    cadastro_id: userId   // VERIFIQUE NOME DA COLUNA FK
                    // Adicione numero, complemento, estado se tiver no form/tabela
                }),
                supabase.from('tel_creche').insert({ // VERIFIQUE NOME DA TABELA
                    ddd: telefone.replace(/\D/g, '').substring(0, 2),
                    numero: telefone.replace(/\D/g, '').substring(2), // VERIFIQUE NOME DA COLUNA (número ou numero)
                    cadastro_id: userId                    // VERIFIQUE NOME DA COLUNA FK
                })
            ]);
            // Verifica erros nas inserções paralelas
            if (enderecoResult.error) {
                 console.error("Erro ao inserir endereço:", enderecoResult.error);
                 throw new Error(`Falha ao salvar endereço: ${enderecoResult.error.message}`);
            }
            if (telResult.error) {
                 console.error("Erro ao inserir telefone:", telResult.error);
                 throw new Error(`Falha ao salvar telefone: ${telResult.error.message}`);
            }
            console.log("Endereço e telefone inseridos com sucesso.");
        } else {
             // Lança um erro se os campos eram esperados mas não vieram (ajuste conforme sua lógica de obrigatoriedade)
             // throw new Error("Dados de endereço/telefone ausentes ou inválidos.");
             console.warn("Dados de endereço/telefone incompletos, não foram salvos."); // Ou apenas avisa
        }
        // --- FIM Inserções Endereço/Telefone ---

// --- Upload da Foto --- // <-- ATIVADO
        let fotoUrlPublica = null;
        if (fotoFile) {
            console.log(`Tentando upload da foto: ${fotoFile.originalname}`);
            try {
                const BUCKET_NAME = 'fotos-creche'; // Bucket público no Supabase Storage
                const fileExtension = fotoFile.originalname.split('.').pop();
                const filePath = `public/${userId}-${Date.now()}.${fileExtension}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(filePath, fotoFile.buffer, {
                        contentType: fotoFile.mimetype,
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Erro no upload para Supabase Storage:", uploadError);
                    throw new Error(`Falha no upload da foto: ${uploadError.message}`);
                }

                const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
                fotoUrlPublica = urlData.publicUrl;
                console.log("Foto enviada com sucesso:", fotoUrlPublica);

                // --- ATIVADO: Salvar URL na tabela 'cadastro_creche' ---
                // CERTIFIQUE-SE que a coluna 'url_foto' (ou o nome que você usou)
                // existe na tabela 'cadastro_creche' e é do tipo TEXT ou VARCHAR.
                console.log(`Tentando salvar URL da foto no banco para userId: ${userId}`);
                const { error: updateFotoError } = await supabase
                    .from('cadastro_creche')
                    .update({ url_foto: fotoUrlPublica }) // <-- VERIFIQUE O NOME DA COLUNA AQUI
                    .eq('id', userId); // Garante que atualiza apenas o usuário correto

                if (updateFotoError) {
                    // Loga um aviso, mas não impede o cadastro principal
                    console.warn(`Aviso: Foto enviada para o Storage (${fotoUrlPublica}), mas ocorreu um erro ao salvar a URL na tabela 'cadastro_creche':`, updateFotoError.message);
                    // Possíveis causas: Coluna 'url_foto' não existe, erro de permissão no RLS da tabela.
                } else {
                     console.log("URL da foto salva com sucesso na tabela cadastro_creche.");
                }
                // --- FIM: Salvar URL ---

            } catch (storageError) {
                console.warn("Aviso: Erro durante o processo de upload da foto:", storageError.message);
                // Não impede cadastro principal, mas avisa
            }
        } else {
             console.log("Nenhuma foto enviada.");
             // Adicione aqui se a foto for obrigatória: throw new Error("A foto é obrigatória.");
        }
        // --- FIM Upload da Foto ---

        // ... (resto do código: Cadastro Concluído, catch, etc.)

        // 7. Cadastro Concluído! Retorna sucesso para o fetch.
        console.log(`Cadastro concluído para ${email}. Foto URL: ${fotoUrlPublica || 'Nenhuma'}`);
        res.status(201).json({ success: true, message: 'Cadastro realizado com sucesso!' });

    } catch (error) { // Bloco de captura de erros gerais
        console.error("Erro detalhado no POST /cadastro:", error);
        let userMessage = error.message || 'Ocorreu um erro inesperado durante o cadastro.'; // Usa a msg do erro se disponível
        // Tenta ser mais específico para erros conhecidos
        if (error.code === '23505' && error.message.includes('email')) userMessage = 'E-mail já cadastrado.';
        if (error.code === '23505' && error.message.includes('cnpj')) userMessage = 'CNPJ/CPF já cadastrado.';
        // Retorna erro como JSON para o fetch
        res.status(500).json({ success: false, message: userMessage });
    }
});

// --- Middleware de tratamento de erro do Multer --- // <-- ATIVADO
router.use((err, req, res, next) => {
    // Captura erros do Multer (ex: tamanho, tipo de arquivo inválido)
    if (err instanceof multer.MulterError || (err && err.message.includes('Formato inválido'))) {
        console.warn("Erro de Upload (Multer Middleware):", err.message);
        // Retorna o erro como JSON para o fetch do frontend
        res.status(400).json({ success: false, message: `Erro no upload: ${err.message}` });
    } else if (err) {
        // Captura outros erros inesperados que podem ocorrer antes da rota principal
        console.error("Erro inesperado antes da rota de cadastro:", err);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    } else {
        // Se não houve erro, continua para a próxima etapa (a rota POST principal)
        next();
    }
});
// --- FIM Middleware Multer ---

export default router;