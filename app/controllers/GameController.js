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

const User = require('../models/User');
const Punishment = require('../models/Punishment');
const Try = require('../models/Try');

router.use(bodyParser.urlencoded({ extended: true }));

/* router.use((req, res, next) => {
    console.log(req.user)
    next();
}); */

router.get('/mail', (req, res) => {

    /* 
        TODO: MAILLLLLLL
    */

    sendmail({
        from: 'bart@barted.com',
        to: 'lukadubravcic@yahoo.com',
        subject: 'piknik',
        text: 'Nekakav testni mail, lp',
    }, function (err, reply) {
        console.log(err && err.stack);
        console.dir(reply);
    });
    res.json('mail sent');
    // posalji punishment s najskorijim rokom ili ako user nije logiran, default punishment
    if (req.user) {
    }
});

router.get('/accepted', (req, res) => {

    if (req.user) {
        Punishment.find({
            fk_user_email_taking_punishment: req.user.email,
            accepted: { $exists: true, $ne: null },
            given_up: null,
            failed: null,
            done: null
        }, (err, punishments) => {
            if (err) console.log(err);
            if (punishments) {
                acceptedPunishments = JSON.parse(JSON.stringify(punishments));
                let ids = punishments.map(punishment => {
                    return punishment.fk_user_uid_ordering_punishment;
                });

                User.find({ _id: { $in: ids } }, (err, users) => {
                    for (punishment of acceptedPunishments) {
                        punishment.user_ordering_punishment = getUsernameFromPunishmentById(punishment.fk_user_uid_ordering_punishment, users);
                    }
                    return res.status(200).json({ acceptedPunishments: acceptedPunishments });
                });
            }
        });
    }
});

router.get('/past', (req, res) => {

    if (req.user) {
        Punishment.find({ fk_user_email_taking_punishment: req.user.email }, (err, punishments) => {
            if (err) return res.status(500).json({ errorMsg: 'Error on getting punishment data from database.' })
            else if (!punishments) return res.status(500).json({ errorMsg: 'No punishments.' })
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
            }
        });
    }
});

router.get('/ordered', (req, res) => {

    if (req.user) {
        Punishment.find({ fk_user_uid_ordering_punishment: req.user._id }, (err, punishments) => {
            if (err) return res.status(500).json({ errorMsg: 'Error on getting punishment data from database.' })
            else if (!punishments) return res.status(500).json({ errorMsg: 'No punishments.' })
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
            }
        })
    }
});

router.post('/giveup', (req, res) => {

    let punishmentId = req.body.punishmentId;
    console.log(punishmentId)

    Punishment.findById(punishmentId, (err, punishment) => {
        if (err) {
            console.log(err)
            return;
        }
        if (!punishment) {
            res.status(400).json('Punishment not found.');
        } else {
            punishment.given_up = Date.now();
            punishment.save();
            return res.json('Your act of weakness is submited');
        }
    });
});

router.post('/log', (req, res) => {

    console.log(req.body);
   
    if (req.user) {
        Punishment.findById(req.body.id, (err, punishment) => {
            
            if (err) return res.status(500).json('There was a problem finding the punishment.');

            if (!punishment) return res.status(400).json('Punisment does not exist.');

            let newTry = new Try({
                fk_punishment_uid: req.body.id,
                time_spent: req.body.timeSpent
            });
            
            newTry.save((err, result) => {
                if (err) return res.status(500).json('Error on saving try.');
                
                punishment.total_time_spent += parseInt(req.body.timeSpent);
                punishment.save((err, punishment) => {
                    if (err) return res.status(500).json('Error on saving punishment try.');
                    return res.status(200).json('Your try is logged.')
                });
            });
        });
    }
});

router.post('/save', (req, res) => {

    // pronadi kaznu, provjeri jel broj validan
    if (req.user && req.body.progress >= 0 && req.body.progress <= 100) {

        Punishment.findById(req.body.id, (err, punishment) => {
            if (err) return res.status(500).json('There was a problem finding the punishment.');
            if (!punishment) return res.status(400).json('Punishment does not exist.');
            if (req.user.email !== punishment.fk_user_email_taking_punishment) return res.status(400).json("Will not compute.");

            punishment.progress = req.body.progress;
            punishment.save((err, punishment) => {
                if (err) return res.status(500).json('There was a problem updating the punishment.');
                return res.status(200).json(punishment);
            });
        });
    }
});

router.post('/done', (req, res) => {
    console.log(req.body);
    if (req.user) {
        Punishment.findById(req.body.id, (err, punishment) => {
            if (err) return res.status(500).json('There was a problem finding the punishment.');
            if (!punishment) return res.status(400).json('Punishment does not exist.')
            punishment.done = Date.now();
            punishment.save((err, punishment) => {
                if (err) return res.status(500).json('There was a problem saving the punishment.');
                return res.status(200).json('Punishment saved.');
            });
        });
    }
});

router.post('/create', (req, res) => {
    console.log(req.body)
    let punishmentData = req.body;
    if (req.user) { // if user logged in
        let userOrderingPunishment = req.user;
        // ako je poslan username
        if (punishmentData.whomUsername) {
            User.findOne({ username: punishmentData.whomUsername }, (err, user) => {
                if (err) return res.send({ errorMsg: 'Error on finding desired user' });
                if (!user) {
                    return res.json({ errorMsg: 'User does not exist.' })
                } else if (user) {
                    // potrebno sejvat kaznu
                    let fk_user_uid_ordering_punishment = userOrderingPunishment._id;
                    let fk_user_email_taking_punishment = user.email;
                    let how_many_times = punishmentData.howManyTimes;
                    let deadline = punishmentData.deadlineDate === '' ? null : punishmentData.deadlineDate;
                    let what_to_write = punishmentData.whatToWrite;
                    let why = punishmentData.why;

                    /* 
                    --- TODO ---
                    let tris = TODO;
                    let total_time_spent = TODO 
                     */

                    /* 
                    TODO: provjera ako ista kazna vec postoji
                    */

                    let newPunishment = new Punishment({
                        fk_user_uid_ordering_punishment,
                        fk_user_email_taking_punishment,
                        how_many_times,
                        deadline,
                        what_to_write,
                        why
                    });
                    newPunishment.save((err, punishment) => {
                        if (err) {
                            return res.send({ errorMsg: 'Error on database entry' });
                        } else {
                            //console.log(punishment);
                            return res.json(punishment);
                        }
                    });
                }
            });
        } else {
            res.json('Nista')
        }
    }

    //res.json(req.body);
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