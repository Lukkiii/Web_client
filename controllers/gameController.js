// controller/gameController.js

let rooms = {}; // Gestion des salles
let waitingPlayers = []; // Liste d'attente des joueurs

//Gestion ajout joueur file d'attente
function handleJoin(ws) {
    if (!ws.isAuthenticated || !ws.username) {
        ws.sendUTF(JSON.stringify({
            action: 'error',
            message: 'Vous devez être connecté pour rejoindre une partie.'
        }));
        return;
    }

    console.log(`joueur ${ws.username} rejoint la file d'attente..., ${waitingPlayers.length} joueurs en attente.`);

    //Ajoute le joueur à la file d'attente s'il n'y est pas déjà 
    if (!waitingPlayers.includes(ws)) {
        waitingPlayers.push(ws);
        
        //Si un seul joueur est dans la file d'attente, elle est alerté par un message d'attente
        if (waitingPlayers.length === 1) {
            ws.sendUTF(JSON.stringify({
                action: 'waiting_opponent',
                message: 'En attente d\'un adversaire...'
            }));
        } else {
            matchPlayers(); //Une partie se créée entre les deux joueurs
        }
    }
}

// Associer deux joueurs
function matchPlayers() {

    //Vérifie qu'il ait au moins deux joueurs de connectés
    while (waitingPlayers.length >= 2) {

        //Récupère et supprime les joueurs de la file d'attente suivant la logique "First In, First Out"
        const player1 = waitingPlayers.shift();
        const player2 = waitingPlayers.shift();

        //Vérification nom joueurs valides ou non 
        if (!player1.username || !player2.username) {
            console.error('Impossible de créer une salle : Joueur1 ou Joueur2 a un nom invalide.');
            continue;
        }

        //Création de la salle de jeu
        const roomId = `salle-${Date.now()}`;
        rooms[roomId] = {
            players: [player1, player2],
            currentPlayer: player1
        };

        console.log(`Salle créée : ${roomId} | Joueur1: ${player1.username}, Joueur2: ${player2.username}`);

        // Attribution d'une couleur au joueur (premier des deux joueurs connecté joue les blancs)
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

    //vérification si c'est bien le tour du joueur qui essaye de jouer
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


//Gestion des tours
function handleEndTurn(ws, data) {
    const { roomId } = data;
    const room = rooms[roomId];

    //Message si clique lorsque joueur dans la file d'attente 
    if (!room) {
        ws.sendUTF(JSON.stringify({
            action: 'error',
            message: 'La partie n\'a pas encore commencé'
        }));
        return;
    }

    //Vérifie si c'est le tour du joueur (normalement c'est celui de handleMove qui est affiché)
    if (room.currentPlayer !== ws) {
        ws.sendUTF(JSON.stringify({
            action: 'error', 
            message: 'Ce n\'est pas votre tour'
        }));
        return;
    }

    // Changer de joueur actif
    room.currentPlayer = room.currentPlayer === room.players[0] ? room.players[1] : room.players[0];

    // Envoyer le changement de joueur à tous les joueurs
    room.players.forEach(player => {
        player.sendUTF(JSON.stringify({ action: 'changePlayer', currentPlayer: room.currentPlayer.username }));
    });
}

// Gestion des déconnexions
function handleDisconnect(ws) {
    console.log(`Joueur ${ws.username || 'Inconnu'} déconnecté.`);

    //Supprime le joueur de toutes les salles et file d'attente
    for (let roomId in rooms) {
        rooms[roomId].players = rooms[roomId].players.filter(player => player !== ws);
        if (rooms[roomId].players.length === 0) {
            console.log(`Salle ${roomId} supprimée (vide).`);
            delete rooms[roomId]; //Supprime la salle si elle est vide
        }
    }
    waitingPlayers = waitingPlayers.filter(player => player !== ws);
}


//Gestion des captures
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

//Gestion promotion dame
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

//Gestion fin de partie
function handleEnd(ws, data) {
    const { roomId, winner } = data;
    const room = rooms[roomId];
    
    //Informe les joueurs du gagnant
    if (room) {
        room.players.forEach(player => {
            player.sendUTF(JSON.stringify({
                action: 'end',
                winner: winner
            }));
        });
        //suppression de la salle
        delete rooms[roomId];
    }
}

//Export des fonctions
module.exports = { handleJoin, handleMove, handleDisconnect,handleCapture, handleKing, handleContinuousJump, handleEndTurn, handleEnd };
