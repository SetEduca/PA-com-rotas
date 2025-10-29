import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// Função para calcular a idade (vamos fazer isso no backend para manter o EJS limpo)
function calcularIdade(dataNasc) {
    if (!dataNasc) return 'Idade desconhecida';
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    return idade > 0 ? `${idade} anos` : `${idade} ano`;
}

// 1. ROTA GET: EXIBIR A PÁGINA DE ARQUIVADOS
router.get('/', async (req, res) => {
    // A consulta agora busca crianças e o nome do seu responsável principal
    const { data: criancasArquivadas, error } = await supabase
        .from('cadastro_crianca')
        .select(`
            *,
            responsavel ( nome, parentesco )
        `)
        .eq('ativo', false); // A chave é buscar onde 'ativo' é FALSE

    if (error) {
        console.error("Erro ao buscar crianças arquivadas:", error);
        return res.status(500).send("Erro no servidor.");
    }

    // Processamos os dados para facilitar o uso no EJS
    const dadosFormatados = criancasArquivadas.map(crianca => {
        const responsavelPrincipal = crianca.responsavel.find(r => r.parentesco === 'Mãe') || crianca.responsavel[0];
        return {
            ...crianca,
            idadeFormatada: calcularIdade(crianca.i_nascimento),
            responsavelPrincipalNome: responsavelPrincipal ? responsavelPrincipal.nome : 'Não encontrado'
        };
    });

    res.render('arquivados', { criancas: dadosFormatados });
});

// 2. ROTA POST: DESARQUIVAR UMA CRIANÇA
router.post('/desarquivar/:id', async (req, res) => {
    const { id } = req.params;

    // Usamos .update() para marcar a criança como ativa novamente
    const { error } = await supabase
        .from('cadastro_crianca')
        .update({ ativo: true })
        .eq('id', id);

    if (error) {
        console.error("Erro ao desarquivar criança:", error);
        return res.status(500).send("Erro ao desarquivar criança.");
    }

    // Redireciona de volta para a lista de arquivados (a criança sumirá de lá)
    res.redirect('/arquivados');
});

export default router;