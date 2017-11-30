const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const sendNotification = require('../helpers/sendNotification');

const constants = require('../config/constants');
const appEvents = require('../config/config').events;

router.use(bodyParser.urlencoded({ extended: true }));

const User = require('../models/User');
const Pref = require('../models/Pref');
const Log = require('../models/Log');
const LogEvent = require('../models/LogEvent');

const EMAIL_MAX_LEN = 50;
const EMAIL_MIN_LEN = 5;
const PASSWORD_MAX_LEN = 20;
const PASSWORD_MIN_LEN = 3;
const USERNAME_MAX_LEN = 20;
const USERNAME_MIN_LEN = 4;

const PASSWORD_RESET_WAITTIME = 10 * 60 * 1000; // 10 Minutes

// DEV ONLY
router.get('/insertingEvents', (req, res) => {
    /* for (event in appEvents) {
        let ev = new LogEvent({
            _id: parseInt(appEvents[event].index),
            description: appEvents[event].description
        });
        ev.save();
    } */
});


router.post('/login', (req, res) => {

    if (!validateLogin(req.body)) return res.status(400).send('Validation error.')

    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) return res.json({ message: "Server error" });
        if (!user) {
            return res.json({ message: "User not found." });
        } else if (user) {
            if (!user.comparePassword(req.body.password)) {
                return res.json({ message: "Authentication failed. Wrong password." });
            } else {
                Pref.findOne({ fk_user_uid: user._id }, (err, pref) => {
                    return res.json({
                        token: jwt.sign({ email: user.email, username: user.username, _id: user.id }, 'salty'),
                        username: user.username,
                        email: user.email,
                        _id: user._id,
                        prefs: pref
                    });
                });
            }
        }
    });
});

