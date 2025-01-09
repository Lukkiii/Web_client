// controller/gameController.js

let rooms = {}; // Gestion des salles
let waitingPlayers = []; // Liste d'attente des joueurs
function handleJoin(ws) {
    if (!ws.isAuthenticated || !ws.username) {
        ws.sendUTF(JSON.stringify({
            action: 'error',
            message: 'Vous devez être connecté pour rejoindre une partie.'
        }));
        return;
    }

    console.log(`joueur ${ws.username} rejoint la file d'attente..., ${waitingPlayers.length} joueurs en attente.`);

    if (!waitingPlayers.includes(ws)) {
        waitingPlayers.push(ws);
        
        if (waitingPlayers.length === 1) {
            ws.sendUTF(JSON.stringify({
                action: 'waiting_opponent',
                message: 'En attente d\'un adversaire...'
            }));
        } else {
            matchPlayers();
        }
    }
}

// Associer deux joueurs
function matchPlayers() {

    while (waitingPlayers.length >= 2) {

        const player1 = waitingPlayers.shift();
        const player2 = waitingPlayers.shift();

        if (!player1.username || !player2.username) {
            console.error('Impossible de créer une salle : Joueur1 ou Joueur2 a un nom invalide.');
            continue;
        }

        const roomId = `salle-${Date.now()}`;
        rooms[roomId] = {
            players: [player1, player2],
            currentPlayer: player1
        };

        console.log(`Salle créée : ${roomId} | Joueur1: ${player1.username}, Joueur2: ${player2.username}`);

        // Assigner les couleurs
        player1.sendUTF(JSON.stringify({ action: 'assignColor', maCouleur: 'Blanc', roomId }));
        player2.sendUTF(JSON.stringify({ action: 'assignColor', maCouleur: 'Noir', roomId }));

        // Démarrer la partie
        player1.sendUTF(JSON.stringify({ action: 'start', message: 'La partie commence !' }));
        player2.sendUTF(JSON.stringify({ action: 'start', message: 'La partie commence !' }));
    }
}

// Synchroniser les mouvements
function handleMove(ws, data) {
    const { roomId, move } = data;
    const room = rooms[roomId];
    if (!room) {
        ws.sendUTF(JSON.stringify({
            action: 'error',
            message: 'La partie n\'a pas encore commencé'
        }));
        return;
    }

    if (room.currentPlayer !== ws) {
        ws.sendUTF(JSON.stringify({
            action: 'error', 
            message: 'Ce n\'est pas votre tour'
        }));
        return;
    }

    console.log(`Déplacement reçu dans la salle ${roomId}:`, move);

    // Envoyer le mouvement à tous les joueurs
    room.players.forEach(player => {
        player.sendUTF(JSON.stringify({ action: 'update', move }));
    });

    // // Changer de joueur
    // room.currentPlayer = room.currentPlayer === room.players[0] ? room.players[1] : room.players[0];

    // // Envoyer le changement de joueur à tous les joueurs
    // room.players.forEach(player => {
    //     player.sendUTF(JSON.stringify({ action: 'changePlayer', currentPlayer: room.currentPlayer.username }));
    // });
}

function handleContinuousJump(ws, data) {
    const { roomId, position } = data;
    const room = rooms[roomId];
    
    if (!room) return;
    room.players.forEach(player => {
        player.sendUTF(JSON.stringify({
            action: 'continuousJump',
            position,
            currentPlayer: room.currentPlayer.username
        }));
    });
}


function handleEndTurn(ws, data) {
    const { roomId } = data;
    const room = rooms[roomId];
    if (!room) {
        ws.sendUTF(JSON.stringify({
            action: 'error',
            message: 'La partie n\'a pas encore commencé'
        }));
        return;
    }

    if (room.currentPlayer !== ws) {
        ws.sendUTF(JSON.stringify({
            action: 'error', 
            message: 'Ce n\'est pas votre tour'
        }));
        return;
    }

    // Changer de joueur
    room.currentPlayer = room.currentPlayer === room.players[0] ? room.players[1] : room.players[0];

    // Envoyer le changement de joueur à tous les joueurs
    room.players.forEach(player => {
        player.sendUTF(JSON.stringify({ action: 'changePlayer', currentPlayer: room.currentPlayer.username }));
    });
}

// Gestion des déconnexions
function handleDisconnect(ws) {
    console.log(`Joueur ${ws.username || 'Inconnu'} déconnecté.`);

    for (let roomId in rooms) {
        rooms[roomId].players = rooms[roomId].players.filter(player => player !== ws);
        if (rooms[roomId].players.length === 0) {
            console.log(`Salle ${roomId} supprimée (vide).`);
            delete rooms[roomId];
        }
    }
    waitingPlayers = waitingPlayers.filter(player => player !== ws);
}

function handleCapture(ws, data) {
    const { roomId, position } = data;
    const room = rooms[roomId];
    
    if (!room) return;
    
    room.players.forEach(player => {
        player.sendUTF(JSON.stringify({
            action: 'capture',
            position
        }));
    });
}

function handleKing(ws, data) {
    const { roomId, position } = data;
    const room = rooms[roomId];
    
    if (!room) return;
    
    room.players.forEach(player => {
        player.sendUTF(JSON.stringify({
            action: 'becomeKing',
            position
        }));
    });
}

function handleEnd(ws, data) {
    const { roomId, winner } = data;
    const room = rooms[roomId];
    
    if (room) {
        room.players.forEach(player => {
            player.sendUTF(JSON.stringify({
                action: 'end',
                winner: winner
            }));
        });
        
        delete rooms[roomId];
    }
}

module.exports = { handleJoin, handleMove, handleDisconnect,handleCapture, handleKing, handleContinuousJump, handleEndTurn, handleEnd };
