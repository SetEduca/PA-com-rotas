// test/cadastro.routes.test.js
// TESTE COM MÓDULOS ES (import/export)

import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';
import fs from 'fs';

// Criar __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CRIAR ARQUIVOS DE TESTE SE NÃO EXISTIREM
// ==========================================
const testAssetsDir = path.resolve(__dirname, 'test_assets');
const imagePath = path.join(testAssetsDir, 'test-image.png');
const textPath = path.join(testAssetsDir, 'fake-file.txt');

// Criar diretório se não existir
if (!fs.existsSync(testAssetsDir)) {
    fs.mkdirSync(testAssetsDir, { recursive: true });
}

// Criar imagem PNG válida (1x1 pixel transparente)
if (!fs.existsSync(imagePath)) {
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(imagePath, pngBuffer);
}

// Criar arquivo de texto
if (!fs.existsSync(textPath)) {
    fs.writeFileSync(textPath, 'Este é um arquivo de texto, não uma imagem.');
}

// ==========================================
// CONFIGURAÇÃO DOS MOCKS
// ==========================================

// Mock do Nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'fake-message-id' });
const mockTransporter = { sendMail: mockSendMail };

jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransport: jest.fn(() => mockTransporter)
    }
}));

// Mock do Bcrypt
jest.unstable_mockModule('bcrypt', () => ({
    default: {
        hash: jest.fn().mockResolvedValue('senha_hasheada_mock')
    }
}));

// Mock do Supabase com todas as operações
const mockSupabase = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    insert: jest.fn(),
    single: jest.fn(),
    update: jest.fn(),
    storage: {
        from: jest.fn(),
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
    },
};

// Configurar chain methods
mockSupabase.from.mockReturnValue(mockSupabase);
mockSupabase.select.mockReturnValue(mockSupabase);
mockSupabase.eq.mockReturnValue(mockSupabase);
mockSupabase.insert.mockReturnValue(mockSupabase);
mockSupabase.update.mockReturnValue(mockSupabase);
mockSupabase.storage.from.mockReturnValue(mockSupabase.storage);

jest.unstable_mockModule('../supabase.js', () => ({
    default: mockSupabase
}));

// ==========================================
// IMPORTAR MÓDULOS (após mocks)
// ==========================================
const { default: cadastroRouter } = await import('../routes/cadastro.routes.js');

// ==========================================
// CONFIGURAR APP EXPRESS
// ==========================================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/cadastro', cadastroRouter);

// ==========================================
// TESTES
// ==========================================
describe('Testes da Rota /cadastro', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reconfigurar chains
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.storage.from.mockReturnValue(mockSupabase.storage);
    });

    // --- Teste para GET /cadastro ---
    describe('GET /cadastro', () => {
        test('deve falhar com 500 se o view engine não estiver configurado', async () => {
            const res = await request(app).get('/cadastro');
            expect(res.statusCode).toBe(500);
            expect(res.text).toBe("Erro ao carregar a página.");
        });
    });

    // --- Testes para POST /cadastro ---
    describe('POST /cadastro', () => {

        const cadastroData = {
            nome_creche: 'Creche Teste',
            cnpj: '12.345.678/0001-99',
            email: 'teste@creche.com',
            senha: 'senha123',
            confirmar_senha: 'senha123',
            terms: 'on',
            telefone: '11987654321',
            cep: '12345-678',
            rua: 'Rua dos Testes',
            bairro: 'Bairro Mock',
            cidade: 'Jest City'
        };

        test('deve cadastrar um novo usuário com sucesso (201) e enviar e-mail', async () => {
            // Configurar mocks de sucesso - ORDEM IMPORTA!
            
            // 1. Verificar se email existe (não existe)
            mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
            
            // 2. Inserir usuário e retornar ID
            mockSupabase.single.mockResolvedValueOnce({ data: { id: 99 }, error: null });
            
            // 3. Upload da foto
            mockSupabase.storage.upload.mockResolvedValueOnce({ 
                data: { path: 'creches/99/foto.png' }, 
                error: null 
            });
            
            // 4. Get URL pública da foto
            mockSupabase.storage.getPublicUrl.mockReturnValueOnce({ 
                data: { publicUrl: 'http://mock.com/foto.png' } 
            });
            
            // 5. Update do usuário com URL da foto
            mockSupabase.single.mockResolvedValueOnce({ 
                data: { id: 99, foto_url: 'http://mock.com/foto.png' }, 
                error: null 
            });

            let req = request(app).post('/cadastro');
            for (const key in cadastroData) {
                req = req.field(key, cadastroData[key]);
            }
            req = req.attach('foto_creche', imagePath);

            const res = await req;

            // Debug: mostrar erro se houver
            if (res.statusCode !== 201) {
                console.log('Status:', res.statusCode);
                console.log('Body:', res.body);
                console.log('Text:', res.text);
            }

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            
            // Verificar envio de e-mail
            expect(mockSendMail).toHaveBeenCalled();
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'teste@creche.com'
            }));
        });

        test('deve retornar 409 se o e-mail já existir', async () => {
            // Mock: e-mail já existe
            mockSupabase.maybeSingle.mockResolvedValueOnce({ 
                data: { email: 'existente@creche.com' }, 
                error: null 
            });

            let req = request(app).post('/cadastro');
            for (const key in cadastroData) {
                req = req.field(key, cadastroData[key]);
            }
            req = req.attach('foto_creche', imagePath);

            const res = await req;

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe('Este e-mail já está cadastrado.');
            expect(mockSendMail).not.toHaveBeenCalled();
        });

        test('deve retornar 400 se as senhas não coincidirem', async () => {
            let req = request(app).post('/cadastro');
            for (const key in cadastroData) {
                req = req.field(key, cadastroData[key]);
            }
            req = req.field('confirmar_senha', 'senha_errada');
            req = req.attach('foto_creche', imagePath);

            const res = await req;

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('As senhas não coincidem.');
        });
        
        test('deve retornar 400 se o arquivo não for uma imagem', async () => {
            let req = request(app).post('/cadastro');
            for (const key in cadastroData) {
                req = req.field(key, cadastroData[key]);
            }
            
            // Usar try-catch para capturar o erro do Multer
            try {
                req = req.attach('foto_creche', textPath);
                const res = await req;

                // Se chegou aqui, espera-se um erro 400
                expect(res.statusCode).toBe(400);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toContain('Formato inválido');
            } catch (error) {
                // Se o Multer abortar a requisição com ECONNRESET, também é válido
                // Isso significa que o arquivo foi rejeitado corretamente
                expect(error.code).toBe('ECONNRESET');
            }
        });
    });
});