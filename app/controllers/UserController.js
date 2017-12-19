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
const Score = require('../models/Score');
const Punishment = require('../models/Punishment');

const EMAIL_MAX_LEN = 50;
const EMAIL_MIN_LEN = 5;
const PASSWORD_MAX_LEN = 20;
const PASSWORD_MIN_LEN = 3;
const USERNAME_MAX_LEN = 20;
const USERNAME_MIN_LEN = 4;

const PASSWORD_RESET_WAITTIME = 10 * 60 * 1000; // 10 Minutes


router.get('/confirm', (req, res) => {

    if (typeof req.query.id === 'undefined' || req.query.id === "") {
        return res.status(400).send('Invalid request.');
    }

    User.findById(req.query.id, (err, user) => {

        if (err) {
            return res.status(500).send('Server error.');

        } else if (!user) {
            return res.status(400).send('User not found.');

        } else if (typeof user.confirmed !== 'undefined' && user.confirmed !== null) {
            return res.status(400).send('User already confirmed.');
        }

        user.confirmed = Date.now();

        user.save((err, result) => {
            if (err) return res.status(500).send('Server error.');

            res.redirect(/* constants.APP_ADRRESS */ 'http://localhost:3000');

            sendNotification(0, user.email, 0, constants.signup);
        });
    });
});

router.post('/register', (req, res) => {

    const validate = validateRegister(req.body);

    if (validate === false) return res.json({ errMsg: 'Invalid form data.' })
    else if (validate !== true) return res.json({ errMsg: validate });

    // provjeri postoji li vec username ("manualna" provjera jel je dopustena vrijednost null -> potencijalno za vise usera)
    User.findOne({ username: req.body.username }, (err, user) => {
        if (err) return res.json({ errMsg: 'Server error. Try again.' });
        if (user && user.username !== '') return res.json({ errMsg: 'Username taken.' });

        let newUser = new User(req.body);
        newUser.hash_password = bcrypt.hashSync(req.body.password, 10);

        newUser.save((err, user) => {
            if (err) {

                if (err.code === 11000) {
                    return res.json({ errMsg: 'User with that email exists.' });
                }
                return res.json({ errMsg: 'Server error. Try again.' });

            } else {
                user.hash_password = undefined;

                let newPref = new Pref();
                newPref.fk_user_uid = user._id;

                newPref.save((err, pref) => {
                    if (err) return res.json({ errMsg: 'There was a problem while creating new user.' });
                });

                sendNotification(null, user.email, null, constants.confirmAccount).then(mailSent => {
                    if (mailSent) return res.json({ message: 'Confirmation email has been sent to your email address.' });
                    else return res.json({ errMsg: 'Mail was not delivered.' });
                });
            }
        });
    });
});

router.post('/guest', (req, res) => {

    User.findById(req.body.userId, (err, user) => {
        if (err) return res.status(500).send('Server error.');
        if (!user) return res.status(400).send('User does not exist.');

        // provjera jel invited korisnik
        // if (typeof user.username !== 'undefined' && user.username !== null) return res.json({ msg: 'Invalid user.' });

        Punishment.findById(req.body.punishmentId, (err, punishment) => {
            if (err) return res.json({ msg: 'Server error.' });
            if (!punishment) return res.json({ msg: 'Punishment does not exist.' });
            if (punishment.fk_user_email_taking_punishment != user.email) return res.json({ msg: 'Invalid access.' });
            if (typeof punishment.done !== 'undefined' && punishment.done !== null) return res.json({ msg: 'Accessing completed punishment.' });

            return res.json({ guestPunishment: punishment, guestUser: { email: user.email, username: user.username } });
        });
    });
});

