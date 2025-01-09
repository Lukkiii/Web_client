// ws.js : Gestion centralisée de WebSocket

let ws = null;

function initializeWebSocket() {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        ws = new WebSocket('ws://localhost:9898');

        ws.onopen = () => {
            console.log('Connecté au serveur WebSocket');

            if (window.handleWebSocketOpen) {
                window.handleWebSocketOpen();
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Message du serveur (ws.js):', data);
            
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
