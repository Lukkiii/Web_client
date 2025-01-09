// Connexion WebSocket
import { initializeWebSocket, ws } from './ws.js';
import { handleWebSocketMessage } from './mouvement.js';

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isAuthenticated') === 'true') {
        const websocket = initializeWebSocket();
        websocket.onopen = () => {
            websocket.send(JSON.stringify({
                action: 'join',
                username: localStorage.getItem('username'),
                password: localStorage.getItem('password')
            }));
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});
