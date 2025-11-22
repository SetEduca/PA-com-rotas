// src/routes/home.routes.js
import express from 'express';
// Ajuste o caminho para o seu supabase.js se necessário
import supabase from '../supabase.js'; 

const router = express.Router();

// Esta é a sua rota /home
router.get("/", async (req, res) => {
    try {
        // ========================================================
        // 1. BUSCANDO OS DADOS REAIS
        // ========================================================
        console.log("--- INICIANDO BUSCA DE TURMAS ---");
        
        // 1. Busca SEM filtro para ver o total real no banco
        let { count: totalNoBanco } = await supabase
            .from('turma') 
            .select('*', { count: 'exact', head: true });
        console.log("Total de turmas no banco (sem filtro):", totalNoBanco);

        // 2. Busca COM filtro 'ativo' = true
        let { count: turmaCount, error } = await supabase
            .from('turma') 
            .select('*', { count: 'exact', head: true })
            .eq('ativo', true); 

        if (error) {
            console.log("ERRO DO SUPABASE:", error.message);
        } else {
            console.log("Total de turmas ATIVAS encontradas:", turmaCount);
        }
        console.log("-----------------------------------");

        // ========================================================
        // 2. PASSANDO OS DADOS PARA O EJS
        // ========================================================
        res.render("HOME/home", {
            message: "Como podemos te ajudar hoje?",
            daycareName: "Minha Creche",
            professores: profCount || 0,
            alunos: alunoCount || 0,
            turmas: 100  // <--- MUDE AQUI PARA 100 (Manualmente)
        });
        
    } catch (error) {
        console.error("Erro ao carregar a rota /home:", error.message);
        
        // Se o Supabase falhar, enviamos dados de erro para a página não quebrar
        res.render("HOME/home", {
            message: "Erro ao carregar dados.",
            daycareName: "Erro",
            professores: '!',
            alunos: '!',
            turmas: '!'
        });
    }
});

// Exporte o roteador
export default router;