router.post('/register', (req, res) => {

    if (!validateRegister(req.body)) return res.json('Validation error.');

    let newUser = new User(req.body);
    newUser.hash_password = bcrypt.hashSync(req.body.password, 10);

    newUser.save((err, user) => {
        if (err) {
            if (err.code === 11000) {
                return res.json({ errMsg: 'User with that email exists.' });
            }
            return res.status(400).send({
                message: err
            });
        } else {
            user.hash_password = undefined;
            let newPref = new Pref();
            newPref.fk_user_uid = user._id;
            newPref.save((err, pref) => {
                if (err) return res.json({ errMsg: 'There was a problem while creating new user.' });
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

        if (!validUsername(req.body.username)) return res.json(400, { errMsg: 'Username not valid.' });

        User.findOne({ username: req.body.username }, (err, user) => {

            if (err) return res.json({ errMsg: 'There was a problem finding the user.' });
            if (user) {
                // user postoji
                return res.json({ errMsg: 'Username taken.' });
            }
            // user doesnt exist (username not taken)
            User.findById(req.user._id, (err, user) => {

                if (err) return res.json({ errMsg: 'There was a problem finding the user.' });
                if (!user) return res.json({ errMsg: 'No user found' });

                if (user.username) return res.json({ errMsg: 'Cannot update user with existing username.' });

                else if (!user.username) {

                    user.username = req.body.username;

                    user.save((err, result) => {
                        if (err) return res.json({ errMsg: 'Error on saving username.' });
                        return res.send({
                            _id: user._id,
                            email: user.email,
                            username: user.username
                        });
                    });
                }
            });
        });
    } else {
        res.status(400).json('Unauthorized access.');
    }
});

router.post('/setNewPassword', (req, res) => {
    console.log(req.body);

    if (req.user) {
        User.findById(req.user._id, (err, user) => {
            if (err) return res.json({ message: 'Server error. Try again.' });
            else if (!user) return res.json({ message: 'Invalid action.' });
            else if (!user.comparePassword(req.body.currentPassword)) return res.json({ message: 'Authentication failed. Wrong password.' });
            else if (req.body.newPassword !== req.body.reNewPassword) return res.json({ message: 'Provided passwords don\'t match' });
            else if (!validPassword(req.body.newPassword)) return res.json({ message: 'New password invalid.' });

            user.hash_password = bcrypt.hashSync(req.body.newPassword, 10);
            user.save((err, result) => {
                if (err) return res.json({ message: 'Server error. Try again.' });
                return res.json({ message: 'Password changed.' });
            });
        });
    } else return res.json({ message: 'Unauthorized access.' });

});

router.post('/forgot', (req, res) => {

    if (req.body.email === undefined) return res.json({ message: 'No email provided.' });

    const passwordResetEventId = appEvents.resetPasswordEvent.index;

    User.findOne({ email: req.body.email }, (err, user) => {

        if (err) return res.json({ message: 'Server error. Try again.' });
        if (!user) return res.json({ message: 'User not found.' });

        // provjeri ako već postoji log o pwd resetu

        Log.findOne({ fk_user_id: user._id, fk_log_events_uid: passwordResetEventId }, (err, log) => {
            if (err) return res.json({ message: 'Server error. Try again.' });
            if (log) {
                return res.json({ message: 'Mail is already sent.' })
            }

            let newLog = new Log({
                fk_user_id: user._id,
                fk_log_events_uid: passwordResetEventId
            });

            newLog.save((err, result) => {
                if (err) return res.json({ message: 'Server error. Try again.' });
                if (!result) return res.json({ message: 'Server error. Try again.' });

                sendNotification(0, user.email, 0, constants.passwordResetConfirmation, result._id).then((isMailSent) => {

                    console.log(`\nMail sent: ${isMailSent}\n`);

                    if (isMailSent) {
                        return res.json({ message: 'Temporary password is sent to your email.' });

                    } else {
                        // mail nije poslan, pa pobrisi kreiran log
                        result.remove();
                        return res.json({ message: 'Error on sending mail. Try again.' });
                    }

                }, (rejected) => {
                    return res.json({ message: 'Server error. Try again.' });
                });
            });
        });
    });
});

router.get('/reset/:logId', (req, res) => {
    
    const logId = req.params.logId;

    Log.findById(logId, (err, log) => {
        if (err) return res.status(505).send('You are doing something wrong.');
        if (!log) return res.status(400).send('Invalid access.');
       
        if (isPwdResetReqInvalid(log)) {

            if (typeof log.get('done') === 'undefined') {

                // markaj done
                log.set('done', Date.now());                

                log.save((err, result) => {
                    console.log(result);
                });


            }
        }


    });

});



/* router.get('/:id', (req, res) => {

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
}); */

module.exports = router;


function validateLogin(loginData) {
    console.log(loginData)
    // email
    if (!validEmail(loginData.email)) return false;
    //password
    else if (!validPassword(loginData.password)) return false;

    return true;
}

function validateRegister(registerData) {

    console.log(registerData);
    if (!validUsername(registerData.username)) return false;

    else if (!validEmail(registerData.email)) return false;

    else if (!validPassword(registerData.password)) return false;

    return true;
}

function isMail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validUsername(username) {
    if (username.length < USERNAME_MIN_LEN || username.length > PASSWORD_MAX_LEN) return false;
    return true;
}

function validEmail(email) {
    if ((email.length < EMAIL_MIN_LEN || email.length > EMAIL_MAX_LEN) && !isMail(email)) return false;
    return true;
}

function validPassword(password) {
    if (password.length < PASSWORD_MIN_LEN || password.length > PASSWORD_MAX_LEN) return false;
    return true;
}

function isPwdResetReqInvalid(log) {

    if (typeof log.done !== 'undefined') return true;

    if (log.fk_log_events_uid !== appEvents.resetPasswordEvent.index) return true;

    const msTimeSinceCreated = Date.now() - (new Date(log.when).getTime());

    if (msTimeSinceCreated > PASSWORD_RESET_WAITTIME) return true;

    return false;
}

