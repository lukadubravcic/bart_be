const User = require('./app/models/User'),
    jwt = require('jsonwebtoken'),
    cors = require('cors');

const express = require('express');
const app = express();
const db = require('./app/config/db');
const path = require('path');

var fs = require('fs');

const UserController = require('./app/controllers/UserController');
const GameController = require('./app/controllers/GameController');
const PrefController = require('./app/controllers/PrefController');

const SALT = 'salty';

app.use(cors());

app.use(express.static(path.join(__dirname, '/app/client/build')));

app.use((req, res, next) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
        jwt.verify(req.headers.authorization.split(' ')[1], SALT, (err, decode) => {
            if (err) req.user = undefined;
            req.user = decode;
            next();
        });
    } else {
        req.user = undefined;
        next();
    }
});

app.use('/users', UserController);

app.use('/punishment', GameController);

app.use('/prefs', PrefController);

app.get('/test', (req, res) => {
    res.send('jadwjdwajdas');
});

app.get('*', (req, res) => {
    console.log('TUTUTTUUTUTU')
    res.sendFile(path.join(__dirname + '/app/client/build/index.html'));
});


module.exports = app;

