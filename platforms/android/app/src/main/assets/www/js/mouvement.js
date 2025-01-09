// mouvement.js
import { ws } from './ws.js';
import gameState from './gameState.js';

let selectedPiece = null;
let mustJump = false;

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

        case 'continuousJump':
            if (data.currentPlayer === localStorage.getItem('username')) {
                updateGameStatus("Vous pouvez continuer à capturer!");
            } else {
                updateGameStatus(`${data.currentPlayer} peut continuer à capturer`);
            }
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

    if (to.querySelector('svg')) {
        resetSelection();
        return;
    }

    const fromRow = parseInt(from.dataset.row);
    const fromCol = parseInt(from.dataset.col);
    const toRow = parseInt(to.dataset.row);
    const toCol = parseInt(to.dataset.col);

    const isJumpMove = Math.abs(fromRow - toRow) === 2;

    let canContinueJump = false;
    if (isJumpMove) {
        const tempTo = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
        if (tempTo) {
            tempTo.innerHTML = from.innerHTML;
            const furtherJumps = findAvailableJumps(tempTo);
            canContinueJump = furtherJumps.length > 0;
            tempTo.innerHTML = '';
        }
    }
    if (!mouvemenValable(from, to)) {
        alert("Mouvement non valable.");
        resetSelection(); 
        return;
    }

    const roomId = localStorage.getItem('roomId');
    const move = { from: getCellPosition(from), to: getCellPosition(to) };
 
    ws.send(JSON.stringify({ action: 'move', roomId, move }));

    if (isJumpMove) {
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

        if (canContinueJump) {
            selectedPiece = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
            selectedPiece.classList.add('selected');
            mustJump = true;
            ws.send(JSON.stringify({
                action: 'continuousJump',
                roomId,
                position: {
                    row: toRow,
                    col: toCol
                }
            }));
        } else {
            ws.send(JSON.stringify({ 
                action: 'endTurn', 
                roomId 
            }));
            resetSelection();
            mustJump = false;
        }
    } else {
        ws.send(JSON.stringify({ 
            action: 'endTurn', 
            roomId 
        }));
        resetSelection();
        mustJump = false;
    }

    checkForWinner();
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

    const dx = Math.abs(fromRow - toRow);
    const dy = Math.abs(fromCol - toCol);

    if (dx !== dy) {
        return false;
    }

    if (!isKing) {
        const properDirection = isWhite ? (fromRow > toRow) : (fromRow < toRow);
        if (!properDirection) {
            return false;
        }
    }

    if (to.querySelector('svg')) {
        return false;
    }

    let hasAnyPieceJump = false;
    const playerColor = localStorage.getItem('playerColor');
    document.querySelectorAll('.cell').forEach(cell => {
        const playerPiece = cell.querySelector('svg');
        if (playerPiece && playerPiece.classList.contains(playerColor.toLowerCase())) {
            const jumps = findAvailableJumps(cell);
            if (jumps.length > 0) {
                hasAnyPieceJump = true;
            }
        }
    });

    const availableJumps = findAvailableJumps(from);
    console.log('Checking jumps:', availableJumps);
    if (hasAnyPieceJump){
        if (availableJumps.length > 0) {
            mustJump = true;
            return availableJumps.some(jump => 
                parseInt(jump.row) === toRow && parseInt(jump.col) === toCol
            );
        }
        return false;  
    }
    
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

    if (dx === 1 && dy === 1) {
        return true;
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
    const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
                      isWhite ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

    directions.forEach(([dx, dy]) => {
        if (isKing) {
            let currentRow = row;
            let currentCol = col;
            let foundEnemy = null;
            
            while (true) {
                currentRow += dx;
                currentCol += dy;
                
                if (currentRow < 0 || currentRow > 9 || currentCol < 0 || currentCol > 9) {
                    break;
                }

                const checkCell = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
                if (!checkCell) break;

                const checkPiece = checkCell.querySelector('svg');
                
                if (checkPiece) {
                    if (foundEnemy) {
                        break;
                    }
                    
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
                    availableJumps.push({
                        row: currentRow,
                        col: currentCol,
                        captured: foundEnemy
                    });
                }
            }
        } else {
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
                const targetPiece = targetCell.querySelector('svg');
                
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

function pieceAuBonJoueur(cell) {
    const playerColor = localStorage.getItem('playerColor');
    const piece = cell.querySelector('svg');
    if (!piece || !piece.classList.contains(playerColor.toLowerCase())) {
        return false;
    }

    const allPlayerPieces = document.querySelectorAll('.cell');
    let hasAnyPieceJump = false;
    allPlayerPieces.forEach(playerCell => {
        const playerPiece = playerCell.querySelector('svg');
        if (playerPiece && playerPiece.classList.contains(playerColor.toLowerCase())) {
            const jumps = findAvailableJumps(playerCell);
            if (jumps.length > 0) {
                hasAnyPieceJump = true;
            }
        }
    });

    if (hasAnyPieceJump) {
        const currentPieceJumps = findAvailableJumps(cell);
        if (currentPieceJumps.length === 0) {
            alert("Vous devez sélectionner une pièce qui peut capturer.");
            return false;
        }
    }

    return true;
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