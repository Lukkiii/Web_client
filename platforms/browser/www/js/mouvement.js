// mouvement.js
import { ws } from './ws.js';
import gameState from './gameState.js';

let selectedPiece = null;
let mustJump = false;
let jumpedPieces = [];

export function handleWebSocketMessage(data) {
    console.log(`Action received: ${data.action}`);
    switch (data.action) {
        case 'waiting_opponent':
            updateGameStatus("En attente d'un autre joueur...");
            break;

        case 'assignColor':
            handleColorAssignment(data);
            break;

        case 'start':
            updateGameStatus("La partie commence !");
            break;

        case 'update':
            handleMove(data.move);
            break;

        case 'changePlayer':
            gameState.updateJoueur(data.currentPlayer === localStorage.getItem('username') ? localStorage.getItem('playerColor') : (localStorage.getItem('playerColor') === "Blanc" ? "Noir" : "Blanc"));
            updateGameStatus(`Au tour de : ${gameState.joueur}`);
            break;

        case 'capture':
            handleCapture(data.position);
            break;
        
        case 'becomeKing':
            handleKing(data.position);
            break;

        case 'end':
            updateGameStatus(`${data.winner} a gagné !`);
            break;

        case 'error':
            alert(`Erreur : ${data.message}`);
            break;

        default:
            console.warn('Action inconnue:', data.action);
            break;
    }
};

function updateGameStatus(message) {
    document.getElementById('joueurActu').innerText = message;
}

function handleColorAssignment(data) {
    console.log(`Couleur assignée : ${data.maCouleur}`);
    localStorage.setItem('roomId', data.roomId);
    localStorage.setItem('playerColor', data.maCouleur);
    gameState.updateJoueur(data.maCouleur);
    document.getElementById('player-info').innerText = `Joueur : ${localStorage.getItem('username')} | Couleur : ${data.maCouleur}`;
}

function handleMove(move) {
    const { from, to } = move;
    const fromCell = document.querySelector(`[data-row="${from.row}"][data-col="${from.col}"]`);
    const toCell = document.querySelector(`[data-row="${to.row}"][data-col="${to.col}"]`);

    if (fromCell && toCell) {
        const piece = fromCell.innerHTML;
        fromCell.innerHTML = '';
        toCell.innerHTML = piece;

        const movedPiece = toCell.querySelector('svg');
        if (movedPiece) {
            const row = parseInt(to.row);
            const isWhite = movedPiece.classList.contains('blanc');
            
            if ((isWhite && row === 0) || (!isWhite && row === 9)) {
                const roomId = localStorage.getItem('roomId');
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

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", function() {
            console.log("Cell clicked:", cell);
            if (selectedPiece) {
                if (this === selectedPiece) {
                    resetSelection();
                    return;
                }
                movePiece(selectedPiece, this);
            } else if (pieceAuBonJoueur(cell)) {
                selectedPiece = cell;
                cell.classList.add('selected');
            }
        });
    });
});

function movePiece(from, to) {
    const currentPlayer = gameState.joueur;
    const playerColor = localStorage.getItem('playerColor');

    // Vérifier si c'est le tour du joueur
    if (currentPlayer !== playerColor || gameState.joueur !== playerColor) {
        alert("Ce n'est pas votre tour.");
        resetSelection(); 
        return;
    }

    const piece = from.querySelector('svg');
    if (!piece) {
        resetSelection();
        return;
    }

    // Vérifier si le mouvement est valide
    if (!mouvemenValable(from, to)) {
        alert("Mouvement non valable.");
        resetSelection(); 
        return;
    }

    const roomId = localStorage.getItem('roomId');
    const move = { from: getCellPosition(from), to: getCellPosition(to) };
    // Envoyer le mouvement au serveur
    ws.send(JSON.stringify({ action: 'move', roomId, move }));

    from.classList.remove('selected');
    resetSelection();

    const fromRow = parseInt(from.dataset.row);
    const fromCol = parseInt(from.dataset.col);
    const toRow = parseInt(to.dataset.row);
    const toCol = parseInt(to.dataset.col);

    // Vérifier si une pièce a été capturée
    if (Math.abs(fromRow - toRow) === 2) {
        const midRow = (fromRow + toRow) / 2;
        const midCol = (fromCol + toCol) / 2;
        const capturedPiece = document.querySelector(`[data-row="${midRow}"][data-col="${midCol}"]`);
        
        if (capturedPiece && capturedPiece.querySelector('svg')) {
            ws.send(JSON.stringify({
                action: 'capture',
                roomId,
                position: {
                    row: midRow,
                    col: midCol
                }
            }));
        }
    }

    const newCell = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
    const furtherJumps = findAvailableJumps(newCell);
    
    // Si un autre saut est possible, sélectionnez la pièce et continuez
    if (furtherJumps.length > 0) {
        selectedPiece = newCell;
        newCell.classList.add('selected');
        mustJump = true;
    } else {
        resetSelection();
        mustJump = false;
        checkForWinner();
    }
}