router.post('/login', (req, res) => {

    const validate = validateLogin(req.body);

    // VALIDACIJA TEMP ISKLJUCENA
    // if (validate !== true) return res.json({ message: validate });

    const loginEventId = appEvents.loginEvent.index;

    if (typeof req.body.email !== 'undefined') {

        User.findOne({ email: req.body.email }, (err, user) => {
            if (err) return res.json({ message: "Server error" });
            if (!user) {
                return res.json({ message: "User not found." });
            } else if (user) {
                if (!user.comparePassword(req.body.password)) {
                    return res.json({ message: "Authentication failed. Wrong password." });

                } if (typeof user.confirmed === 'undefined' || user.confirmed === null) {
                    return res.json({ message: 'Account needs to be confirmed. Check your email.' });

                } else {
                    Pref.findOne({ fk_user_uid: user._id }, (err, pref) => {

                        if (err) return res.json({ message: 'Server error' });

                        let rank = 'unknown';

                        Score.find().sort({ points: -1 }).then(scores => {

                            scores.forEach((score, index) => {
                                if (score.fk_user_id == user._id) rank = index + 1;
                            });

                            res.json({
                                token: jwt.sign({ email: user.email, username: user.username, _id: user.id }, 'salty'),
                                username: user.username,
                                email: user.email,
                                _id: user._id,
                                prefs: pref,
                                rank: rank
                            });

                            let loginLog = new Log({
                                fk_user_id: user._id,
                                fk_log_events_uid: loginEventId
                            });

                            loginLog.save();
                        });
                    });
                }
            }
        });

    } else if (typeof req.body.username !== 'undefined') {

        User.findOne({ username: req.body.username }, (err, user) => {
            if (err) return res.json({ message: "Server error" });
            if (!user) {
                return res.json({ message: "User not found." });
            } else if (user) {
                if (!user.comparePassword(req.body.password)) {
                    return res.json({ message: "Authentication failed. Wrong password." });

                } if (typeof user.confirmed === 'undefined' || user.confirmed === null) {
                    return res.json({ message: 'Account needs to be confirmed. Check your email.' });

                } else {
                    Pref.findOne({ fk_user_uid: user._id }, (err, pref) => {

                        if (err) return res.json({ message: 'Server error' });

                        let rank = 'unknown';

                        Score.find().sort({ points: -1 }).then(scores => {

                            scores.forEach((score, index) => {
                                if (score.fk_user_id == user._id) rank = index + 1;
                            });

                            res.json({
                                token: jwt.sign({ email: user.email, username: user.username, _id: user.id }, 'salty'),
                                username: user.username,
                                email: user.email,
                                _id: user._id,
                                prefs: pref,
                                rank: rank
                            });

                            let loginLog = new Log({
                                fk_user_id: user._id,
                                fk_log_events_uid: loginEventId
                            });

                            loginLog.save();
                        });
                    });
                }
            }
        });
    } else return res.json({ message: 'Form data invalid.' });
});

router.post('/logout', (req, res) => {

    if (typeof req.user === 'undefined') return res.status(400).send('Invalid action');

    const logoutEventId = appEvents.logoutEvent.index;

    let logoutLog = new Log({
        fk_user_id: req.user._id,
        fk_log_events_uid: logoutEventId
    });

    logoutLog.save().then(logged => {
        return res.status(200).send('Logout action received');

    }, err => {
        return res.status(500).send('Error');
    });
});


router.get('/', (req, res) => {

    if (req.user) {
        User.findById(req.user._id, (err, user) => {
            if (err) return res.status(500).send('Error fetching user data.');
            if (!user) return res.status(400).send("No user found.");
            else {
                // posalji user data (napravljen je page refresh ili pristup stranici dok token jos postoji)
                let rank = 'unknown';

                Score.find().sort({ points: -1 }).then(scores => {

                    scores.forEach((score, index) => {
                        if (score.fk_user_id == user._id) rank = index + 1;
                    });

                    Pref.findOne({ fk_user_uid: user._id }, (err, pref) => {
                        if (pref) {
                            return res.json({
                                _id: user._id,
                                email: user.email,
                                username: user.username,
                                rank: rank,
                                pref: pref
                            });
                        } else {
                            return res.json({
                                _id: user._id,
                                email: user.email,
                                username: user.username,
                                rank: rank
                            });
                        }
                    });
                });
            }
        });
    } else {
        res.status(400).send('Authentication failed.');
    }
});


