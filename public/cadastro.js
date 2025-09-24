// ========== FUNCIONALIDADE DE UPLOAD DE FOTO ==========
const photoCircle = document.getElementById('photoCircle');
const fileInput = document.getElementById('fileInput');
const photoPreview = document.getElementById('photoPreview');
const cameraIcon = document.getElementById('cameraIcon');
const removePhoto = document.getElementById('removePhoto');
const successMessage = document.getElementById('successMessage');

// Evento de clique no círculo da foto
photoCircle.addEventListener('click', function(e) {
    // Evita que o clique no botão de remover abra o seletor
    if (e.target === removePhoto) return;
    fileInput.click();
});

// Evento de mudança no input de arquivo
fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    if (file) {
        // Verificar se é uma imagem
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem!');
            fileInput.value = '';
            return;
        }

        // Verificar tamanho do arquivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5MB!');
            fileInput.value = '';
            return;
        }

        // Ler o arquivo e mostrar preview
        const reader = new FileReader();
        reader.onload = function(e) {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
            cameraIcon.style.display = 'none';
            removePhoto.style.display = 'flex';
            
            // Mostrar mensagem de sucesso
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);
        };
        reader.readAsDataURL(file);
    }
});

// Evento para remover a foto
removePhoto.addEventListener('click', function(event) {
    event.stopPropagation();
    
    photoPreview.style.display = 'none';
    cameraIcon.style.display = 'block';
    removePhoto.style.display = 'none';
    fileInput.value = '';
    successMessage.style.display = 'none';
});

// Funcionalidade de arrastar e soltar
photoCircle.addEventListener('dragover', function(e) {
    e.preventDefault();
    photoCircle.classList.add('drag-over');
});

photoCircle.addEventListener('dragleave', function(e) {
    e.preventDefault();
    photoCircle.classList.remove('drag-over');
});

photoCircle.addEventListener('drop', function(e) {
    e.preventDefault();
    photoCircle.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change'));
        } else {
            alert('Por favor, solte apenas arquivos de imagem!');
        }
    }
});

// ========== FUNÇÃO CANCELAR CADASTRO ==========
function cancelarCadastro() {
    if (confirm("Deseja cancelar o cadastro e limpar todos os dados?")) {
        document.getElementById('cadastro-form').reset();
        // Limpar também o preview da foto
        photoPreview.style.display = 'none';
        cameraIcon.style.display = 'block';
        removePhoto.style.display = 'none';
        successMessage.style.display = 'none';
        // Limpar mensagens de erro
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('success-cadastro').style.display = 'none';
        document.getElementById('password-error-message').textContent = '';
    }
}

// ========== MÁSCARAS PARA OS CAMPOS ==========

// Máscara para CNPJ/CPF
document.getElementById('cnpj').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        // CPF
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        // CNPJ
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    e.target.value = value;
});

