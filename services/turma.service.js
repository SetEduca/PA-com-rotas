// services/turma.service.js

/**
 * Valida os dados obrigatórios de uma turma
 * @param {Object} dados - Dados da turma
 * @returns {{valido: boolean, erros: string[]}} Resultado da validação
 */
export function validarDadosTurma(dados) {
  const erros = [];
  
  if (!dados.nome_turma || dados.nome_turma.trim().length === 0) {
    erros.push('Nome da turma é obrigatório');
  }
  
  if (dados.nome_turma && dados.nome_turma.trim().length < 3) {
    erros.push('Nome da turma deve ter pelo menos 3 caracteres');
  }
  
  if (!dados.professor_id) {
    erros.push('Professor é obrigatório');
  }
  
  if (!dados.ano_letivo) {
    erros.push('Ano letivo é obrigatório');
  }
  
  if (dados.ano_letivo && !validarAnoLetivo(dados.ano_letivo)) {
    erros.push('Ano letivo inválido');
  }
  
  // CORREÇÃO: Validação do limite de vagas
  if (dados.limite_vagas === undefined || dados.limite_vagas === null) {
    erros.push('Limite de vagas é obrigatório');
  } else if (!validarLimiteVagas(dados.limite_vagas)) {
    erros.push('Limite de vagas deve ser maior que zero');
  }
  
  if (!dados.mensalidade_id) {
    erros.push('Mensalidade é obrigatória');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Valida o ano letivo
 * @param {string|number} anoLetivo - Ano letivo
 * @returns {boolean} true se válido
 */
export function validarAnoLetivo(anoLetivo) {
  const ano = parseInt(anoLetivo);
  const anoAtual = new Date().getFullYear();
  
  // Aceita anos entre 2020 e 5 anos no futuro
  return ano >= 2020 && ano <= (anoAtual + 5);
}

/**
 * Valida o limite de vagas
 * @param {number} limiteVagas - Limite de vagas
 * @returns {boolean} true se válido
 */
export function validarLimiteVagas(limiteVagas) {
  const limite = parseInt(limiteVagas);
  return limite > 0 && limite <= 100; // Máximo de 100 alunos por turma
}

/**
 * Verifica se a turma está com vagas disponíveis
 * @param {number} quantidadeAlunos - Quantidade atual de alunos
 * @param {number} limiteVagas - Limite de vagas da turma
 * @returns {boolean} true se há vagas disponíveis
 */
export function temVagasDisponiveis(quantidadeAlunos, limiteVagas) {
  return quantidadeAlunos < limiteVagas;
}

/**
 * Calcula a quantidade de vagas restantes
 * @param {number} quantidadeAlunos - Quantidade atual de alunos
 * @param {number} limiteVagas - Limite de vagas da turma
 * @returns {number} Quantidade de vagas disponíveis
 */
export function calcularVagasRestantes(quantidadeAlunos, limiteVagas) {
  const vagasRestantes = limiteVagas - quantidadeAlunos;
  return vagasRestantes > 0 ? vagasRestantes : 0;
}

/**
 * Calcula a porcentagem de ocupação da turma
 * @param {number} quantidadeAlunos - Quantidade atual de alunos
 * @param {number} limiteVagas - Limite de vagas da turma
 * @returns {number} Porcentagem de ocupação (0-100)
 */
export function calcularTaxaOcupacao(quantidadeAlunos, limiteVagas) {
  if (limiteVagas === 0) return 0;
  const taxa = (quantidadeAlunos / limiteVagas) * 100;
  return Math.min(Math.round(taxa), 100);
}

/**
 * Verifica se a turma está cheia
 * @param {number} quantidadeAlunos - Quantidade atual de alunos
 * @param {number} limiteVagas - Limite de vagas da turma
 * @returns {boolean} true se a turma está cheia
 */
export function turmaEstaCheia(quantidadeAlunos, limiteVagas) {
  return quantidadeAlunos >= limiteVagas;
}

/**
 * Formata o nome da turma
 * @param {string} nomeTurma - Nome da turma
 * @param {string|number} anoLetivo - Ano letivo
 * @returns {string} Nome formatado
 */
export function formatarNomeTurma(nomeTurma, anoLetivo) {
  if (!nomeTurma) return '';
  return `${nomeTurma.trim()} - ${anoLetivo}`;
}

/**
 * Valida se pode adicionar aluno à turma
 * @param {number} quantidadeAlunos - Quantidade atual de alunos
 * @param {number} limiteVagas - Limite de vagas da turma
 * @param {boolean} ativo - Se a turma está ativa
 * @returns {{pode: boolean, motivo: string|null}} Resultado da validação
 */
export function podeAdicionarAluno(quantidadeAlunos, limiteVagas, ativo = true) {
  if (!ativo) {
    return { pode: false, motivo: 'Turma está inativa' };
  }
  
  if (turmaEstaCheia(quantidadeAlunos, limiteVagas)) {
    return { pode: false, motivo: 'Turma está cheia' };
  }
  
  return { pode: true, motivo: null };
}

/**
 * Gera sugestão de nome de turma baseado em parâmetros
 * @param {string} nivel - Nível da turma (ex: "Infantil", "Fundamental")
 * @param {string} turno - Turno (ex: "Manhã", "Tarde")
 * @param {number} anoLetivo - Ano letivo
 * @returns {string} Sugestão de nome
 */
export function gerarSugestaoNomeTurma(nivel, turno, anoLetivo) {
  if (!nivel || !turno) return '';
  return `${nivel} - ${turno} (${anoLetivo})`;
}