import { Router } from 'express';
import supabase from '../supabase.js'; // Verifique se o caminho para o supabase.js está correto
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const router = Router();
const SALT_ROUNDS = 10; // Padrão para criptografar

// --- 1. CONFIGURAÇÃO DO NODEMAILER ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- 2. ROTAS ---

// ETAPA 1: MOSTRAR PÁGINA PARA PEDIR E-MAIL
router.get('/esqueci', (req, res) => {
    res.render('TROCARSENHA/pemail', { title: 'Recuperar Senha', erro: null });
});

// ETAPA 2: ENVIAR O CÓDIGO POR E-MAIL
router.post('/enviar-codigo', async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Verifica se o e-mail existe E PEGA O ID
        //    IMPORTANTE: Estou assumindo que sua coluna de ID em 'cadastro_creche' se chama 'id'
        const { data: usuario, error } = await supabase
            .from('cadastro_creche')
            .select('id, email') // <<< MUDANÇA AQUI
            .eq('email', email)
            .single();

        if (error || !usuario) {
            return res.render('TROCARSENHA/pemail', {
                title: 'Recuperar Senha',
                erro: 'E-mail não encontrado em nosso sistema.'
            });
        }

        // 2. Gera um código de 6 dígitos
        const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Salva os dados na sessão
        req.session.recoveryCode = codigoVerificacao;
        req.session.recoveryEmail = email;
        req.session.recoveryUserId = usuario.id; // <<< MUDANÇA AQUI (Salvando o ID)
        req.session.recoveryVerified = false; 

        // 4. Envia o e-mail
        await transporter.sendMail({
            from: `"Equipe Sete" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Seu código de recuperação de senha',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Recuperação de Senha</h2>
                    <p>Olá,</p>
                    <p>Você solicitou a redefinição da sua senha. Use o código abaixo para continuar:</p>
                    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333;">
                        ${codigoVerificacao}
                    </p>
                    <p>Este código expira em 10 minutos.</p>
                </div>
            `,
        });

        // 5. Renderiza a página de verificação
        res.render('TROCARSENHA/verifica', {
            title: 'Verificar Código',
            email: email,
            erro: null
        });

    } catch (error) {
        console.error('Erro ao enviar e-mail de recuperação:', error);
        res.render('TROCARSENHA/pemail', {
            title: 'Recuperar Senha',
            erro: 'Erro ao enviar o e-mail. Tente novamente mais tarde.'
        });
    }
});

// ETAPA 3: VERIFICAR O CÓDIGO
router.post('/verificar-codigo', (req, res) => {
    const { code } = req.body;
    const email = req.session.recoveryEmail;
    const codigoSalvo = req.session.recoveryCode;

    if (!email || !codigoSalvo) {
        return res.redirect('/senha/esqueci');
    }

    if (code === codigoSalvo) {
        req.session.recoveryVerified = true;
        res.render('TROCARSENHA/redefinir', {
            title: 'Redefinir Senha',
            erro: null
        });
    } else {
        res.render('TROCARSENHA/verifica', {
            title: 'Verificar Código',
            email: email,
            erro: 'Código inválido. Tente novamente.'
        });
    }
});

// ETAPA 4: REDEFINIR A SENHA
router.post('/redefinir-senha', async (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    
    // Pega todos os dados da sessão
    const email = req.session.recoveryEmail;
    const codigoUsado = req.session.recoveryCode; 
    const idDoUsuario = req.session.recoveryUserId; // <<< MUDANÇA AQUI

    // 1. Verifica se o usuário passou pela etapa de verificação
    if (!req.session.recoveryVerified || !email || !idDoUsuario) {
        return res.redirect('/senha/esqueci');
    }

    // 2. Validação das senhas (do formulário)
    if (newPassword !== confirmPassword) {
        return res.render('TROCARSENHA/redefinir', {
            title: 'Redefinir Senha',
            erro: 'As senhas não coincidem. Tente novamente.'
        });
    }

    // Validação de força da senha
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.render('TROCARSENHA/redefinir', {
            title: 'Redefinir Senha',
            erro: 'A senha não atende aos requisitos (mín. 6 caracteres, 1 maiúscula, 1 minúscula, 1 número).'
        });
    }

    try {
        // 3. Criptografa a nova senha
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // 4. Atualiza a senha na tabela principal de usuários
        const { error: updateError } = await supabase
            .from('cadastro_creche')
            .update({ senha: hashedPassword }) 
            .eq('id', idDoUsuario); // <<< MUDANÇA AQUI (mais seguro atualizar pelo ID)

        if (updateError) {
            throw new Error(`Erro ao atualizar a senha: ${updateError.message}`);
        }

        // 5. Salva o log na tabela 'troca_senha'
        //    (Agora com todas as colunas corretas)
        const { error: logError } = await supabase
            .from('troca_senha')
            .insert({
                senha_nova: hashedPassword,
                confirmar_senha: hashedPassword, 
                token: codigoUsado,
                email: email, 
                usuario_id: idDoUsuario // <<< MUDANÇA AQUI (salvando o ID)
            });

        if (logError) {
            // Se o log falhar, ele não vai parar a operação, mas vai avisar no console.
            console.warn('AVISO: A senha foi redefinida, mas falhou ao salvar o log na tabela "troca_senha".', logError.message);
        }

        // 6. Limpa a sessão de recuperação
        req.session.destroy();

        // 7. Redireciona para o login com mensagem de sucesso
        res.redirect('/login?success=true'); 

    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        res.render('TROCARSENHA/redefinir', {
            title: 'Redefinir Senha',
            erro: 'Erro ao salvar a nova senha. Tente novamente.'
        });
    }
});

export default router;




