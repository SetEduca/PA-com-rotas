const express = require('express');
const path = require('path');
const multer = require('multer'); // Importa o multer
const fs = require('fs'); // Importa o módulo de sistema de arquivos do Node

const app = express();
const PORT = 3020;

// --- Configuração do Multer para Upload de Arquivos ---

// Cria a pasta 'public/uploads' se ela não existir
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define como os arquivos serão armazenados
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); // Onde salvar os arquivos
    },
    filename: function (req, file, cb) {
        // Cria um nome de arquivo único para evitar conflitos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'creche-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
    // Aceita apenas arquivos de imagem
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Aceita o arquivo
    } else {
        cb(new Error('Tipo de arquivo não suportado! Apenas imagens são permitidas.'), false); // Rejeita o arquivo
    }
};

// Inicializa o multer com as configurações
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // Limite de 5MB por arquivo
});

// --- Fim da Configuração do Multer ---

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let usuariosCadastrados = [];

// Rota GET para /
app.get('/', (req, res) => {
    res.redirect('/cadastro');
});

// Rota GET para /cadastro
app.get('/cadastro', (req, res) => {
    res.render('cadastro', { 
        title: 'Cadastro de Creche',
        error: null, 
        dados: {} 
    });
});

// Rota POST para /cadastro - COM UPLOAD DE FOTO
app.post('/cadastro', upload.single('foto_creche'), (req, res) => {
    const dados = req.body;
    
    console.log('Dados recebidos:', dados);
    console.log('Arquivo recebido:', req.file);
    
    // Validações básicas
    const camposObrigatorios = ['nome_creche', 'cnpj', 'telefone', 'cep', 'rua', 'bairro', 'cidade', 'email', 'senha', 'confirmar_senha'];
    
    for (let campo of camposObrigatorios) {
        if (!dados[campo] || dados[campo].trim() === '') {
            return res.render('cadastro', { 
                title: 'Erro no Cadastro', 
                error: `O campo ${campo.replace('_', ' ')} é obrigatório.`, 
                dados: dados 
            });
        }
    }

    // Validação de senha
    if (dados.senha !== dados.confirmar_senha) {
        return res.render('cadastro', { 
            title: 'Erro no Cadastro', 
            error: 'As senhas não coincidem.', 
            dados: dados 
        });
    }

    // Validação de senha mínima (opcional)
    if (dados.senha.length < 6) {
        return res.render('cadastro', { 
            title: 'Erro no Cadastro', 
            error: 'A senha deve ter no mínimo 6 caracteres.', 
            dados: dados 
        });
    }

    // Validação de email duplicado
    const emailExiste = usuariosCadastrados.find(usuario => 
        usuario.email.toLowerCase() === dados.email.trim().toLowerCase()
    );
    
    if (emailExiste) {
        return res.render('cadastro', { 
            title: 'Erro no Cadastro', 
            error: 'Este email já está cadastrado. Use outro email.', 
            dados: dados 
        });
    }

    // Validação de CNPJ duplicado (opcional)
    const cnpjExiste = usuariosCadastrados.find(usuario => 
        usuario.cnpj === dados.cnpj.trim()
    );
    
    if (cnpjExiste) {
        return res.render('cadastro', { 
            title: 'Erro no Cadastro', 
            error: 'Este CNPJ/CPF já está cadastrado.', 
            dados: dados 
        });
    }
    
    // Se todas as validações passaram, criar o novo usuário
    const novoUsuario = {
        id: usuariosCadastrados.length + 1,
        nome_creche: dados.nome_creche.trim(),
        cnpj: dados.cnpj.trim(),
        telefone: dados.telefone.trim(),
        cep: dados.cep.trim(),
        rua: dados.rua.trim(),
        bairro: dados.bairro.trim(),
        cidade: dados.cidade.trim(),
        email: dados.email.trim().toLowerCase(),
        senha: dados.senha,
        // Salva o caminho do arquivo no usuário, se um arquivo foi enviado
        foto_path: req.file ? `/uploads/${req.file.filename}` : null,
        foto_original_name: req.file ? req.file.originalname : null,
        dataCadastro: new Date().toISOString()
    };
    
    usuariosCadastrados.push(novoUsuario);
    
    console.log('✅ Novo usuário cadastrado:', {
        id: novoUsuario.id,
        nome: novoUsuario.nome_creche,
        email: novoUsuario.email,
        foto: novoUsuario.foto_path ? 'Sim' : 'Não',
        data: novoUsuario.dataCadastro
    });
    
    res.redirect('/login?status=success');
});

// Middleware para tratamento de erros do multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.render('cadastro', { 
                title: 'Erro no Upload', 
                error: 'Arquivo muito grande! O tamanho máximo é 5MB.', 
                dados: req.body 
            });
        }
    }
    
    if (error.message === 'Tipo de arquivo não suportado! Apenas imagens são permitidas.') {
        return res.render('cadastro', { 
            title: 'Erro no Upload', 
            error: error.message, 
            dados: req.body 
        });
    }
    
    next(error);
});

// Rotas de login removidas - implementar no arquivo login.ejs separadamente

// Rota para listar usuários cadastrados (para teste)
app.get('/usuarios', (req, res) => {
    res.json({
        total: usuariosCadastrados.length,
        usuarios: usuariosCadastrados.map(user => ({
            id: user.id,
            nome_creche: user.nome_creche,
            email: user.email,
            cnpj: user.cnpj,
            cidade: user.cidade,
            tem_foto: !!user.foto_path,
            data_cadastro: user.dataCadastro
        }))
    });
});

// Rota para visualizar foto de um usuário específico
app.get('/usuario/:id/foto', (req, res) => {
    const usuario = usuariosCadastrados.find(user => user.id == req.params.id);
    
    if (!usuario || !usuario.foto_path) {
        return res.status(404).send('Foto não encontrada');
    }
    
    const fotoPath = path.join(__dirname, 'public', usuario.foto_path);
    
    if (fs.existsSync(fotoPath)) {
        res.sendFile(fotoPath);
    } else {
        res.status(404).send('Arquivo de foto não encontrado no servidor');
    }
});

// Inicializar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📝 Acesse: http://localhost:${PORT}`);
    console.log(`👥 Usuários: http://localhost:${PORT}/usuarios`);
    console.log(`📁 Pasta de uploads: ${uploadDir}`);
});

module.exports = app;