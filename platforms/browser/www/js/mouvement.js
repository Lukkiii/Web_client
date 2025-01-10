// mouvement.js
import { ws } from './ws.js';
import gameState from './gameState.js';

let selectedPiece = null;
let mustJump = false;

// Gestion des messages WebSocket
export function handleWebSocketMessage(data) {
    console.log(`Action received: ${data.action}`);
    switch (data.action) {
        // Actions du serveur : En attente d'un autre joueur
        case 'waiting_opponent':
            // Mise à jour du statut du jeu pour indiquer que l'on attend un autre joueur
            updateGameStatus("En attente d'un autre joueur...");
            break;

        // Actions du serveur : Assignation de couleur
        case 'assignColor':
            // Gestion de l'assignation de couleur
            handleColorAssignment(data);
            break;

        // Actions du serveur : La partie commence
        case 'start':
            // Mise à jour du statut du jeu pour indiquer que la partie commence
            updateGameStatus("La partie commence !");
            break;

        // Actions du serveur : Mouvement
        case 'update':
            // Gestion des mouvements
            handleMove(data.move);
            break;

        // Actions du serveur : Continuer à capturer
        case 'continuousJump':
            if (data.currentPlayer === localStorage.getItem('username')) {
                // Mise à jour du statut du jeu pour indiquer que le joueur peut continuer à capturer
                updateGameStatus("Vous pouvez continuer à capturer!");
            } else {
                // Mise à jour du statut du jeu pour indiquer que l'adversaire peut continuer à capturer
                updateGameStatus(`${data.currentPlayer} peut continuer à capturer`);
            }
            break;

        // Actions du serveur : Fin du tour du joueur
        case 'changePlayer':
            // Mise à jour du statut du jeu pour indiquer que le tour du joueur a changé
            gameState.updateJoueur(data.currentPlayer === localStorage.getItem('username') ? localStorage.getItem('playerColor') : (localStorage.getItem('playerColor') === "Blanc" ? "Noir" : "Blanc"));
            // Mise à jour du statut du jeu pour indiquer le joueur actuel
            updateGameStatus(`Au tour de : ${gameState.joueur}`);
            break;

        // Actions du serveur : Capture
        case 'capture':
            // Gestion des sauts pour la capture
            handleCapture(data.position);
            break;
        
        // Actions du serveur : Devenir une reine
        case 'becomeKing':
            handleKing(data.position);
            break;

        // Actions du serveur : Fin du jeu
        case 'end':
            updateGameStatus(`${data.winner} a gagné !`);
            break;

        // Actions du serveur : Erreur
        case 'error':
            alert(`Erreur : ${data.message}`);
            break;

        default:
            // Action inconnue
            console.warn('Action inconnue:', data.action);
            break;
    }
};

// Mise à jour du statut du jeu
function updateGameStatus(message) {
    document.getElementById('joueurActu').innerText = message;
}

// Gestion de l'assignation de couleur
function handleColorAssignment(data) {
    console.log(`Couleur assignée : ${data.maCouleur}`);
    localStorage.setItem('roomId', data.roomId);
    localStorage.setItem('playerColor', data.maCouleur);
    gameState.updateJoueur(data.maCouleur);
    document.getElementById('player-info').innerText = `Joueur : ${localStorage.getItem('username')} | Couleur : ${data.maCouleur}`;
}

// Gestion des mouvements
function handleMove(move) {
    const { from, to } = move;
    const fromCell = document.querySelector(`[data-row="${from.row}"][data-col="${from.col}"]`);
    const toCell = document.querySelector(`[data-row="${to.row}"][data-col="${to.col}"]`);

    if (fromCell && toCell) {
        const piece = fromCell.innerHTML;
        fromCell.innerHTML = '';
        toCell.innerHTML = piece;

        // vérifier si la pièce doit devenir une reine
        const movedPiece = toCell.querySelector('svg');
        if (movedPiece) {
            const row = parseInt(to.row);
            const isWhite = movedPiece.classList.contains('blanc');
            
            if ((isWhite && row === 0) || (!isWhite && row === 9)) {
                const roomId = localStorage.getItem('roomId');
                // envoyer un message pour devenir une reine
                ws.send(JSON.stringify({
                    action: 'becomeKing',
                    roomId,
                    position: {
                        row: row,
                        col: parseInt(to.col)
                    }
                }));
            }
        }
    } else {
        console.error('Déplacement non valide ou éléments de cellule non trouvés:', move);
    }
}

