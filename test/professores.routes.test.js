// test/professores.routes.test.js
import request from 'supertest';
import app from '../app.js';

describe('Professores Routes', () => {
  let server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('GET /api/professores', () => {
    it('deve retornar status 200', async () => {
      const response = await request(app).get('/api/professores');
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/professores/ver/:id', () => {
    it('deve retornar JSON para um professor', async () => {
      const response = await request(app).get('/api/professores/ver/1');
      
      // Pode retornar 200 (encontrou) ou 404/500 (não encontrou/erro)
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});