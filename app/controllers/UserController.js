const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const sendNotification = require('../helpers/sendNotification');
const constants = require('../config/constants');

router.use(bodyParser.urlencoded({ extended: true }));

const User = require('../models/User');
const Pref = require('../models/Pref');

router.post('/login', (req, res) => {

    console.log(req.body);
    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) return res.status(500).send({ message: err });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        } else if (user) {
            if (!user.comparePassword(req.body.password)) {
                return res.status(401).json({ message: "Authentication failed. Wrong password." });
            } else {
                Pref.findOne({ fk_user_uid: user._id }, (err, pref) => {
                    return res.json({
                        token: jwt.sign({ email: user.email, username: user.username, _id: user.id }, 'salty'),
                        username: user.username,
                        _id: user._id,
                        prefs: pref
                    });

                });
            }
        }
    });
});

router.post('/register', (req, res) => {
    console.log(req.body);
    let newUser = new User(req.body);
    newUser.hash_password = bcrypt.hashSync(req.body.password, 10);
    newUser.save((err, user) => {
        if (err) {
            if (err.code === 11000) {
                return res.status(400).send('User with that email exists.');
            }
            return res.status(400).send({
                message: err
            });
        } else {
            user.hash_password = undefined;
            let newPref = new Pref();
            newPref.fk_user_uid = user._id;
            newPref.save((err, pref) => {
                if (err) return res.status(500).json('There was a problem while creating new user.');
                res.json(user);
            });
            return sendNotification(req.body._id, user.email, 0, constants.signup);
        }
    });
});

router.get('/', (req, res) => {

    if (req.user) {
        User.findById(req.user._id, (err, user) => {
            if (err) return res.status(500).send('Error fetching user data.');
            if (!user) return res.status(400).send("No user found.");
            else {
                // posalji user data (napravljen je page refresh)
                res.send({
                    _id: user._id,
                    email: user.email,
                    username: user.username
                });
            }
        });
    } else {
        res.status(400).send('Authentication failed.');
    }
});


router.post('/username', (req, res) => {

    if (req.user && req.body.username) {
        User.findById(req.user._id, (err, user) => {
            if (err) return res.status(500).send('There was a problem finding the user.');
            if (!user) return res.status(400).send('No user found');

            if (user.username) return res.status(400).send('Cannot update user with existing username.');

            else if (!user.username) {

                user.username = req.body.username;
                user.save((err, result) => {
                    if (err) return res.status(500).send('Error on saving username.');
                    return res.send({
                        _id: user._id,
                        email: user.email,
                        username: user.username
                    });
                });
            }
        });
    } else {
        res.status(400).json('Unauthorized access.');
    }
});

router.get('/:id', (req, res) => {

    User.findById(req.params.id, (err, user) => {
        if (err) return res.status(500).send("There was a problem finding the user.");
        if (!user) return res.status(404).send("No user found.");
        res.status(200).send(user);
    });
});

router.delete('/:id', (req, res) => {

    User.findByIdAndRemove(req.params.id, (err, user) => {
        if (err) return res.status(500).send("There was a problem finding the user.");
        res.status(200).send("User " + user.name + " was deleted");
    });
});

router.put('/:id', (req, res) => {

    User.findByIdAndUpdate(req.params.id, req.body, { new: true }, (err, user) => {
        if (err) return res.status(500).send("There was a problem updating the user.");
        res.status(200).send(user);
    });
});

module.exports = router;