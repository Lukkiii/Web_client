// ws.js : Gestion centralisée de WebSocket

let ws = null;

function initializeWebSocket() {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        // l'adresse IP doit être remplacée par l'adresse IP de votre serveur
        // pour tester sur un autre appareil, remplacez l'adresse IP par l'adresse IP de votre ordinateur
        ws = new WebSocket('ws://172.20.10.9:9898');

        ws.onopen = () => {
            console.log('Connecté au serveur WebSocket');

            // pour éviter la déconnexion du serveur
            setInterval(() => {
                ws.send(JSON.stringify({ action: 'ping' }));
            }, 30000);

            if (window.handleWebSocketOpen) {
                window.handleWebSocketOpen();
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Message du serveur (ws.js):', data);

            if (data.action === 'pong') {
                console.log('Pong received from server');
            }
            
            if (window.handleWebSocketMessage && event.isTrusted) {
                window.handleWebSocketMessage(data);
            }
        };

        ws.onerror = (error) => {
            console.error('Erreur WebSocket:', error);
        };

        ws.onclose = () => {
            console.warn('Connexion WebSocket fermée');
            setTimeout(initializeWebSocket, 2000);
            ws = null;
        };
    }
    return ws;
}



export { initializeWebSocket, ws };
