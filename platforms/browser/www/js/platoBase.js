const board = document.querySelector('.board');
for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.setAttribute('data-row', row);
        cell.setAttribute('data-col', col);
        if ((row + col) % 2 === 0) {
            cell.classList.add('white-cell');
        } else {
            cell.classList.add('black-cell');
            if (row < 4) {
                cell.innerHTML = '<svg class="noir" width="50" height="50"><circle cx="25" cy="25" r="20"/></svg>';
            } else if (row > 5) {
                cell.innerHTML = '<svg class="blanc" width="50" height="50"><circle cx="25" cy="25" r="20"/></svg>';
            }
        }
        board.appendChild(cell);
    }
}