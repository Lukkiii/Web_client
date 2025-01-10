// db.js

// Gestion de la connexion à la base de données MongoDB
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connexion à MongoDB réussie');
    } catch (error) {
        console.error('Échec de la connexion à MongoDB :', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