// Gestion des sauts
function handleCapture(position) {
    const capturedCell = document.querySelector(
        `[data-row="${position.row}"][data-col="${position.col}"]`
    );
    if (capturedCell) {
        capturedCell.innerHTML = '';
    }
}

// Gestion des pièces de type "Reine"
function handleKing(position) {
    const cell = document.querySelector(
        `[data-row="${position.row}"][data-col="${position.col}"]`
    );
    if (cell) {
        const piece = cell.querySelector('svg');
        if (piece) {
            const isWhite = piece.classList.contains('blanc');
            piece.classList.add('king');
            piece.innerHTML = `
                <circle cx="25" cy="25" r="20" fill="${isWhite ? 'white' : 'black'}"/>
                <text x="25" y="32" text-anchor="middle" fill="gold" font-size="20" font-weight="bold">♔</text>
            `;
            piece.style.stroke = 'gold';
            piece.style.strokeWidth = '3';
        }
    }
}

// Gestion des clics sur les cellules
document.addEventListener('DOMContentLoaded', function() {
    // Ajout d'un écouteur d'événements pour chaque cellule
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", function() {
            console.log("Cell clicked:", cell);
            // vérifier si une pièce est sélectionnée
            if (selectedPiece) {
                // vérifier si la cellule est déjà sélectionnée
                if (this === selectedPiece) {
                    // réinitialiser la sélection
                    resetSelection();
                    return;
                }
                // sinon déplacer la pièce
                movePiece(selectedPiece, this);
            // sinon vérifier si la pièce appartient au bon joueur
            } else if (pieceAuBonJoueur(cell)) {
                // sélectionner la pièce
                selectedPiece = cell;
                cell.classList.add('selected');
            }
        });
    });
});

// Fonction pour déplacer une pièce
function movePiece(from, to) {
    const currentPlayer = gameState.joueur;
    const playerColor = localStorage.getItem('playerColor');

    // vérifier si c'est le tour du joueur
    if (currentPlayer !== playerColor || gameState.joueur !== playerColor) {
        alert("Ce n'est pas votre tour.");
        resetSelection();
        return;
    }

    const piece = from.querySelector('svg');
    // vérifier si la pièce existe
    if (!piece) {
        resetSelection();
        return;
    }

    if (to.querySelector('svg')) {
        resetSelection();
        return;
    }

    const toRow = parseInt(to.dataset.row);
    const toCol = parseInt(to.dataset.col);

    // vérifier si le joueur doit capturer
    const jumps = findAvailableJumps(from);
    const currentJump = jumps.find(jump =>
        parseInt(jump.row) === toRow && parseInt(jump.col) === toCol
    );
    const isJumpMove = currentJump !== undefined;

    // vérifier si le mouvement est valide
    if (!mouvemenValable(from, to)) {
        alert("Mouvement non valable.");
        resetSelection();
        return;
    }

    // envoyer le mouvement au serveur
    const roomId = localStorage.getItem('roomId');
    const move = { from: getCellPosition(from), to: getCellPosition(to) };
    ws.send(JSON.stringify({ action: 'move', roomId, move }));

    // gestion des sauts
    if (isJumpMove) {
        if (currentJump && currentJump.captured) {
            // vérifier si le jeu est terminé
            let whitePieces = 0;
            let blackPieces = 0;
            document.querySelectorAll('.cell').forEach(cell => {
                if (cell.dataset.row === String(currentJump.captured.row) &&
                    cell.dataset.col === String(currentJump.captured.col)) {
                    return;
                }
                const piece = cell.querySelector('svg');
                if (piece) {
                    if (piece.classList.contains('blanc')) whitePieces++;
                    if (piece.classList.contains('noir')) blackPieces++;
                }
            });

            if (whitePieces === 0 || blackPieces === 0) {
                endGame(whitePieces === 0 ? 'Noir' : 'Blanc');
                return;
            }

            // envoyer un message de capture
            ws.send(JSON.stringify({
                action: 'capture',
                roomId,
                position: currentJump.captured
            }));
        }

        // vérifier si le joueur peut continuer à capturer
        const tempTo = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
        if (tempTo) {
            tempTo.innerHTML = from.innerHTML;
            const furtherJumps = findAvailableJumps(tempTo);
            // vérifier si le joueur peut continuer à capturer
            const canContinueJump = furtherJumps.some(jump => {
                // vérifier si la pièce capturée est différente de la pièce capturée précédemment
                return jump.captured && 
                    !(jump.captured.row === currentJump.captured.row && 
                        jump.captured.col === currentJump.captured.col);
            });
            tempTo.innerHTML = '';

            if (canContinueJump) {
                selectedPiece = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
                selectedPiece.classList.add('selected');
                mustJump = true;
                ws.send(JSON.stringify({
                    action: 'continuousJump',
                    roomId,
                    position: { row: toRow, col: toCol }
                }));
                return;
            }
        }
    }

    // fin du tour
    ws.send(JSON.stringify({ action: 'endTurn', roomId }));
    resetSelection();
    mustJump = false;
}

