'use strict';

// Este arquivo usa a sintaxe CommonJS (module.exports)
// e a extensão .cjs para funcionar com "type": "module"

// Função para gerar um e-mail aleatório
function generateRandomEmail(userContext, events, done) {
  const randomUuid = Math.random().toString(36).substring(2, 15);
  userContext.vars.randomEmail = `creche-${randomUuid}@teste.com`;
  return done();
}

// Função para gerar um CNPJ aleatório
function generateRandomCnpj(userContext, events, done) {
  // Gera 14 números aleatórios
  const randomCnpj = Array.from({length: 14}, () => Math.floor(Math.random() * 10)).join('');
  userContext.vars.randomCnpj = randomCnpj;
  return done();
}

// Exportando no formato CommonJS
module.exports = {
  generateRandomEmail,
  generateRandomCnpj
};
