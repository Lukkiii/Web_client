# Web_client

# Commande pour démarrer notre jeu de dame

### Prérequis

- Node.js
- npm
- MongoDB 

### Installation

1. Clonez le dépôt :

    ```bash
    git clone https://github.com/Lukkiii/Web_client.git
    cd votre-repo
    ```

2. Configurez les variables d'environnement :

    Créez un fichier `.env` à la racine du projet s'il n'existe pas et ajoutez votre URI MongoDB：

    ```env
    MONGO_URI=your_mongodb_uri
    PORT=9898
    ```

3. Installer les modules nécessaire si n'a pas encore fait : 
    ```bash
    npm install dotenv
    ```
    ```bash
    npm install express
    ```
    ```bash
    npm install bcryptjs
    ```
4. Créer un dossier mongodb/data pour la base de données dans le répertoire racine et changer le chemin dans le fichier mongod.conf
```properties
    storage:
      dbPath: chemin/mongodb/data
```

5. Obtenir l'IP du réseau local de l'ordinateur
- windows
    ```bash
    ipconfig
    ```
- mac
    ```bash
    ifconfig
    ```

6. Modifier dans le fichier www/js/ws.js : Utiliser l'adresse IP du réseau local de l'ordinateur
    ```javascript
    const ws = new WebSocket('ws://TonAdresseIP:9898');
    ```

### Démarrage du serveur

1. Démarrez la base de données

    ```bash
    mongod --config mongod.conf
    ```

2. Démarrez le serveur WebSocket :

    ```bash
    node ServerWS.js
    ```

3. Démarrez le côté client

- sur browser
    ```bash
    cordova run
    ```

- sur android
    ```bash
    cordova build android
    ```

    ```bash
    cordova run android
    ```

### Structure du projet

- `www/`
  - `index.html` : Le fichier HTML principal pour l'inscription et la connexion.
  - `jeu.html` : Le fichier HTML principal pour le jeu de dame.
  - `js/` : Dossier contenant les fichiers JavaScript pour la logique du jeu.
    - `ws.js` : Gestion centralisée de WebSocket.
    - `gameState.js` : Gestion de l'état du jeu.
    - `mouvement.js` : Gestion des mouvements des pièces.
    - `platoBase.js` : Initialisation du plateau de jeu.
    - `jeu.js` : Logique principale du jeu.
    - `index.js` : Gestion des inscriptions et des connexions des joueurs.
  - `css/` : Dossier contenant les fichiers CSS pour le style.
    - `index.css` : Fichier CSS pour le style de la page de connexion.
    - `style.css` : Fichier CSS pour le style du jeu.

- `controllers/` : Dossier contenant les contrôleurs pour gérer les actions des utilisateurs et du jeu.
  - `user.js` : Contrôleur pour l'inscription et la connexion des utilisateurs.
  - `gameController.js` : Contrôleur pour gérer les actions du jeu (rejoindre, déplacer, capturer, etc.).

- `models/` : Dossier contenant les modèles de données.
  - `User.js` : Modèle de données pour les utilisateurs.

- `serverws.js` : Serveur WebSocket pour gérer les connexions des joueurs.
- `app.js` : Configuration de l'application Express.
- `db.js` : Connexion à la base de données MongoDB.
- `mongod.conf` : Fichier de configuration pour MongoDB
- `.env` : Fichier de configuration des variables d'environnement
- `.gitignore` : Fichier pour ignorer les fichiers et dossiers spécifiques dans Git.
- `README.md` : Ce fichier, contenant des instructions sur la façon de démarrer le jeu et une vue d'ensemble de la structure du projet.

### Fonctionnalités

- **Connexion WebSocket** : Permet aux joueurs de se connecter et de jouer en temps réel.
- **Gestion des mouvements** : Permet aux joueurs de déplacer leurs pièces selon les règles du jeu de dame.
- **Gestion des captures** : Permet aux joueurs de capturer les pièces adverses.
- **Promotion en dame** : Permet aux pièces d'être promues en dame lorsqu'elles atteignent l'autre côté du plateau.
- **Vérification de la victoire** : Vérifie si un joueur a gagné la partie.

