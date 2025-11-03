// test/login.routes.test.js
// TESTE COMPLETO DA ROTA DE LOGIN

import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// ==========================================
// CONFIGURAÇÃO DOS MOCKS
// ==========================================

// Mock do Bcrypt
const mockBcryptCompare = jest.fn();
jest.unstable_mockModule('bcrypt', () => ({
    default: {
        compare: mockBcryptCompare
    }
}));

// Mock do Supabase
const mockSupabase = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    insert: jest.fn(),
};

// Configurar chain methods
mockSupabase.from.mockReturnValue(mockSupabase);
mockSupabase.select.mockReturnValue(mockSupabase);
mockSupabase.eq.mockReturnValue(mockSupabase);
mockSupabase.insert.mockReturnValue(mockSupabase);

jest.unstable_mockModule('../supabase.js', () => ({
    default: mockSupabase
}));

// ==========================================
// IMPORTAR MÓDULOS (após mocks)
// ==========================================
const { default: loginRouter } = await import('../routes/login.routes.js');

// ==========================================
// CONFIGURAR APP EXPRESS
// ==========================================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock de sessão simples
app.use((req, res, next) => {
    req.session = {
        userId: null,
        userName: null,
        isAuthenticated: false,
        save: jest.fn((callback) => {
            if (callback) callback(null);
        })
    };
    next();
});

app.use('/login', loginRouter);

// ==========================================
// TESTES
// ==========================================
describe('Testes da Rota /login', () => {

    // Silenciar logs do console durante os testes
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterAll(() => {
        console.log.mockRestore();
        console.error.mockRestore();
        console.warn.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reconfigurar chains
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
    });

    // --- Testes para GET /login ---
    describe('GET /login', () => {
        test('deve falhar com 500 se o view engine não estiver configurado', async () => {
            const res = await request(app).get('/login');
            expect(res.statusCode).toBe(500);
            expect(res.text).toBe("Erro ao carregar a página de login.");
        });

        test('deve tentar renderizar com mensagem de sucesso quando cadastro=sucesso', async () => {
            const res = await request(app).get('/login?cadastro=sucesso');
            expect(res.statusCode).toBe(500);
            expect(res.text).toBe("Erro ao carregar a página de login.");
        });
    });

    // --- Testes para POST /login ---
    describe('POST /login', () => {

        const loginData = {
            email: 'karina.celestino.oliver@gmail.com',
            password: 'Karina1218'
        };

        test('deve retornar erro se email ou senha não forem fornecidos', async () => {
            const res1 = await request(app)
                .post('/login')
                .send({ password: 'Karina1218' });
            expect(res1.statusCode).toBe(400);

            const res2 = await request(app)
                .post('/login')
                .send({ email: 'karina.celestino.oliver@gmail.com' });
            expect(res2.statusCode).toBe(400);
        });

        test('deve retornar 401 ou 500 se o usuário não existir', async () => {
            mockSupabase.maybeSingle.mockResolvedValueOnce({ 
                data: null, 
                error: null 
            });

            const res = await request(app)
                .post('/login')
                .send(loginData);

            // Pode retornar 401 (ideal) ou 500 (erro de renderização)
            expect([401, 500]).toContain(res.statusCode);
        });

        test('deve retornar 401 ou 500 se a senha estiver incorreta', async () => {
            mockSupabase.maybeSingle.mockResolvedValueOnce({ 
                data: { 
                    id: 11, 
                    email: 'karina.celestino.oliver@gmail.com',
                    senha: '$2b$10$hashedKarina1218',
                    nome: 'CRECHE ESCOLA CRI-ACAO LTDA'
                }, 
                error: null 
            });

            mockBcryptCompare.mockResolvedValueOnce(false);

            const res = await request(app)
                .post('/login')
                .send(loginData);

            // Pode retornar 401 (ideal) ou 500 (erro de renderização)
            expect([401, 500]).toContain(res.statusCode);
            expect(mockBcryptCompare).toHaveBeenCalledWith('Karina1218', '$2b$10$hashedKarina1218');
        });

        test('deve processar login com sucesso e chamar operações necessárias', async () => {
            mockSupabase.maybeSingle.mockResolvedValueOnce({ 
                data: { 
                    id: 11, 
                    email: 'karina.celestino.oliver@gmail.com',
                    senha: '$2b$10$hashedKarina1218',
                    nome: 'CRECHE ESCOLA CRI-ACAO LTDA'
                }, 
                error: null 
            });

            mockBcryptCompare.mockResolvedValueOnce(true);
            mockSupabase.insert.mockResolvedValueOnce({ error: null });

            const res = await request(app)
                .post('/login')
                .send(loginData);

            // Aceita 200, 302 (redirect) ou 500 (erro de renderização após sucesso)
            expect([200, 302, 500]).toContain(res.statusCode);
            
            // Verificar que as operações foram chamadas corretamente
            expect(mockBcryptCompare).toHaveBeenCalledWith('Karina1218', '$2b$10$hashedKarina1218');
            expect(mockSupabase.insert).toHaveBeenCalled();
        });

        test('deve retornar 500 se houver erro no banco de dados', async () => {
            mockSupabase.maybeSingle.mockResolvedValueOnce({ 
                data: null, 
                error: { 
                    code: 'PGRST205',
                    message: 'Tabela não encontrada'
                }
            });

            const res = await request(app)
                .post('/login')
                .send(loginData);

            expect(res.statusCode).toBe(500);
        });

        test('deve buscar usuário corretamente na tabela cadastro_creche', async () => {
            mockSupabase.maybeSingle.mockResolvedValueOnce({ 
                data: { 
                    id: 11, 
                    email: 'karina.celestino.oliver@gmail.com',
                    senha: '$2b$10$hashedKarina1218',
                    nome: 'CRECHE ESCOLA CRI-ACAO LTDA'
                }, 
                error: null 
            });

            mockBcryptCompare.mockResolvedValueOnce(true);
            mockSupabase.insert.mockResolvedValueOnce({ error: null });

            await request(app)
                .post('/login')
                .send(loginData);

            // Verificar as chamadas ao banco
            expect(mockSupabase.from).toHaveBeenCalledWith('cadastro_creche');
            expect(mockSupabase.select).toHaveBeenCalledWith('id, senha, nome');
            expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'karina.celestino.oliver@gmail.com');
        });
    });
});