// test/turma.service.test.js
import {
  validarDadosTurma,
  validarAnoLetivo,
  validarLimiteVagas,
  temVagasDisponiveis,
  calcularVagasRestantes,
  calcularTaxaOcupacao,
  turmaEstaCheia,
  formatarNomeTurma,
  podeAdicionarAluno,
  gerarSugestaoNomeTurma
} from '../services/turma.service.js';

describe('Turma Service - Testes Unitários', () => {
  
  // =====================================================================
  // TESTES DE VALIDAÇÃO DE DADOS DA TURMA
  // =====================================================================
  describe('validarDadosTurma', () => {
    const dadosValidos = {
      nome_turma: 'Turma A',
      professor_id: 1,
      ano_letivo: 2024,
      limite_vagas: 20,
      mensalidade_id: 1
    };

    it('deve validar dados corretos da turma', () => {
      const resultado = validarDadosTurma(dadosValidos);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve rejeitar turma sem nome', () => {
      const dados = { ...dadosValidos, nome_turma: '' };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Nome da turma é obrigatório');
    });

    it('deve rejeitar nome muito curto', () => {
      const dados = { ...dadosValidos, nome_turma: 'AB' };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Nome da turma deve ter pelo menos 3 caracteres');
    });

    it('deve rejeitar turma sem professor', () => {
      const dados = { ...dadosValidos, professor_id: null };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Professor é obrigatório');
    });

    it('deve rejeitar turma sem ano letivo', () => {
      const dados = { ...dadosValidos, ano_letivo: null };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Ano letivo é obrigatório');
    });

    it('deve rejeitar ano letivo inválido', () => {
      const dados = { ...dadosValidos, ano_letivo: 2010 };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Ano letivo inválido');
    });

    it('deve rejeitar turma sem limite de vagas', () => {
      const dados = { ...dadosValidos, limite_vagas: null };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Limite de vagas é obrigatório');
    });

    it('deve rejeitar limite de vagas inválido', () => {
      const dados = { ...dadosValidos, limite_vagas: 0 };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Limite de vagas deve ser maior que zero');
    });

    it('deve rejeitar turma sem mensalidade', () => {
      const dados = { ...dadosValidos, mensalidade_id: null };
      const resultado = validarDadosTurma(dados);
      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Mensalidade é obrigatória');
    });
  });

  // =====================================================================
  // TESTES DE VALIDAÇÃO DE ANO LETIVO
  // =====================================================================
  describe('validarAnoLetivo', () => {
    it('deve validar ano letivo atual', () => {
      const anoAtual = new Date().getFullYear();
      expect(validarAnoLetivo(anoAtual)).toBe(true);
    });

    it('deve validar ano letivo futuro (próximos 5 anos)', () => {
      const anoFuturo = new Date().getFullYear() + 3;
      expect(validarAnoLetivo(anoFuturo)).toBe(true);
    });

    it('deve rejeitar ano letivo muito antigo', () => {
      expect(validarAnoLetivo(2010)).toBe(false);
      expect(validarAnoLetivo(2019)).toBe(false);
    });

    it('deve rejeitar ano letivo muito distante no futuro', () => {
      const anoMuitoFuturo = new Date().getFullYear() + 10;
      expect(validarAnoLetivo(anoMuitoFuturo)).toBe(false);
    });

    it('deve validar ano 2024', () => {
      expect(validarAnoLetivo(2024)).toBe(true);
    });
  });

  // =====================================================================
  // TESTES DE VALIDAÇÃO DE LIMITE DE VAGAS
  // =====================================================================
  describe('validarLimiteVagas', () => {
    it('deve validar limite de vagas positivo', () => {
      expect(validarLimiteVagas(20)).toBe(true);
      expect(validarLimiteVagas(1)).toBe(true);
      expect(validarLimiteVagas(50)).toBe(true);
    });

    it('deve rejeitar limite de vagas zero ou negativo', () => {
      expect(validarLimiteVagas(0)).toBe(false);
      expect(validarLimiteVagas(-5)).toBe(false);
    });

    it('deve rejeitar limite de vagas maior que 100', () => {
      expect(validarLimiteVagas(101)).toBe(false);
      expect(validarLimiteVagas(200)).toBe(false);
    });

    it('deve aceitar limite de vagas de 100', () => {
      expect(validarLimiteVagas(100)).toBe(true);
    });
  });

  // =====================================================================
  // TESTES DE VAGAS DISPONÍVEIS
  // =====================================================================
  describe('temVagasDisponiveis', () => {
    it('deve retornar true quando há vagas', () => {
      expect(temVagasDisponiveis(10, 20)).toBe(true);
      expect(temVagasDisponiveis(0, 20)).toBe(true);
      expect(temVagasDisponiveis(19, 20)).toBe(true);
    });

    it('deve retornar false quando não há vagas', () => {
      expect(temVagasDisponiveis(20, 20)).toBe(false);
      expect(temVagasDisponiveis(25, 20)).toBe(false);
    });
  });

  describe('calcularVagasRestantes', () => {
    it('deve calcular vagas restantes corretamente', () => {
      expect(calcularVagasRestantes(10, 20)).toBe(10);
      expect(calcularVagasRestantes(0, 20)).toBe(20);
      expect(calcularVagasRestantes(19, 20)).toBe(1);
    });

    it('deve retornar 0 quando não há vagas', () => {
      expect(calcularVagasRestantes(20, 20)).toBe(0);
      expect(calcularVagasRestantes(25, 20)).toBe(0);
    });
  });

  // =====================================================================
  // TESTES DE TAXA DE OCUPAÇÃO
  // =====================================================================
  describe('calcularTaxaOcupacao', () => {
    it('deve calcular taxa de ocupação corretamente', () => {
      expect(calcularTaxaOcupacao(10, 20)).toBe(50);
      expect(calcularTaxaOcupacao(5, 20)).toBe(25);
      expect(calcularTaxaOcupacao(15, 20)).toBe(75);
    });

    it('deve retornar 0 para turma vazia', () => {
      expect(calcularTaxaOcupacao(0, 20)).toBe(0);
    });

    it('deve retornar 100 para turma cheia', () => {
      expect(calcularTaxaOcupacao(20, 20)).toBe(100);
    });

    it('deve retornar 0 quando limite de vagas é 0', () => {
      expect(calcularTaxaOcupacao(10, 0)).toBe(0);
    });

    it('deve arredondar valores decimais', () => {
      expect(calcularTaxaOcupacao(7, 20)).toBe(35); // 35%
      expect(calcularTaxaOcupacao(13, 20)).toBe(65); // 65%
    });
  });

  // =====================================================================
  // TESTES DE TURMA CHEIA
  // =====================================================================
  describe('turmaEstaCheia', () => {
    it('deve retornar true quando turma está cheia', () => {
      expect(turmaEstaCheia(20, 20)).toBe(true);
      expect(turmaEstaCheia(25, 20)).toBe(true);
    });

    it('deve retornar false quando turma tem vagas', () => {
      expect(turmaEstaCheia(10, 20)).toBe(false);
      expect(turmaEstaCheia(0, 20)).toBe(false);
      expect(turmaEstaCheia(19, 20)).toBe(false);
    });
  });

  // =====================================================================
  // TESTES DE FORMATAÇÃO
  // =====================================================================
  describe('formatarNomeTurma', () => {
    it('deve formatar nome da turma com ano letivo', () => {
      expect(formatarNomeTurma('Turma A', 2024)).toBe('Turma A - 2024');
      expect(formatarNomeTurma('Infantil 1', 2025)).toBe('Infantil 1 - 2025');
    });

    it('deve remover espaços extras', () => {
      expect(formatarNomeTurma('  Turma A  ', 2024)).toBe('Turma A - 2024');
    });

    it('deve retornar string vazia para nome vazio', () => {
      expect(formatarNomeTurma('', 2024)).toBe('');
      expect(formatarNomeTurma(null, 2024)).toBe('');
    });
  });

  // =====================================================================
  // TESTES DE ADICIONAR ALUNO
  // =====================================================================
  describe('podeAdicionarAluno', () => {
    it('deve permitir adicionar aluno quando há vagas e turma está ativa', () => {
      const resultado = podeAdicionarAluno(10, 20, true);
      expect(resultado.pode).toBe(true);
      expect(resultado.motivo).toBeNull();
    });

    it('deve impedir adicionar aluno em turma inativa', () => {
      const resultado = podeAdicionarAluno(10, 20, false);
      expect(resultado.pode).toBe(false);
      expect(resultado.motivo).toBe('Turma está inativa');
    });

    it('deve impedir adicionar aluno em turma cheia', () => {
      const resultado = podeAdicionarAluno(20, 20, true);
      expect(resultado.pode).toBe(false);
      expect(resultado.motivo).toBe('Turma está cheia');
    });
  });

  // =====================================================================
  // TESTES DE SUGESTÃO DE NOME
  // =====================================================================
  describe('gerarSugestaoNomeTurma', () => {
    it('deve gerar sugestão de nome correta', () => {
      expect(gerarSugestaoNomeTurma('Infantil', 'Manhã', 2024))
        .toBe('Infantil - Manhã (2024)');
      
      expect(gerarSugestaoNomeTurma('Fundamental', 'Tarde', 2025))
        .toBe('Fundamental - Tarde (2025)');
    });

    it('deve retornar string vazia para dados incompletos', () => {
      expect(gerarSugestaoNomeTurma('', 'Manhã', 2024)).toBe('');
      expect(gerarSugestaoNomeTurma('Infantil', '', 2024)).toBe('');
      expect(gerarSugestaoNomeTurma(null, null, 2024)).toBe('');
    });
  });
});