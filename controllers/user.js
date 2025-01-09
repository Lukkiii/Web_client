//controllers/user.js
const User = require('../models/User');

// Inscription d'un utilisateur
const handleRegister = async (ws, data) => {
    try {
        const existingUser = await User.findOne({ username: data.username });
        if (existingUser) {
            ws.sendUTF(JSON.stringify({ action: 'register_failed', message: 'Nom d\'utilisateur déjà pris.' }));
            return;
        }

        await User.create({ username: data.username, password: data.password });
        ws.sendUTF(JSON.stringify({ action: 'register_success', message: 'Inscription réussie.' }));
    } catch (error) {
        ws.sendUTF(JSON.stringify({ action: 'error', message: 'Échec de l\'inscription.' }));
    }
};

// Connexion d'un utilisateur
const handleLogin = async (ws, data) => {
    try {

        if (ws.isAuthenticated) {
            console.warn(`Joueur déjà authentifié : ${ws.username}`);
            ws.sendUTF(JSON.stringify({
                action: 'info',
                message: 'Vous êtes déjà connecté.'
            }));
            return false;
        }

        const user = await User.findOne({ username: data.username });
        if (!user || !(await user.comparePassword(data.password))) {
            console.warn(`Échec de connexion : Nom d'utilisateur ou mot de passe incorrect.`);
            return false;
        }

        ws.isAuthenticated = true;
        ws.username = data.username;
        
        return true;
    } catch (error) {
        console.error(`Erreur de connexion : ${error.message}`);
        ws.sendUTF(JSON.stringify({ action: 'error', message: 'Erreur interne du serveur.' }));
        return false;
    }
};

module.exports = { handleRegister, handleLogin };
