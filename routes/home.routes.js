// src/routes/home.routes.js
import express from 'express';
import supabase from '../supabase.js'; // (Caminho '../' para voltar de 'routes' para 'src')

const router = express.Router();


// Esta rota agora é "/", porque o 'app.js'
// vai nos dar o prefixo '/home'.
//
// (app.use('/home', ...) + router.get('/', ...) = rota final '/home'
// ==========================================================
router.get("/", async (req, res) => {
    try {
        // (Sua lógica do Supabase aqui, se necessário)

        // Renderiza o EJS e passa a variável 'message'
        res.render("HOME/home", {
            message: "Como podemos te ajudar hoje?"
        });

    } catch (error) {
        console.error("Erro ao carregar a rota /home:", error.message);
        res.status(500).send("Erro interno do servidor.");
    }
});

// Exporte o roteador como "default"
export default router;