// Fonction pour obtenir la position de la cellule
function getCellPosition(cell) {
    return { row: cell.dataset.row, col: cell.dataset.col };
}

// Fonction pour réinitialiser la sélection
function resetSelection() {
    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    }
    document.querySelectorAll('.cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
}

// Fonction pour vérifier si le mouvement est valide
function mouvemenValable(from, to) {
    const fromRow = parseInt(from.dataset.row);
    const fromCol = parseInt(from.dataset.col);
    const toRow = parseInt(to.dataset.row);
    const toCol = parseInt(to.dataset.col);

    const piece = from.querySelector('svg');
    const isWhite = piece.classList.contains('blanc');
    const isKing = piece.classList.contains('king');

    const dx = Math.abs(fromRow - toRow);
    const dy = Math.abs(fromCol - toCol);

    // vérifier le diagonale
    if (dx !== dy) {
        return false;
    }

    if (!isKing) {
        // vérifier la direction pour les pièces normales
        const properDirection = isWhite ? (fromRow > toRow) : (fromRow < toRow);
        if (!properDirection) {
            return false;
        }
    }

    // vérifier si la cellule de destination est vide
    if (to.querySelector('svg')) {
        return false;
    }

    // vérifier si le joueur doit capturer
    let availableJumps = [];
    let hasAnyPieceJump = false;
    const playerColor = localStorage.getItem('playerColor');

    // vérifier tous les pièces si le joueur doit capturer
    document.querySelectorAll('.cell').forEach(cell => {
        const playerPiece = cell.querySelector('svg');
        if (playerPiece && playerPiece.classList.contains(playerColor.toLowerCase())) {
            const jumps = findAvailableJumps(cell);
            // vérifier si la pièce peut capturer
            if (cell === from) {
                availableJumps = jumps;
            }
            if (jumps.length > 0) {
                hasAnyPieceJump = true;
            }
        }
    });

    console.log('Checking jumps:', availableJumps);
    if (hasAnyPieceJump) {
        if (availableJumps.length > 0) {
            mustJump = true;
            return availableJumps.some(jump =>
                parseInt(jump.row) === toRow && parseInt(jump.col) === toCol
            );
        }
        return false;
}
    // vérifier si la reine peut bouger
    if (isKing) {
        const rowStep = toRow > fromRow ? 1 : -1;
        const colStep = toCol > fromCol ? 1 : -1;
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow && currentCol !== toCol) {
            const cell = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
            if (cell && cell.querySelector('svg')) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }
        return true;
    }

    // vérifier si la pièce normale peut bouger
    if (dx === 1 && dy === 1) {
        return true;
    }

    return false;
}

