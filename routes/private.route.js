const privateRoute = (req, res, next) => {
    console.log("👮 SEGURANÇA NA PORTA: Tentativa de acesso em", req.originalUrl);
    
    // Verifica se a sessão existe
    if (!req.session) {
        console.log("❌ ERRO GRAVE: Sessão não encontrada (req.session é inexistente).");
        return res.redirect('/login');
    }

    console.log("🔍 Dados na sessão:", req.session.user ? "Usuário logado: " + req.session.user.nome : "Nenhum usuário logado");

    // Verifica se existe o usuário dentro da sessão
    if (req.session.user) {
        console.log("✅ Acesso LIBERADO. Pode entrar.");
        return next(); 
    } else {
        console.log("🚫 Acesso NEGADO. Redirecionando para /login...");
        return res.redirect('/login');
    }
};

export default privateRoute;