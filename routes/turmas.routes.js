// Importa a biblioteca 'express'. Express é uma ferramenta para Node.js que nos ajuda
// a criar servidores web e APIs de forma muito mais fácil e organizada.
import express from 'express';

// Importa o cliente 'supabase' que configuramos em outro arquivo (../supabase.js).
// O Supabase é uma plataforma que nos oferece um banco de dados e outras ferramentas.
// Usamos este cliente para nos comunicarmos com nosso banco de dados.
import supabase from '../supabase.js';

// Cria um objeto "roteador" do Express. Pense nisso como um mini-aplicativo
// que pode agrupar rotas relacionadas (neste caso, tudo relacionado a "turmas").
// Depois, podemos conectar este roteador ao nosso aplicativo principal.
const router = express.Router();

// --- ROTA PARA LISTAR TODAS AS TURMAS ATIVAS ---
// Define uma rota que responde a requisições do tipo GET na URL "/turmas".
// Por exemplo, quando alguém acessa "http://meusite.com/turmas" no navegador.
router.get("/", async (req, res) => {
    // Aqui, estamos fazendo uma consulta ao banco de dados Supabase.
    // O "await" pausa a execução da função até que o banco de dados responda.
    const { data, error } = await supabase
        .from('turma') // Seleciona a tabela chamada 'turma'.
        .select(`
            id, 
            nome_turma, 
            ano_letivo, 
            limite_vagas, 
            quantidade_alunos,
            professor ( nome ) 
        `) // Pede para trazer colunas específicas. Note que para 'professor',
           // estamos pegando apenas o 'nome' da tabela de professores relacionada.
        .eq('ativo', true) // Filtra os resultados, trazendo apenas as turmas onde a coluna 'ativo' é 'true'.
        .order('nome_turma'); // Ordena os resultados em ordem alfabética pelo nome da turma.

    // Verifica se a consulta ao banco de dados retornou algum erro.
    if (error) {
        // Se houve um erro, ele é exibido no console do servidor para o desenvolvedor ver.
        console.error("Erro ao buscar turmas:", error);
        // E envia uma resposta de erro (código 500) para o navegador do usuário.
        return res.status(500).send("Erro no servidor.");
    }
    // Se tudo deu certo, renderiza (cria e envia) a página HTML "acessar.ejs" (ou similar)
    // que está na pasta "TURMA". Além disso, passa os dados das turmas ('data') para a página,
    // para que possam ser exibidos em uma tabela ou lista.
    res.render("TURMA/acessar", { turmas: data });
});

// --- ROTA PARA EXIBIR O FORMULÁRIO DE CADASTRO DE UMA NOVA TURMA ---
// Define uma rota que responde a requisições GET na URL "/turmas/cadastro".
// Esta rota serve para mostrar a página com o formulário para o usuário preencher.
router.get("/cadastro", async (req, res) => {
    try {
        // Usa `Promise.all` para fazer duas buscas no banco de dados ao mesmo tempo,
        // o que é mais eficiente do que fazer uma e depois a outra.
        const [professoresRes, mensalidadesRes] = await Promise.all([
            // Busca 1: Pega o 'id' e o 'nome' de todos os professores que estão 'ativos'.
            supabase.from('professor').select('id, nome').eq('ativo', true),
            // Busca 2: Pega todas as informações da tabela 'mensalidade'.
            supabase.from('mensalidade').select('id, faixa_etaria, valor, turno')
        ]);

        // Verifica se alguma das duas buscas no banco de dados resultou em erro.
        if (professoresRes.error || mensalidadesRes.error) {
            // Se houver erro, lança uma exceção com uma mensagem.
            throw new Error('Erro ao buscar dados para o formulário.');
        }

        // Se as buscas foram bem-sucedidas, renderiza a página de cadastro "cadastro.ejs".
        // Passa a lista de professores e de mensalidades para a página,
        // para que possam ser usadas para preencher menus de seleção (dropdowns) no formulário.
        res.render("TURMA/cadastro", {
            professores: professoresRes.data,
            mensalidades: mensalidadesRes.data
        });
    } catch (err) {
        // Se qualquer erro ocorrer dentro do bloco 'try', ele será capturado aqui.
        console.error(err); // Mostra o erro no console do servidor.
        res.status(500).send(err.message); // Envia uma mensagem de erro para o usuário.
    }
});

// --- ROTA PARA PROCESSAR O CADASTRO DA NOVA TURMA (SALVAR NO BANCO) ---
// Define uma rota que responde a requisições POST na URL "/turmas/cadastro".
// Essa rota é chamada quando o usuário preenche o formulário e clica em "Salvar".
router.post("/cadastro", async (req, res) => {
    // Pega os dados enviados pelo formulário. Esses dados vêm no corpo (body) da requisição.
    const { nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id } = req.body;
    
    // Executa o comando para inserir um novo registro na tabela 'turma' do banco de dados.
    const { error } = await supabase.from('turma').insert([{
        nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id
    }]);

    // Verifica se ocorreu algum erro durante a inserção no banco de dados.
    if (error) {
        console.error("Erro ao cadastrar turma:", error);
        return res.status(500).send("Erro ao cadastrar turma.");
    }
    
    // Se a turma foi cadastrada com sucesso, redireciona o usuário de volta para a lista de turmas.
    res.redirect("/turmas");
});