router.post('/username', (req, res) => {

    if (req.user && req.body.username) {

        const validate = validateUsername(req.body.username);

        if (validate !== true) return res.json({ errMsg: validate });

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

router.post('/guestUsername', (req, res) => {

    if (req.body.username && req.body.email) {

        const validate = validateUsername(req.body.username);

        if (validate !== true) return res.json({ errMsg: validate });

        User.findOne({ username: req.body.username }, (err, user) => {

            if (err) return res.json({ errMsg: 'There was a problem finding the user.' });
            if (user) {
                // user postoji
                return res.json({ errMsg: 'Username taken.' });
            }
            // user doesnt exist (username not taken)
            User.findOne({ email: req.body.email }, (err, user) => {

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

        // provjeri ako već postoji aktivni log o pwd resetu

        Log.find({ fk_user_id: user._id, fk_log_events_uid: passwordResetEventId }, (err, logs) => {
            if (err) return res.json({ message: 'Server error. Try again.' });

            if (logs.length) {

                logs.map((log, index) => {
                    // ako postoji AKTIVAN zahtjev za resetom pwda 

                    if (!isPwdResetReqInvalid(log)) { // valid request
                        return res.json({ message: 'Password reset request already sent. Check your email.' });
                    }
                });
            }

            let newLog = new Log({
                fk_user_id: user._id,
                fk_log_events_uid: passwordResetEventId
            });

            newLog.save((err, result) => {
                if (err) return res.json({ message: 'Server error. Try again.' });
                if (!result) return res.json({ message: 'Server error. Try again.' });

                sendNotification(0, user.email, 0, constants.passwordResetConfirmation, result._id).then((isMailSent) => {

                    // console.log(`\nMail sent: ${isMailSent}\n`);

                    if (isMailSent) {
                        return res.json({ message: 'Temporary password is sent to your email.' });

                    } else {
                        // mail nije poslan, pa pobrisi kreiran log
                        result.remove();
                        return res.json({ message: 'Error on sending mail. Try again.' });
                    }

                }, rejected => {
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

        // provjera jel zahtjev validan (moguce da se ponavlja ili je istekao vremenski interval)
        if (isPwdResetReqInvalid(log)) {

            if (typeof log.get('done') === 'undefined') {
                // u slucaju (istekao vremenski interval) da nije markan kao obavljen -> markaj
                log.set('done', Date.now());
                log.save();
            }
            return res.status(400).send('Invalid request.');

        } else {

            User.findById(log.fk_user_id).then(user => {

                if (!user) return res.status(400).send('User not found.');

                const newPwd = Math.random().toString(36).substr(2, 8);

                sendNotification(0, user.email, 0, constants.newPassword, 0, newPwd).then(isMailSent => {

                    if (!isMailSent) return res.status(500).send('Error on sending mail. Try again.');

                    user.hash_password = bcrypt.hashSync(newPwd, 10);

                    user.save((err, result) => {
                        log.set('done', Date.now());
                        log.save((err, result) => {
                            return res.redirect(constants.APP_ADRRESS);
                        });
                    });

                }, err => {
                    console.log('ERR: sendNotification');
                });

            }, err => {
                return res.status(500).send('Server error. Try again.');
            });
        }
    });
});


module.exports = router;


function validateLogin(loginData) {

    const loggedWithUsername = typeof loginData.username !== 'undefined' ? true : typeof loginData.email !== 'undefined' ? false : null;

    let valMsg = '';
    let usernameOrMailValid;


    if (loggedWithUsername === null) {
        usernameOrMailValid = false;

    } else if (loggedWithUsername) {
        usernameOrMailValid = validateUsername(loginData.username);

    } else {
        usernameOrMailValid = validateEmail(loginData.email);
    }


    let passwordValid = validatePassword(loginData.password);

    if (usernameOrMailValid !== true) valMsg = valMsg + usernameOrMailValid;

    if (passwordValid !== true) {
        if (valMsg.length) valMsg = valMsg + " " + passwordValid;
        else valMsg = valMsg + passwordValid;
    }

    if (valMsg !== '') return valMsg;
    else return true;
}

function validateRegister(registerData) {

    if (typeof registerData.email === 'undefined' || typeof registerData.username === 'undefined' || typeof registerData.password === 'undefined') return false;

    let valMsg = '';

    let emailValid = validateEmail(registerData.email);
    let usernameValid = typeof registerData.username !== 'undefined' && registerData.username !== '' ? validateUsername(registerData.username) : true;
    let passwordValid = validatePassword(registerData.password);


    if (emailValid !== true) valMsg = valMsg + emailValid;

    if (usernameValid !== true) {
        if (valMsg.length) valMsg = valMsg + " " + usernameValid;
        else valMsg = valMsg + usernameValid;
    }

    if (passwordValid !== true) {
        if (valMsg.length) valMsg = valMsg + " " + passwordValid;
        else valMsg = valMsg + passwordValid;
    }


    if (valMsg !== '') return valMsg;
    else return true;
}

function isMail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validateUsername(username) { // Username must be between 8 and 20 characters, alphanumeric characters with underscores, periods and hyphens, space ne radi
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9-_\.]{2,20}$/;

    if (usernameRegex.test(username)) {
        return true;

    } else return 'Username needs to be 3 to 20 characters long.';
}

function validateEmail(email) {
    if (!isMail(email)) return 'Invalid email format.';
    return true;
}

function validatePassword(password) { // password between 6 to 20 characters which contain at least one numeric digit, one uppercase, and one lowercase letter
    const pwdRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

    if (pwdRegex.test(password)) {
        return true;

    } else return 'Password needs to be between 6 to 20 characters long, contain at least one numeric digit, one uppercase and one lowercase letter.';
}

function isPwdResetReqInvalid(log) {

    if (typeof log.get('done') !== 'undefined') return true;

    if (log.fk_log_events_uid !== appEvents.resetPasswordEvent.index) return true;

    const msTimeSinceCreated = Date.now() - (new Date(log.when).getTime());

    if (msTimeSinceCreated > PASSWORD_RESET_WAITTIME) return true;

    return false;
}

