// test/aluno.service.test.js
import {
  limparCPF,
  validarCPF,
  separarTelefone,
  validarDadosAluno,
  validarDadosResponsavel,
  validarEmail,
  validarEndereco,
  validarCEP,
  calcularIdade
} from '../services/aluno.service.js';

describe('Aluno Service - Testes Unitários', () => {
  
  // =====================================================================
  // TESTES DE LIMPEZA E VALIDAÇÃO DE CPF
  // =====================================================================
  describe('limparCPF', () => {
    it('deve remover pontos e traços do CPF', () => {
      expect(limparCPF('123.456.789-00')).toBe('12345678900');
    });

    it('deve retornar null para CPF vazio', () => {
      expect(limparCPF('')).toBe(null);
      expect(limparCPF(null)).toBe(null);
    });

    it('deve remover todos os caracteres não numéricos', () => {
      expect(limparCPF('123.456.789-00 ')).toBe('12345678900');
      expect(limparCPF('123abc456def789')).toBe('123456789');
    });
  });

  describe('validarCPF', () => {
    it('deve validar CPF com 11 dígitos', () => {
      expect(validarCPF('12345678900')).toBe(true);
    });

    it('deve rejeitar CPF com menos de 11 dígitos', () => {
      expect(validarCPF('123456789')).toBe(false);
    });

    it('deve rejeitar CPF com mais de 11 dígitos', () => {
      expect(validarCPF('123456789000')).toBe(false);
    });

    it('deve rejeitar CPF com letras', () => {
      expect(validarCPF('1234567890a')).toBe(false);
    });

    it('deve rejeitar CPF vazio ou null', () => {
      expect(validarCPF('')).toBe(false);
      expect(validarCPF(null)).toBe(false);
    });
  });

  // =====================================================================
  // TESTES DE SEPARAÇÃO DE TELEFONE
  // =====================================================================
  describe('separarTelefone', () => {
    it('deve separar DDD e número corretamente', () => {
      const resultado = separarTelefone('11987654321');
      expect(resultado).toEqual({
        ddd: '11',
        numero: '987654321'
      });
    });

    it('deve remover formatação do telefone', () => {
      const resultado = separarTelefone('(11) 98765-4321');
      expect(resultado).toEqual({
        ddd: '11',
        numero: '987654321'
      });
    });

    it('deve lançar erro para telefone com menos de 10 dígitos', () => {
      expect(() => separarTelefone('119876543')).toThrow('Telefone inválido');
    });

    it('deve retornar objeto vazio para telefone null', () => {
      const resultado = separarTelefone(null);
      expect(resultado).toEqual({ ddd: '', numero: '' });
    });
  });

  // =====================================================================
  // TESTES DE VALIDAÇÃO DE DADOS DO ALUNO
  // =====================================================================
  describe('validarDadosAluno', () => {
    const dadosValidos = {
      nome: 'João Silva',
      data_nascimento: '2015-05-10',
      sexo: 'M',
      naturalidade: 'São Paulo',
      cpf: '12345678900'
    };

    it('deve validar dados corretos do aluno', () => {
      const resultado = validarDadosAluno(dadosValidos);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve rejeitar aluno sem nome', () => {
      const dados = { ...dadosValidos, nome: '' };
      const resultado = validarDadosAluno(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Nome é obrigatório');
    });

    it('deve rejeitar nome muito curto', () => {
      const dados = { ...dadosValidos, nome: 'Jo' };
      const resultado = validarDadosAluno(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Nome deve ter pelo menos 3 caracteres');
    });

    it('deve rejeitar aluno sem data de nascimento', () => {
      const dados = { ...dadosValidos, data_nascimento: null };
      const resultado = validarDadosAluno(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Data de nascimento é obrigatória');
    });

    it('deve rejeitar sexo inválido', () => {
      const dados = { ...dadosValidos, sexo: 'X' };
      const resultado = validarDadosAluno(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Sexo deve ser M ou F');
    });

    it('deve aceitar sexo em minúsculas', () => {
      const dados = { ...dadosValidos, sexo: 'f' };
      const resultado = validarDadosAluno(dados);
      expect(resultado.valido).toBe(true);
    });

    it('deve rejeitar aluno sem naturalidade', () => {
      const dados = { ...dadosValidos, naturalidade: '' };
      const resultado = validarDadosAluno(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Naturalidade é obrigatória');
    });

    it('deve rejeitar CPF inválido', () => {
      const dados = { ...dadosValidos, cpf: '123' };
      const resultado = validarDadosAluno(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('CPF inválido');
    });
  });

  // =====================================================================
  // TESTES DE VALIDAÇÃO DE DADOS DO RESPONSÁVEL
  // =====================================================================
  describe('validarDadosResponsavel', () => {
    const dadosValidos = {
      nome: 'Maria Silva',
      cpf: '98765432100',
      email: 'maria@example.com'
    };

    it('deve validar dados corretos do responsável', () => {
      const resultado = validarDadosResponsavel(dadosValidos);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve rejeitar responsável sem nome', () => {
      const dados = { ...dadosValidos, nome: '' };
      const resultado = validarDadosResponsavel(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Nome do responsável é obrigatório');
    });

    it('deve rejeitar responsável sem CPF', () => {
      const dados = { ...dadosValidos, cpf: null };
      const resultado = validarDadosResponsavel(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('CPF do responsável é obrigatório');
    });

    it('deve rejeitar email inválido', () => {
      const dados = { ...dadosValidos, email: 'email_invalido' };
      const resultado = validarDadosResponsavel(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Email inválido');
    });
  });

  // =====================================================================
  // TESTES DE VALIDAÇÃO DE EMAIL
  // =====================================================================
  describe('validarEmail', () => {
    it('deve validar email correto', () => {
      expect(validarEmail('teste@example.com')).toBe(true);
      expect(validarEmail('usuario.nome@dominio.com.br')).toBe(true);
    });

    it('deve rejeitar email sem @', () => {
      expect(validarEmail('emailinvalido.com')).toBe(false);
    });

    it('deve rejeitar email sem domínio', () => {
      expect(validarEmail('email@')).toBe(false);
    });

    it('deve rejeitar email vazio', () => {
      expect(validarEmail('')).toBe(false);
      expect(validarEmail(null)).toBe(false);
    });
  });

  // =====================================================================
  // TESTES DE VALIDAÇÃO DE ENDEREÇO
  // =====================================================================
  describe('validarEndereco', () => {
    const enderecoValido = {
      rua: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234567'
    };

    it('deve validar endereço completo', () => {
      const resultado = validarEndereco(enderecoValido);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve rejeitar endereço sem rua', () => {
      const endereco = { ...enderecoValido, rua: '' };
      const resultado = validarEndereco(endereco);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Rua é obrigatória');
    });

    it('deve rejeitar endereço sem número', () => {
      const endereco = { ...enderecoValido, numero: null };
      const resultado = validarEndereco(endereco);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Número é obrigatório');
    });

    it('deve rejeitar CEP inválido', () => {
      const endereco = { ...enderecoValido, cep: '123' };
      const resultado = validarEndereco(endereco);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('CEP inválido');
    });
  });

  // =====================================================================
  // TESTES DE VALIDAÇÃO DE CEP
  // =====================================================================
  describe('validarCEP', () => {
    it('deve validar CEP com 8 dígitos', () => {
      expect(validarCEP('12345678')).toBe(true);
      expect(validarCEP('12345-678')).toBe(true);
    });

    it('deve rejeitar CEP com menos de 8 dígitos', () => {
      expect(validarCEP('1234567')).toBe(false);
    });

    it('deve rejeitar CEP vazio', () => {
      expect(validarCEP('')).toBe(false);
      expect(validarCEP(null)).toBe(false);
    });
  });

  // =====================================================================
  // TESTES DE CÁLCULO DE IDADE
  // =====================================================================
  describe('calcularIdade', () => {
    it('deve calcular idade corretamente', () => {
      // Para uma pessoa nascida em 2015
      const dataNascimento = '2015-01-01';
      const idade = calcularIdade(dataNascimento);
      
      // A idade deve ser entre 9 e 10 anos (dependendo da data atual)
      expect(idade).toBeGreaterThanOrEqual(9);
      expect(idade).toBeLessThanOrEqual(10);
    });

    it('deve retornar 0 para data inválida', () => {
      expect(calcularIdade(null)).toBe(0);
      expect(calcularIdade('')).toBe(0);
    });

    it('deve calcular idade de bebê (menos de 1 ano)', () => {
      const hoje = new Date();
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
      const dataNascimento = mesPassado.toISOString().split('T')[0];
      
      expect(calcularIdade(dataNascimento)).toBe(0);
    });
  });
});