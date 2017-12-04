const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const sendmail = require('sendmail')({
    logger: {
        debug: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    }
});
const sendNotification = require('../helpers/sendNotification');
const filterAcceptedPunishments = require('../helpers/filterAcceptedPunishments');
const validPunishmentWhatToWriteKeys = require('../helpers/validPunishmentChars');

const User = require('../models/User');
const Punishment = require('../models/Punishment');
const Try = require('../models/Try');
const SpecialPunishment = require('../models/SpecialPunishment');
const RandomPunishment = require('../models/RandomPunishment');
const Score = require('../models/Score');

const constants = require('../config/constants');
const BART_MAIL = constants.BART_MAIL;



let scoreboard = [];



router.use(bodyParser.urlencoded({ extended: true }));
/* router.use((req, res, next) => {
    console.log(req.user)
    next();
}); */

router.get('/sort', (req, res) => {
    Score.find().sort({ points: -1 }).then(scores => {
        scores.forEach((score,index)=>{
            console.log(score.points)
        });
    });
});

router.get('/accept', (req, res) => {

    if (req.query.id) {
        Punishment.findById(req.query.id, (err, punishment) => {

            if (err) return res.status(500).send('There was a problem finding punishment.');
            if (!punishment) return res.status(400).send('Punishment with that ID does not exist.');
            if (punishment.accepted) return res.status(400).send('Punishment already accepted.');

            punishment.accepted = Date.now();
            punishment.save((err, punishment) => {
                if (err) return res.status(500).send('There was a problem with setting punishment accepted.');

                //tmp:
                res.redirect(constants.APP_ADRRESS + '?id=' + punishment._id);

                // TODO: REDIREKT NA RUTU GDJE SE POSLUZUJE APP
            });
        });
    } else return res.status(400).send('Punishment ID isn\'t privided.')
});

router.get('/random', (req, res) => {

    RandomPunishment.find({}, (err, punishments) => {
        if (err) return res.status(500).send('There was a problem finding random punishments.')

        res.json(punishments);
    });

});

router.get('/special', (req, res) => {

    SpecialPunishment.find({}, (err, punishments) => {
        if (err) return res.status(500).send('There was a problem finding special punishments.')

        res.json(punishments);
    });

});

router.get('/accepted', (req, res) => {

    if (req.user) {
        Punishment.find({
            fk_user_email_taking_punishment: req.user.email,
            accepted: { $exists: true, $ne: null },
            given_up: null,
            failed: null,
            rejected: null,
            done: null
        }, (err, punishments) => {
            if (err) console.log(err);

            else if (punishments && punishments.length > 0) {

                acceptedPunishments = JSON.parse(JSON.stringify(filterAcceptedPunishments(punishments)));

                let ids = punishments.map(punishment => {
                    return punishment.fk_user_uid_ordering_punishment;
                });
                User.find({ _id: { $in: ids } }, (err, users) => {
                    for (punishment of acceptedPunishments) {
                        punishment.user_ordering_punishment = getUsernameFromPunishmentById(punishment.fk_user_uid_ordering_punishment, users);
                    }
                    return res.status(200).json({ acceptedPunishments: acceptedPunishments });
                });
            } else return res.json({ errorMsg: 'No punishments.' });
        });
    }

});

router.get('/past', (req, res) => {

    if (req.user) {
        Punishment.find({ fk_user_email_taking_punishment: req.user.email }, (err, punishments) => {
            if (err) return res.status(500).json({ errorMsg: 'Error on getting punishment data from database.' })

            else if (punishments && punishments.length > 0) {
                let pastPunishments = JSON.parse(JSON.stringify(punishments));
                let ids = pastPunishments.map(punishment => {
                    return punishment.fk_user_uid_ordering_punishment;
                });

                User.find({ _id: { $in: ids } }, (err, users) => {
                    for (punishment of pastPunishments) {
                        punishment.user_ordering_punishment = getUsernameFromPunishmentById(punishment.fk_user_uid_ordering_punishment, users);
                    }
                    return res.json({ pastPunishments: pastPunishments });
                });
            } else return res.json({ errorMsg: 'No punishments.' })
        });
    }
});

router.get('/ordered', (req, res) => {

    if (req.user) {
        Punishment.find({ fk_user_uid_ordering_punishment: req.user._id }, (err, punishments) => {
            if (err) return res.status(500).json({ errorMsg: 'Error on getting punishment data from database.' })

            else if (punishments && punishments.length > 0) {
                let orderedPunishments = JSON.parse(JSON.stringify(punishments));
                let userEmails = orderedPunishments.map(punishment => {
                    return punishment.fk_user_email_taking_punishment;
                })
                User.find({ email: { $in: userEmails } }, (err, users) => {
                    for (punishment of orderedPunishments) {
                        punishment.user_taking_punishment = getUsernameFromPunishmentByEmail(punishment.fk_user_email_taking_punishment, users);
                    }

                    return res.json({ orderedPunishments: orderedPunishments });
                });
            } else return res.json({ errorMsg: 'No punishments.' });
        })
    }
});

