// app.js

// Ce fichier contient la configuration de l'application Express.
const express = require('express');

const app = express();

app.use(express.json());

module.exports = app;