// Máscara para telefone
document.getElementById('telefone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
        // Telefone fixo: (XX) XXXX-XXXX
        value = value.replace(/^(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        // Celular: (XX) XXXXX-XXXX
        value = value.replace(/^(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    e.target.value = value;
});

// Máscara para CEP
document.getElementById('cep').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    e.target.value = value;
});

// ========== BUSCA AUTOMÁTICA DE CEP ==========
document.getElementById('cep').addEventListener('blur', function() {
    const cep = this.value.replace(/\D/g, '');
    if (cep.length === 8) {
        // Mostrar loading no campo cidade (opcional)
        const cidadeField = document.getElementById('cidade');
        const originalValue = cidadeField.value;
        cidadeField.value = 'Buscando...';
        
        fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(response => response.json())
            .then(data => {
                if (!data.erro) {
                    document.getElementById('rua').value = data.logradouro || '';
                    document.getElementById('bairro').value = data.bairro || '';
                    document.getElementById('cidade').value = data.localidade || '';
                } else {
                    // Restaurar valor original se CEP não encontrado
                    cidadeField.value = originalValue;
                    alert('CEP não encontrado. Verifique o número digitado.');
                }
            })
            .catch(error => {
                console.log('Erro ao buscar CEP:', error);
                cidadeField.value = originalValue;
                alert('Erro ao buscar CEP. Verifique sua conexão.');
            });
    }
});

// ========== VALIDAÇÃO E SUBMIT DO FORMULÁRIO ==========
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastro-form');
    const senhaInput = document.getElementById('senha');
    const confirmarSenhaInput = document.getElementById('confirmar_senha');
    const errorMessageDiv = document.getElementById('password-error-message');
    const cadastrarBtn = document.getElementById('cadastrar-btn');
    const successCadastro = document.getElementById('success-cadastro');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // Validação em tempo real das senhas
    confirmarSenhaInput.addEventListener('input', function() {
        const senha = senhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;
        
        if (confirmarSenha && senha !== confirmarSenha) {
            errorMessageDiv.textContent = 'As senhas não coincidem';
            confirmarSenhaInput.classList.add('error');
        } else {
            errorMessageDiv.textContent = '';
            confirmarSenhaInput.classList.remove('error');
        }
    });

    // Limpar erro quando o usuário começar a digitar a senha novamente
    senhaInput.addEventListener('input', function() {
        if (errorMessageDiv.textContent) {
            errorMessageDiv.textContent = '';
            confirmarSenhaInput.classList.remove('error');
        }
    });

    // Interceptar o submit do formulário
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Previne o submit padrão
        
        const senha = senhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;
        
        // Limpar mensagens anteriores
        errorMessageDiv.textContent = '';
        errorMessage.style.display = 'none';
        successCadastro.style.display = 'none';
        
        // Validação das senhas
        if (senha !== confirmarSenha) {
            errorMessageDiv.textContent = 'As senhas não coincidem. Tente novamente.';
            confirmarSenhaInput.classList.add('error');
            confirmarSenhaInput.focus();
            return;
        }

        // Validação de senha mínima
        if (senha.length < 6) {
            errorMessageDiv.textContent = 'A senha deve ter no mínimo 6 caracteres.';
            senhaInput.classList.add('error');
            senhaInput.focus();
            return;
        }

        // Validação de campos obrigatórios
        const camposObrigatorios = [
            { id: 'nome_creche', nome: 'Nome da Creche' },
            { id: 'cnpj', nome: 'CNPJ/CPF' },
            { id: 'telefone', nome: 'Telefone' },
            { id: 'cep', nome: 'CEP' },
            { id: 'rua', nome: 'Rua' },
            { id: 'bairro', nome: 'Bairro' },
            { id: 'cidade', nome: 'Cidade' },
            { id: 'email', nome: 'E-mail' }
        ];

        for (let campo of camposObrigatorios) {
            const input = document.getElementById(campo.id);
            if (!input.value.trim()) {
                errorText.textContent = `O campo "${campo.nome}" é obrigatório.`;
                errorMessage.style.display = 'block';
                input.focus();
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 3000);
                return;
            }
        }

        // Desabilitar botão durante o processo
        cadastrarBtn.disabled = true;
        cadastrarBtn.textContent = 'Cadastrando...';
        cadastrarBtn.style.opacity = '0.7';

        try {
            // Criar FormData com todos os dados
            const formData = new FormData(form);
            
            // Fazer a requisição
            const response = await fetch('/cadastro', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Se deu certo, mostrar sucesso e redirecionar
                successCadastro.style.display = 'block';
                errorMessage.style.display = 'none';
                form.style.opacity = '0.5';
                form.style.pointerEvents = 'none'; // Desabilita interação com o form
                
                // Scroll para o topo para mostrar a mensagem de sucesso
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                console.log('✅ Cadastro realizado com sucesso!');
                
                // Redirecionar para login após 3 segundos
                setTimeout(() => {
                    window.location.href = '/login?status=success';
                }, 3000);
                
            } else {
                // Se deu erro, tentar pegar a mensagem de erro
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    // Se a resposta for JSON
                    const errorData = await response.json();
                    errorText.textContent = errorData.message || 'Erro no cadastro. Tente novamente.';
                } else {
                    // Se a resposta for HTML (como está configurado no servidor)
                    const errorHtml = await response.text();
                    
                    // Tentar extrair a mensagem de erro do HTML retornado
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(errorHtml, 'text/html');
                    const errorElement = doc.querySelector('.error-message');
                    
                    if (errorElement) {
                        // Remover ícones e limpar a mensagem
                        errorText.textContent = errorElement.textContent.replace(/[⚠✖]/g, '').trim();
                    } else {
                        errorText.textContent = 'Erro no cadastro. Tente novamente.';
                    }
                }
                
                errorMessage.style.display = 'block';
                successCadastro.style.display = 'none';
                
                // Scroll para o topo para mostrar o erro
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
        } catch (error) {
            console.error('Erro na requisição:', error);
            errorText.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
            errorMessage.style.display = 'block';
            successCadastro.style.display = 'none';
            
            // Scroll para o topo para mostrar o erro
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Reabilitar botão
        cadastrarBtn.disabled = false;
        cadastrarBtn.textContent = 'Cadastrar';
        cadastrarBtn.style.opacity = '1';
    });

    // ========== VALIDAÇÕES ADICIONAIS ==========
    
    // Validar email em tempo real
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !isValidEmail(email)) {
            this.classList.add('error');
            setTimeout(() => this.classList.remove('error'), 3000);
        }
    });

    // Validar CNPJ/CPF básico
    const cnpjInput = document.getElementById('cnpj');
    cnpjInput.addEventListener('blur', function() {
        const cnpj = this.value.replace(/\D/g, '');
        if (cnpj && cnpj.length !== 11 && cnpj.length !== 14) {
            this.classList.add('error');
            setTimeout(() => this.classList.remove('error'), 3000);
        }
    });
});

// ========== FUNÇÕES AUXILIARES ==========

// Função para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Função para limpar classes de erro quando o usuário começa a digitar
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('error')) {
        e.target.classList.remove('error');
    }
});

// ========== CONSOLE LOG PARA DEBUG ==========
console.log('🚀 JavaScript do cadastro carregado com sucesso!');
console.log('📋 Funcionalidades ativas:');
console.log('   ✅ Upload de foto com drag & drop');
console.log('   ✅ Máscaras para CNPJ/CPF, telefone e CEP');
console.log('   ✅ Busca automática de endereço por CEP');
console.log('   ✅ Validação de senhas em tempo real');
console.log('   ✅ Submit com AJAX e redirecionamento condicional');
console.log('   ✅ Validações de campos obrigatórios');
console.log('   ✅ Tratamento de erros do servidor');   