router.post('/giveup', (req, res) => {

    const punishmentId = req.body.punishmentId;

    if (req.user) {
        Punishment.findById(punishmentId, (err, punishment) => {
            if (err) {
                console.log(err)
                return;
            }
            if (!punishment) {
                return res.status(400).json('Punishment not found.');
            }

            if (punishment.fk_user_email_taking_punishment !== req.user.email) return res.status(400).json('This is not your punishment');

            punishment.given_up = Date.now();
            punishment.save();
            res.json('Your act of weakness is submited');

            User.findById(punishment.fk_user_uid_ordering_punishment, (err, user) => {
                if (user) sendNotification(req.body._id, user.email, punishment._id, constants.punishmentGivenUp);
            });
        });
    }
});

router.post('/log', (req, res) => {

    if (req.user) {
        Punishment.findById(req.body.id, (err, punishment) => {

            if (err) return res.status(500).json('There was a problem finding the punishment.');

            if (!punishment) return res.status(400).json('Punisment does not exist.');

            if (punishment.fk_user_email_taking_punishment !== req.user.email) return res.status(400).json('This is not your punishment');

            let newTry = new Try({
                fk_punishment_uid: req.body.id,
                time_spent: req.body.timeSpent
            });
            // check here
            newTry.save((err, result) => {
                if (err) return res.status(500).json('Error on saving try.');

                punishment.total_time_spent += parseInt(req.body.timeSpent);
                punishment.tries++;
                punishment.save((err, punishment) => {
                    if (err) return res.status(500).json('Error on saving punishment try.');
                    res.status(200).json('Your try is logged.')

                    User.findById(punishment.fk_user_uid_ordering_punishment, (err, user) => {
                        if (user) sendNotification(req.body._id, user.email, punishment._id, constants.notifyTrying);
                    });

                    return;
                });
            });
        });

    } else return res.status(400).send('Not authorized.');
});

router.post('/done', (req, res) => {

    /* PROVJERITI JEL UNUTAR DEADLINE-a */
    console.log(req.body)

    if (req.user) {
        Punishment.findById(req.body.id, (err, punishment) => {
            if (err) return res.status(500).json('There was a problem finding the punishment.');
            if (!punishment) return res.status(400).json('Punishment does not exist.')
            if (punishment.fk_user_email_taking_punishment !== req.user.email) return res.status(400).json('This is not your punishment.');

            //punishment.done = Date.now();
            punishment.save((err, punishment) => {
                if (err) return res.status(500).json('There was a problem saving the punishment.');
                res.status(200).json('Punishment saved.');

                /* User.findById(punishment.fk_user_uid_ordering_punishment, (err, user) => {
                    console.log(user.email)
                    if (user) sendNotification(req.user._id, user.email, punishment._id, constants.notifyDone);
                }); */

                addToScoreboard(req.user, punishment, req.body.timeSpent);

                return;
            });
        });
    } else return res.status(400).send('Not authorized.');
});

