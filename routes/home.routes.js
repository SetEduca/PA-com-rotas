// src/routes/home.routes.js
import express from 'express';
// Ajuste o caminho para o seu supabase.js (../sai da pasta 'routes')
import supabase from '../supabase.js'; 

const router = express.Router();

// Esta é a sua rota /home
router.get("/", async (req, res) => {
    try {
        // ========================================================
        // 1. VAMOS BUSCAR OS DADOS REAIS AQUI
        // (Substitua 'professor', 'aluno', 'turma' pelos nomes reais das suas tabelas)
        // ========================================================
        
        let { count: profCount } = await supabase
            .from('professor')
            .select('*', { count: 'exact', head: true });

        let { count: alunoCount } = await supabase
            .from('aluno')
            .select('*', { count: 'exact', head: true });

        let { count: turmaCount } = await supabase
            .from('turma')
            .select('*', { count: 'exact', head: true });

        // ========================================================
        // 2. VAMOS PASSAR OS DADOS (E A MENSAGEM) PARA O EJS
        // (Isto corrige AMBOS os erros)
        // ========================================================
        res.render("HOME/home", {
            message: "Como podemos te ajudar hoje?",
            daycareName: "Minha Creche", // <-- Substitui "Creche Exemplo!"
            professores: profCount || 0, // Passa a contagem de professores
            alunos: alunoCount || 0,     // Passa a contagem de alunos
            turmas: turmaCount || 0      // Passa a contagem de turmas
        });

    } catch (error) {
        console.error("Erro ao carregar a rota /home:", error.message);
        
        // Se o Supabase falhar, enviamos dados de erro
        res.render("HOME/home", {
            message: "Erro ao carregar dados.",
            daycareName: "Erro",
            professores: '!',
            alunos: '!',
            turmas: '!'
        });
    }
});

// Exporte o roteador como "default"
export default router;