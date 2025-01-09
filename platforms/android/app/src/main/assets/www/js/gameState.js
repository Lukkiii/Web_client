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