router.post('/create', (req, res) => {
    let punishmentData = req.body;
    let userOrderingPunishment = req.user;
    console.log(punishmentData)

    if (req.user) { // if user logged in

        if (!isPunishmentValid(punishmentData)) return res.json({ errorMsg: 'Punishment not valid. Try again.' });

        punishmentData.whatToWrite = punishmentData.whatToWrite.trim();
        punishmentData.why = punishmentData.why.trim();
        // ako je poslan username
        if (punishmentData.whomUsername && punishmentData.whatToWrite) {

            User.findOne({ username: punishmentData.whomUsername }, (err, user) => {
                if (err) return res.send({ errorMsg: 'Error on finding desired user' });
                if (!user) {
                    return res.json({ errorMsg: 'User does not exist.' })
                } else if (user) {
                    // potrebno sejvat kaznu,
                    let newPunishment = new Punishment({
                        fk_user_uid_ordering_punishment: userOrderingPunishment._id,
                        fk_user_email_taking_punishment: user.email,
                        how_many_times: punishmentData.howManyTimes,
                        deadline: punishmentData.deadlineDate === '' ? null : punishmentData.deadlineDate,
                        what_to_write: punishmentData.whatToWrite,
                        why: punishmentData.why
                    });
                    newPunishment.save((err, punishment) => {
                        if (err) {
                            return res.send({ errorMsg: 'Error on database entry' });
                        } else {
                            //console.log(punishment);
                            let response = JSON.parse(JSON.stringify(punishment))
                            response.user_taking_punishment = user.username;

                            res.json(response);

                            sendNotification(req.body._id, user.email, punishment._id, constants.punishmentRequested);
                            return;
                        }
                    });
                }
            });

        } else if (punishmentData.whomEmail && punishmentData.whatToWrite) {
            // poslan email
            User.findOne({ email: punishmentData.whomEmail }, (err, user) => {
                if (err) return res.send({ errorMsg: 'Error on finding desired user' });
                if (!user) {

                    // USER NE POSTOJI, POSALJI REQUEST NA DANI MAIL TE NAPRAVI USERA (TODO)

                    let newPunishment = new Punishment({
                        fk_user_uid_ordering_punishment: userOrderingPunishment._id,
                        fk_user_email_taking_punishment: punishmentData.whomEmail,
                        how_many_times: punishmentData.howManyTimes,
                        deadline: punishmentData.deadlineDate === '' ? null : punishmentData.deadlineDate,
                        what_to_write: punishmentData.whatToWrite,
                        why: punishmentData.why
                    });

                    newPunishment.save((err, punishment) => {
                        if (err) {
                            return res.send({ errorMsg: 'Error on database entry' });
                        } else {
                            //console.log(punishment);
                            let response = JSON.parse(JSON.stringify(punishment))
                            response.user_taking_punishment = punishmentData.whomEmail;

                            res.json(response);

                            sendNotification(userOrderingPunishment._id, punishmentData.whomEmail, punishment._id, constants.punishmentRequested);
                            return;
                        }
                    });

                    // return res.json({ errorMsg: 'User does not postojati.' });


                } else if (user) {
                    // stvori kaznu
                    let newPunishment = new Punishment({
                        fk_user_uid_ordering_punishment: userOrderingPunishment._id,
                        fk_user_email_taking_punishment: user.email,
                        how_many_times: punishmentData.howManyTimes,
                        deadline: punishmentData.deadlineDate === '' ? null : punishmentData.deadlineDate,
                        what_to_write: punishmentData.whatToWrite,
                        why: punishmentData.why
                    });

                    newPunishment.save((err, punishment) => {
                        if (err) {
                            return res.send({ errorMsg: 'Error on database entry' });
                        } else {
                            let response = JSON.parse(JSON.stringify(punishment))
                            response.user_taking_punishment = user.username;

                            res.json(response);

                            sendNotification(req.body._id, user.email, punishment._id, constants.punishmentRequested);
                            return;
                        }
                    });
                }
            });

        } else {
            res.status(400).json('Punishment misses data.');
        }
    } else return res.status(400).send('Not authorized.');
});

module.exports = router;

function getUsernameFromPunishmentById(orderingId, users) {

    for (user of users) {
        if (orderingId == user._id) {
            if (user.username) return user.username;
            else return user.email;
        }
    }
    return null;
}

function getUsernameFromPunishmentByEmail(receivingUserEmail, users) {

    for (user of users) {
        if (receivingUserEmail === user.email) {
            if (user.username) return user.username;
            else return user.email;
        }
    }
    return null
}

function sendMail(from, to, subject, mailContent) {

    sendmail({
        from: from,
        to: to,
        subject: subject,
        text: mailContent,
    }, function (err, reply) {
        console.log(err && err.stack);
        console.dir(reply);
    });
    res.json('mail sent');
}

function notifyUser(senderId, receiveingId, notificationType) {
    Pref.findOne({ fk_user_id: senderId }, (err, pref) => {
        if (pref[notificationType]) {
            //posalji mail
        }
    })
}

function isPunishmentValid(punishment) {

    // check range 
    if (punishment.howManyTimes < 1 && punishment.howManyTimes > 999) return false;

    // check if deadline is mimimum tomorrow
    else if (punishment.deadlineDate !== ' ') {

        let tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1)
        tomorrowDate.setHours(0)
        tomorrowDate.setMinutes(0);

        if ((new Date(parseInt(punishment.deadlineDate)).getTime()) < (tomorrowDate.getTime())) {
            return false;
        }
    }

    // whatToWrite check
    if (punishment.whatToWrite.length > 100 || punishment.whatToWrite.length === 0) return false;

    for (let i = 0; i < punishment.whatToWrite.length; i++) {

        if (validPunishmentWhatToWriteKeys.indexOf(punishment.whatToWrite[i]) === -1) return false;
    }

    // check if why field is set, and if it is length must be lower than 500 chars
    if (punishment.why !== '' && punishment.why.length > 500) return false;

    return true;
}


function calcPunishmentScore(punishment, timeSpent) {

    const punishmentLen = punishment.what_to_write.length;
    const howManyTimes = punishment.how_many_times;

    return ((punishmentLen * howManyTimes) / timeSpent).toFixed(3);
}

function addToScoreboard(user, punishment, timeSpent) {

    const punishmentScore = calcPunishmentScore(punishment, timeSpent);

    // Provjera ako entry vec postoji 

    Score.findOne({ fk_user_id: user._id }, (err, score) => {

        if (err) return null;
        else if (!score) {

            let newScore = new Score({
                fk_user_id: user._id,
                points: punishmentScore,
                last_pun_taken_id: punishment._id
            });

            newScore.save();

        } else {

            score.points = (parseInt(score.points) + parseInt(punishmentScore)).toFixed(3);
            score.last_pun_taken_id = punishment._id;
            score.save();
        }
    });
};



