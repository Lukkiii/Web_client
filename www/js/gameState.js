// gamesState.js

// Ce fichier contient un objet gameState qui contient les informations sur le joueur actuel 
// et les méthodes pour le mettre à jour.
const gameState = {
    joueur: localStorage.getItem('playerColor'),
    updateJoueur: function(newJoueur) {
        this.joueur = newJoueur;
        const joueurActuel = document.getElementById("joueurActu");
        if (joueurActuel) {
            joueurActuel.textContent = `Au tour de : ${this.joueur}`;
        }
    },
    changeJoueur: function() {
        this.updateJoueur(this.joueur === "Blanc" ? "Noir" : "Blanc");
    }
};

export default gameState;