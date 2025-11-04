// services/aluno.service.js

export function limparCPF(cpf) {
  if (!cpf) return null;
  return cpf.replace(/\D/g, '');
}

export function validarCPF(cpf) {
  if (!cpf) return false;
  return cpf.length === 11 && /^\d+$/.test(cpf);
}

export function separarTelefone(telefoneCompleto) {
  if (!telefoneCompleto) {
    return { ddd: '', numero: '' };
  }
  
  const telLimpo = telefoneCompleto.replace(/\D/g, '');
  
  if (telLimpo.length < 10) {
    throw new Error('Telefone inválido: deve ter pelo menos 10 dígitos');
  }
  
  return {
    ddd: telLimpo.substring(0, 2),
    numero: telLimpo.substring(2)
  };
}

export function validarDadosAluno(dados) {
  const erros = [];
  
  if (!dados.nome || dados.nome.trim().length === 0) {
    erros.push('Nome é obrigatório');
  }
  
  if (dados.nome && dados.nome.trim().length < 3) {
    erros.push('Nome deve ter pelo menos 3 caracteres');
  }
  
  if (!dados.data_nascimento) {
    erros.push('Data de nascimento é obrigatória');
  }
  
  if (!dados.sexo) {
    erros.push('Sexo é obrigatório');
  }
  
  if (dados.sexo && !['M', 'F'].includes(dados.sexo.toUpperCase())) {
    erros.push('Sexo deve ser M ou F');
  }
  
  if (!dados.naturalidade || dados.naturalidade.trim().length === 0) {
    erros.push('Naturalidade é obrigatória');
  }
  
  if (dados.cpf && !validarCPF(limparCPF(dados.cpf))) {
    erros.push('CPF inválido');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}

export function validarEmail(email) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validarDadosResponsavel(dados) {
  const erros = [];
  
  if (!dados.nome || dados.nome.trim().length === 0) {
    erros.push('Nome do responsável é obrigatório');
  }
  
  if (!dados.cpf) {
    erros.push('CPF do responsável é obrigatório');
  }
  
  if (dados.cpf && !validarCPF(limparCPF(dados.cpf))) {
    erros.push('CPF do responsável inválido');
  }
  
  if (dados.email && !validarEmail(dados.email)) {
    erros.push('Email inválido');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}

export function validarCEP(cep) {
  if (!cep) return false;
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.length === 8;
}

export function validarEndereco(endereco) {
  const erros = [];
  
  if (!endereco.rua || endereco.rua.trim().length === 0) {
    erros.push('Rua é obrigatória');
  }
  
  if (!endereco.numero) {
    erros.push('Número é obrigatório');
  }
  
  if (!endereco.bairro || endereco.bairro.trim().length === 0) {
    erros.push('Bairro é obrigatório');
  }
  
  if (!endereco.cidade || endereco.cidade.trim().length === 0) {
    erros.push('Cidade é obrigatória');
  }
  
  if (!endereco.estado || endereco.estado.trim().length === 0) {
    erros.push('Estado é obrigatório');
  }
  
  if (!endereco.cep) {
    erros.push('CEP é obrigatório');
  }
  
  if (endereco.cep && !validarCEP(endereco.cep)) {
    erros.push('CEP inválido');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}

export function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 0;
  
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
}