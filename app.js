var User = require('./app/models/User'),
    jwt = require('jsonwebtoken'),
    cors = require('cors');

const express = require('express');
const app = express();
const db = require('./app/config/db');

const UserController = require('./app/controllers/UserController');

app.use(cors());

app.use((req, res, next) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
        jwt.verify(req.headers.authorization.split(' ')[1], 'salty', (err, decode) => {
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
// http://expressjs.com/en/guide/using-middleware.html - dodati da se prije izvrsavanja određenih ruta provjeri login status:
/* loginRequired = (req, res, next) =>{
    if (req.user) next();
    else return res.status(401).json({message: 'Unauthorized user.'});
}; */
module.exports = app;

