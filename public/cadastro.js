// Funções que podem ser chamadas diretamente pelo HTML (onclick) ou que não dependem da página carregar
function cancelarCadastro() {
    if (confirm("Deseja cancelar o cadastro e limpar todos os dados?")) {
        document.getElementById('cadastro-form').reset();
        // Limpar também o preview da foto
        document.getElementById('photoPreview').style.display = 'none';
        document.getElementById('cameraIcon').style.display = 'block';
        document.getElementById('removePhoto').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
        // Limpar mensagens de erro
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('success-cadastro').style.display = 'none';
        document.getElementById('password-error-message').textContent = '';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Todo o código que manipula a página deve esperar ela carregar primeiro.
document.addEventListener('DOMContentLoaded', () => {

    // ========== CONSTANTES DOS ELEMENTOS ==========
    const photoCircle = document.getElementById('photoCircle');
    const fileInput = document.getElementById('fileInput');
    const photoPreview = document.getElementById('photoPreview');
    const cameraIcon = document.getElementById('cameraIcon');
    const removePhoto = document.getElementById('removePhoto');
    const successMessage = document.getElementById('successMessage');
    const form = document.getElementById('cadastro-form');
    const senhaInput = document.getElementById('senha');
    const confirmarSenhaInput = document.getElementById('confirmar_senha');
    const errorMessageDiv = document.getElementById('password-error-message');
    const cadastrarBtn = document.getElementById('cadastrar-btn');
    const successCadastro = document.getElementById('success-cadastro');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const ruaInput = document.getElementById('rua');
    const bairroInput = document.getElementById('bairro');
    const cidadeInput = document.getElementById('cidade');
    const emailInput = document.getElementById('email');
    const cnpjInput = document.getElementById('cnpj');

    // ========== FUNCIONALIDADE DE UPLOAD DE FOTO ==========
    if (photoCircle) {
        photoCircle.addEventListener('click', function(e) {
            if (e.target === removePhoto) return;
            fileInput.click();
        });

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
    }

    if(fileInput) {
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    alert('Por favor, selecione apenas arquivos de imagem!');
                    fileInput.value = '';
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    alert('O arquivo deve ter no máximo 5MB!');
                    fileInput.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    photoPreview.src = e.target.result;
                    photoPreview.style.display = 'block';
                    cameraIcon.style.display = 'none';
                    removePhoto.style.display = 'flex';
                    successMessage.style.display = 'block';
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 3000);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if(removePhoto) {
        removePhoto.addEventListener('click', function(event) {
            event.stopPropagation();
            photoPreview.style.display = 'none';
            cameraIcon.style.display = 'block';
            removePhoto.style.display = 'none';
            fileInput.value = '';
            successMessage.style.display = 'none';
        });
    }


    // ========== MÁSCARAS PARA OS CAMPOS ==========
    if (cnpjInput) {
        cnpjInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else {
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    if (document.getElementById('telefone')) {
        document.getElementById('telefone').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 10) {
                value = value.replace(/^(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            } else {
                value = value.replace(/^(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    }
    
    if (document.getElementById('cep')) {
        document.getElementById('cep').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }

    // ==========================================================
    // CÓDIGO DO CNPJ INSERIDO AQUI
    // ==========================================================
    if(cnpjInput) {
        cnpjInput.addEventListener('blur', async function() {
            const cnpjValue = this.value.replace(/\D/g, '');
            const nomeCrecheInput = document.getElementById('nome_creche');

            if (cnpjValue.length === 14) {
                const originalValue = nomeCrecheInput.value;
                nomeCrecheInput.value = 'Buscando...';
                nomeCrecheInput.disabled = true;

                try {
                    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjValue}`);
                    if (response.ok) {
                        const data = await response.json();
                        nomeCrecheInput.value = data.razao_social || '';
                    } else {
                        alert('CNPJ não encontrado ou inválido.');
                        nomeCrecheInput.value = originalValue;  
                    }
                } catch (error) {
                    console.error('Erro ao buscar CNPJ:', error);
                    alert('Erro ao conectar com a API de CNPJ. Verifique sua conexão.');
                    nomeCrecheInput.value = originalValue;
                } finally {
                    nomeCrecheInput.disabled = false;
                }
            }
        });
    }

    // ==============================================================================
    // ========== BUSCA AUTOMÁTICA DE CEP (VERSÃO MELHORADA E INTEGRADA) ==========
    // ==============================================================================
    const configurarCamposEndereco = (estado, texto = '') => {
        ruaInput.disabled = estado;
        bairroInput.disabled = estado;
        cidadeInput.disabled = estado;
        ruaInput.value = texto;
        bairroInput.value = texto;
        cidadeInput.value = texto;
    };

    const buscarCep = async (cep) => {
        configurarCamposEndereco(true, 'Buscando...');
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) {
                throw new Error('Erro de rede ao buscar o CEP.');
            }
            const data = await response.json();
            if (data.erro) {
                configurarCamposEndereco(false);
                alert('CEP não encontrado. Por favor, verifique o número digitado.');
            } else {
                ruaInput.value = data.logradouro || '';
                bairroInput.value = data.bairro || '';
                cidadeInput.value = data.localidade || '';
                configurarCamposEndereco(false);
                ruaInput.value = data.logradouro || '';
                bairroInput.value = data.bairro || '';
                cidadeInput.value = data.localidade || '';
            }
        } catch (error) {
            console.error('Falha ao buscar CEP:', error);
            configurarCamposEndereco(false);
            alert('Não foi possível buscar o CEP. Verifique sua conexão com a internet.');
        }
    };

    if (document.getElementById('cep')) {
        document.getElementById('cep').addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                buscarCep(cep);
            } else if (cep.length > 0) {
                configurarCamposEndereco(false);
            }
        });
    }


    // ========== VALIDAÇÃO E SUBMIT DO FORMULÁRIO ==========
    if (form) {
        if (confirmarSenhaInput) {
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
        }
        
        if (senhaInput) {
            senhaInput.addEventListener('input', function() {
                if (errorMessageDiv.textContent) {
                    errorMessageDiv.textContent = '';
                    confirmarSenhaInput.classList.remove('error');
                }
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const senha = senhaInput.value;
            const confirmarSenha = confirmarSenhaInput.value;
            
            errorMessageDiv.textContent = '';
            errorMessage.style.display = 'none';
            successCadastro.style.display = 'none';
            
            if (senha !== confirmarSenha) {
                errorMessageDiv.textContent = 'As senhas não coincidem. Tente novamente.';
                confirmarSenhaInput.classList.add('error');
                confirmarSenhaInput.focus();
                return;
            }

            if (senha.length < 6) {
                errorMessageDiv.textContent = 'A senha deve ter no mínimo 6 caracteres.';
                senhaInput.classList.add('error');
                senhaInput.focus();
                return;
            }

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

            cadastrarBtn.disabled = true;
            cadastrarBtn.textContent = 'Cadastrando...';
            cadastrarBtn.style.opacity = '0.7';

            try {
                const formData = new FormData(form);
                const response = await fetch('/cadastro', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    successCadastro.style.display = 'block';
                    errorMessage.style.display = 'none';
                    form.style.opacity = '0.5';
                    form.style.pointerEvents = 'none';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    console.log('✅ Cadastro realizado com sucesso!');
                    setTimeout(() => {
                        window.location.href = '/login?status=success';
                    }, 3000);
                } else {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorText.textContent = errorData.message || 'Erro no cadastro. Tente novamente.';
                    } else {
                        const errorHtml = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(errorHtml, 'text/html');
                        const errorElement = doc.querySelector('.error-message');
                        if (errorElement) {
                            errorText.textContent = errorElement.textContent.replace(/[⚠✖]/g, '').trim();
                        } else {
                            errorText.textContent = 'Erro no cadastro. Tente novamente.';
                        }
                    }
                    errorMessage.style.display = 'block';
                    successCadastro.style.display = 'none';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                errorText.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
                errorMessage.style.display = 'block';
                successCadastro.style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            cadastrarBtn.disabled = false;
            cadastrarBtn.textContent = 'Cadastrar';
            cadastrarBtn.style.opacity = '1';
        });
    }

    // ========== VALIDAÇÕES ADICIONAIS ==========
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            if (email && !isValidEmail(email)) {
                this.classList.add('error');
                setTimeout(() => this.classList.remove('error'), 3000);
            }
        });
    }
    
    if (cnpjInput) {
        cnpjInput.addEventListener('blur', function() {
            const cnpj = this.value.replace(/\D/g, '');
            if (cnpj && cnpj.length !== 11 && cnpj.length !== 14) {
                this.classList.add('error');
                setTimeout(() => this.classList.remove('error'), 3000);
            }
        });
    }
    
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
    console.log('   ✅ Busca automática de CNPJ');
    console.log('   ✅ Busca automática de endereço por CEP');
    console.log('   ✅ Validação de senhas em tempo real');
    console.log('   ✅ Submit com AJAX e redirecionamento condicional');
    console.log('   ✅ Validações de campos obrigatórios');
    console.log('   ✅ Tratamento de erros do servidor');

}); // Fim do DOMContentLoaded