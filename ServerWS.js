// ServerWS.js 
const http = require('http');
const app = require('./app.js');
const connectDB = require('./db.js');
const WebSocketServer = require('websocket').server;

const { handleRegister, handleLogin } = require('./controllers/user');
const { handleJoin, handleMove, handleDisconnect, handleCapture, handleKing, handleContinuousJump, handleEndTurn, handleEnd } = require('./controllers/gameController');

connectDB();

const PORT = 9898;

// Création du serveur WebSocket
const server = http.createServer(app);
// Création du serveur WebSocket
const wsServer = new WebSocketServer({ httpServer: server });

wsServer.on('request', (request) => {
    const ws = request.accept(null, request.origin);
    console.log('Connexion WebSocket établie.');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.utf8Data);

            switch (data.action) {
                case 'ping':
                    ws.send(JSON.stringify({ action: 'pong' }));
                    break;
                case 'register':
                    await handleRegister(ws, data);
                    break;
                case 'login':
                    const loginSuccess = await handleLogin(ws, data);
                    if (loginSuccess) {
                        console.log(`Joueur ${data.username} connecté avec succès.`);
                        ws.sendUTF(JSON.stringify({ action: 'login_success', message: 'Connexion réussie!' }));
                    } else {
                        console.warn(`Échec de connexion pour ${data.username}`);
                        ws.sendUTF(JSON.stringify({ action: 'login_failed', message: 'Identifiants invalides.' }));
                    }
                    break;
                case 'join':
                    if (ws.isAuthenticated) {
                        handleJoin(ws);
                    } else {
                        const loginSuccess = await handleLogin(ws, data);
                        if (loginSuccess) {
                            handleJoin(ws);
                        }
                    }
                    break;
                case 'move':
                    handleMove(ws, data);
                    break;

                case 'continuousJump':
                    handleContinuousJump(ws, data);
                    break;
                
                case 'endTurn':
                    handleEndTurn(ws, data);
                    break;
                
                case 'capture':
                    handleCapture(ws, data);
                    break;

                case 'becomeKing':
                    handleKing(ws, data);
                    break;

                case 'end':
                    handleEnd(ws, data);
                    break;

                default:
                    console.warn('Action non reconnue:', data.action);
                    ws.sendUTF(JSON.stringify({ action: 'error', message: 'Action non reconnue.' }));
            }
        } catch (error) {
            console.error('Erreur lors du traitement du message:', error);
            ws.send(JSON.stringify({ error: 'Erreur interne du serveur.' }));
        }
    });

    ws.on('close', () => {
        console.log(`Connexion fermée avec le joueur : ${ws.username || 'Inconnu'}`);
        handleDisconnect(ws);
    });
    
    ws.on('error', (error) => {
        console.error('Erreur WebSocket :', error);
    });
});

server.listen(PORT, '0.0.0.0',() => {
    console.log(`Serveur WebSocket en écoute sur le port ${PORT}`);
});

