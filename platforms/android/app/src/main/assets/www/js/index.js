import { initializeWebSocket, ws } from './ws.js';

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser la connexion WebSocket
    initializeWebSocket();

    // Récupérer les éléments du DOM
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');

    // Basculer vers le formulaire d'inscription
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
    });

    // Basculer vers le formulaire de connexion
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    // Gestion du bouton de connexion
    loginBtn.addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            alert('Veuillez remplir tous les champs de connexion');
            return;
        }

        ws.send(JSON.stringify({
            action: 'login',
            username,
            password
        }));
    });

    // Gestion du bouton d'inscription
    registerBtn.addEventListener('click', () => {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        if (!username || !password) {
            alert('Veuillez remplir tous les champs d\'inscription');
            return;
        }

        ws.send(JSON.stringify({
            action: 'register',
            username,
            password
        }));
    });
});

// Gestion des messages du serveur
window.handleWebSocketMessage = (data) => {

    switch (data.action) {
        // Inscription réussie
        case 'register_success':
            alert('Inscription réussie, veuillez vous connecter.');
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            break;

        // Inscription échouée
        case 'register_failed':
            console.warn('Inscription échouée.');
            alert(`Échec de l'inscription : ${data.message}`);
            break;

        // Connexion réussie
        case 'login_success':
            alert('Connexion réussie ! Rejoindre une partie...');
            localStorage.setItem('username', document.getElementById('login-username').value);
            localStorage.setItem('password', document.getElementById('login-password').value); 
            localStorage.setItem('isAuthenticated', 'true');
            setTimeout(() => {
                window.location.href = 'jeu.html';
            }, 100);
            break;

        // Connexion échouée
        case 'login_failed':
            console.warn('Connexion échouée.');
            alert(`Échec de la connexion : ${data.message}`);
            break;

        case 'error':
            console.error('Erreur :', data.message);
            alert('Erreur : ' + data.message);
            break;

        case 'info':
            console.warn('Info :', data.message);
            alert(data.message);
            break;

        default:
            console.warn('Action inconnue :', data.action);
    }
};


