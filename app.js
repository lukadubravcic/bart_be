const express = require('express');
const app = express();
const db = require('./app/config/db');

const UserController = require('./app/controllers/UserController');
app.use('/users', UserController);

module.exports = app;

