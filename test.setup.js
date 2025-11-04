// test/setup.js
// Aumenta o timeout para testes assíncronos
jest.setTimeout(10000);

// Configura variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.PORT = '3020';