// Fonction pour trouver les sauts disponibles
function findAvailableJumps(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const piece = cell.querySelector('svg');

    // vérifier si la pièce existe
    if (!piece) {
        return [];
    }

    const isWhite = piece.classList.contains('blanc');
    const isKing = piece.classList.contains('king');

    const availableJumps = [];
    const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
                      isWhite ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

    directions.forEach(([dx, dy]) => {
        // vérifier si la reine peut capturer
        if (isKing) {
            let currentRow = row;
            let currentCol = col;
            let foundEnemy = null;
            
            while (true) {
                currentRow += dx;
                currentCol += dy;
                
                // vérifier les limites du plateau
                if (currentRow < 0 || currentRow > 9 || currentCol < 0 || currentCol > 9) {
                    break;
                }

                const checkCell = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
                if (!checkCell) break;

                const checkPiece = checkCell.querySelector('svg');
                
                // vérifier si la cellule de la destination n'est pas vide
                if (checkPiece) {
                    // vérifier si on trouve déjà une pièce de l'adversaire
                    if (foundEnemy) {
                        break;
                    }
                    
                    // vérifier si la cellule contient une pièce de l'adversaire
                    if ((isWhite && checkPiece.classList.contains('noir')) || 
                        (!isWhite && checkPiece.classList.contains('blanc'))) {
                        foundEnemy = {
                            row: currentRow,
                            col: currentCol
                        };
                    } else {
                        break;
                    }
                } else if (foundEnemy) {
                    // vérifier si la cellule de destination est vide et qu'on a déjà trouvé une pièce de l'adversaire
                    availableJumps.push({
                        row: currentRow,
                        col: currentCol,
                        captured: foundEnemy
                    });
                }
            }
        } else {
            // vérifier si la pièce normale peut capturer
            const midRow = row + dx;
            const midCol = col + dy;
            const targetRow = row + (dx * 2);
            const targetCol = col + (dy * 2);
            
            // vérifier les limites du plateau
            if (targetRow < 0 || targetRow > 9 || targetCol < 0 || targetCol > 9) {
                return;
            }
            
            const midCell = document.querySelector(`[data-row="${midRow}"][data-col="${midCol}"]`);
            const targetCell = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);
            
            // vérifier si la cellule intermédiaire et la cellule cible existent
            if (midCell && targetCell) {
                const midPiece = midCell.querySelector('svg');
                const targetPiece = targetCell.querySelector('svg');
                
                // vérifier si la cellule intermédiaire contient une pièce de l'adversaire
                if (midPiece && !targetPiece &&
                    ((isWhite && midPiece.classList.contains('noir')) || 
                        (!isWhite && midPiece.classList.contains('blanc')))) {
                    availableJumps.push({
                        row: targetRow,
                        col: targetCol,
                        captured: {
                            row: midRow,
                            col: midCol
                        }
                    });
                }
            }
        }
    });
    
    console.log('Available jumps for piece at', row, col, ':', availableJumps);
    
    return availableJumps;
}

// Fonction pour vérifier si la pièce appartient au bon joueur
function pieceAuBonJoueur(cell) {
    const playerColor = localStorage.getItem('playerColor');
    const piece = cell.querySelector('svg');

    // vérifier si la pièce existe et si elle appartient au joueur
    if (!piece || !piece.classList.contains(playerColor.toLowerCase())) {
        return false;
    }

    // vérifier si le joueur doit capturer
    let hasAnyPieceJump = false;
    let currentPieceCanJump = false;
    
    // vérifier toutes les pièces si le joueur doit capturer
    document.querySelectorAll('.cell').forEach(playerCell => {
        const playerPiece = playerCell.querySelector('svg');
        if (playerPiece && playerPiece.classList.contains(playerColor.toLowerCase())) {
            const jumps = findAvailableJumps(playerCell);
            if (jumps.length > 0) {
                hasAnyPieceJump = true;
                if (playerCell === cell) {
                    currentPieceCanJump = true;
                }
            }
        }
    });

    // vérifier si le joueur doit capturer
    if (hasAnyPieceJump && !currentPieceCanJump) {
        alert("Vous devez sélectionner une pièce qui peut capturer.");
        return false;
    }

    return true;
}

// Fonction pour terminer le jeu
function endGame(winner) {
    const roomId = localStorage.getItem('roomId');
    ws.send(JSON.stringify({
        action: 'end',
        roomId,
        winner
    }));
}
