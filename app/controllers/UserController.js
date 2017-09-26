const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));

const User = require('../models/User');


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
                return res.json({ token: jwt.sign({ email: user.email, name: user.name, _id: user.id }, 'salty'), username: user.name, _id: user._id });
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
            return res.json(user);
        }
    });
});

router.get('/', (req, res) => {

    const user = req.user;
    console.log(req.user);
    if (user !== undefined) {
        res.json(user);
        console.log(res.body);
    } else {
        res.status(400).send('Authentication failed.');
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