function handleCapture(position) {
    const capturedCell = document.querySelector(
        `[data-row="${position.row}"][data-col="${position.col}"]`
    );
    if (capturedCell) {
        capturedCell.innerHTML = '';
    }
}

function handleKing(position) {
    const cell = document.querySelector(
        `[data-row="${position.row}"][data-col="${position.col}"]`
    );
    if (cell) {
        const piece = cell.querySelector('svg');
        if (piece) {
            const isWhite = piece.classList.contains('blanc');
            piece.innerHTML = `
                <circle cx="25" cy="25" r="20" fill="${isWhite ? 'white' : 'black'}"/>
                <text x="25" y="32" text-anchor="middle" fill="gold" font-size="20" font-weight="bold">♔</text>
            `;
            piece.style.stroke = 'gold';
            piece.style.strokeWidth = '3';
        }
    }
}

function resetSelection() {
    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    }
    document.querySelectorAll('.cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
}


function getCellPosition(cell) {
    return { row: cell.dataset.row, col: cell.dataset.col };
}

function mouvemenValable(from, to) {
    const fromRow = parseInt(from.dataset.row);
    const fromCol = parseInt(from.dataset.col);
    const toRow = parseInt(to.dataset.row);
    const toCol = parseInt(to.dataset.col);

    const piece = from.querySelector('svg');
    const isWhite = piece.classList.contains('blanc');
    const isKing = piece.classList.contains('king');

    const properDirection = isKing ? true : 
                          isWhite ? (fromRow > toRow) : (fromRow < toRow);
    
    if (!properDirection) {
        return false;
    }

    const dx = Math.abs(parseInt(from.dataset.row) - parseInt(to.dataset.row));
    const dy = Math.abs(parseInt(from.dataset.col) - parseInt(to.dataset.col));

    const availableJumps = findAvailableJumps(from);
    if (availableJumps.length > 0) {
        mustJump = true;
        return availableJumps.some(jump => 
            jump.row === toRow && jump.col === toCol
        );
    }

    if (dx === 1 && dy === 1 && !mustJump) {
        return to.innerHTML === '';
    }

    return false;
}

function findAvailableJumps(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const piece = cell.querySelector('svg');

    if (!piece) {
        return [];
    }

    const isWhite = piece.classList.contains('blanc');
    const isKing = piece.classList.contains('king');

    const availableJumps = [];
    const directions = isKing ? [-1, 1] : isWhite ? [-1] : [1];

    directions.forEach(dx => {
        [-1, 1].forEach(dy => {
            const midRow = row + dx;
            const midCol = col + dy;
            const targetRow = row + (dx * 2);
            const targetCol = col + (dy * 2);
            
            if (targetRow < 0 || targetRow > 9 || targetCol < 0 || targetCol > 9) {
                return;
            }
            
            const midCell = document.querySelector(`[data-row="${midRow}"][data-col="${midCol}"]`);
            const targetCell = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);
            
            if (midCell && targetCell) {
                const midPiece = midCell.querySelector('svg');
                if (midPiece && 
                    ((isWhite && midPiece.classList.contains('noir')) || 
                     (!isWhite && midPiece.classList.contains('blanc'))) && 
                    targetCell.innerHTML === '') {
                        availableJumps.push({
                            row: targetRow,
                            col: targetCol,
                            captured: midCell
                    });
                }
            }
        });
    });
    
    return availableJumps;
}

function pieceAuBonJoueur(cell) {
    const playerColor = localStorage.getItem('playerColor');
    const piece = cell.querySelector('svg');
    if (piece && piece.classList.contains(playerColor.toLowerCase())) {
        return true;
    }
    return false;
}

function checkForWinner() {
    let whitePieces = 0;
    let blackPieces = 0;
    
    document.querySelectorAll('.cell').forEach(cell => {
        const piece = cell.querySelector('svg');
        if (piece) {
            if (piece.classList.contains('blanc')) whitePieces++;
            if (piece.classList.contains('noir')) blackPieces++;
        }
    });
    
    if (whitePieces === 0) {
        endGame('Noir');
    } else if (blackPieces === 0) {
        endGame('Blanc');
    }
}

function endGame(winner) {
    const roomId = localStorage.getItem('roomId');
    ws.send(JSON.stringify({
        action: 'end',
        roomId,
        winner
    }));
}