// --- ROTA PARA EXIBIR O FORMULÁRIO DE EDIÇÃO DE UMA TURMA EXISTENTE ---
// Define uma rota que responde a requisições GET em "/turmas/editar/:id".
// O ":id" é um parâmetro dinâmico, ou seja, ele vai mudar dependendo da turma que queremos editar.
// Ex: /turmas/editar/1, /turmas/editar/2, etc.
router.get("/editar/:id", async (req, res) => {
    // Pega o ID da turma que veio na URL (nos parâmetros da requisição).
    const { id } = req.params;
    try {
        // Novamente, usa Promise.all para buscar 3 conjuntos de dados ao mesmo tempo.
        const [turmaRes, professoresRes, mensalidadesRes] = await Promise.all([
            // Busca 1: Os dados da turma específica que queremos editar.
            // O `.single()` garante que receberemos apenas um objeto, e não um array.
            supabase.from('turma').select('*').eq('id', id).single(),
            // Busca 2: A lista de todos os professores ativos (para o menu de seleção).
            supabase.from('professor').select('id, nome').eq('ativo', true),
            // Busca 3: A lista de todas as mensalidades (para o menu de seleção).
            supabase.from('mensalidade').select('id, faixa_etaria, valor, turno')
        ]);
        
        // Verifica se qualquer uma das três buscas resultou em erro.
        if (turmaRes.error || professoresRes.error || mensalidadesRes.error) {
           throw new Error('Erro ao buscar dados para edição.');
        }
        
        // Renderiza a página de edição "editar.ejs".
        // Passa os dados da turma específica e as listas de professores e mensalidades.
        // Assim, o formulário já vem preenchido com os dados atuais da turma.
        res.render("TURMA/editar", {
            turma: turmaRes.data,
            professores: professoresRes.data,
            mensalidades: mensalidadesRes.data
        });
    } catch (err) {
        // Captura e trata qualquer erro que possa ter ocorrido.
        console.error(err);
        res.status(500).send(err.message);
    }
});

// --- ROTA PARA PROCESSAR A ATUALIZAÇÃO DA TURMA (SALVAR AS ALTERAÇÕES) ---
// Define uma rota que responde a requisições POST em "/turmas/editar/:id".
// É chamada quando o usuário salva as alterações no formulário de edição.
router.post("/editar/:id", async (req, res) => {
    // Pega o ID da turma da URL.
    const { id } = req.params;
    // Pega os dados atualizados que vieram do formulário.
    const { nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id } = req.body;
    
    // Executa o comando para atualizar o registro no banco de dados.
    const { error } = await supabase.from('turma').update({
        nome_turma, professor_id, ano_letivo, limite_vagas, mensalidade_id
    }).eq('id', id); // A cláusula `.eq('id', id)` é o "WHERE" - garante que estamos atualizando a turma certa.

    // Verifica se houve erro na atualização.
    if (error) {
        console.error('Erro ao atualizar turma:', error);
        return res.status(500).send('Erro ao atualizar a turma.');
    }
    // Se deu tudo certo, redireciona o usuário para a lista de turmas.
    res.redirect('/turmas');
});

// --- ROTA PARA ARQUIVAR UMA TURMA (EXCLUSÃO LÓGICA) ---
// Define uma rota que responde a requisições POST para "/turmas/arquivar/:id".
// Isso é chamado quando o usuário clica em um botão "Arquivar".
router.post('/arquivar/:id', async (req, res) => {
    // Pega o ID da turma da URL.
    const { id } = req.params;
    
    // Isso é um "soft delete" (exclusão lógica). Em vez de apagar o registro do banco,
    // nós apenas o marcamos como inativo, mudando a coluna 'ativo' para 'false'.
    // Isso é útil para manter o histórico.
    const { error } = await supabase.from('turma').update({ ativo: false }).eq('id', id);

    // Verifica se ocorreu um erro ao tentar arquivar.
    if (error) {
        console.error('Erro ao arquivar turma:', error);
        return res.status(500).send('Erro ao arquivar a turma.');
    }
    
    // Se o arquivamento foi bem-sucedido, redireciona para a lista de turmas.
    res.redirect('/turmas');
});

// Exporta o roteador com todas as suas rotas definidas.
// Isso permite que o arquivo principal do nosso servidor (geralmente index.js ou app.js)
// importe e use este conjunto de rotas.
export default router;