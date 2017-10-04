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

router.use(bodyParser.urlencoded({ extended: true }));

const User = require('../models/User');
const Punishment = require('../models/Punishment');



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

console.log(req.user)
    function getUsernameFromPunishment(orderingId, users) {
        for (user of users) {
            if (orderingId == user._id) {
                return user.username;
            }
        }
        return null;
    }

    if (req.user) {
        Punishment.find({
            fk_user_email_taking_punishment: req.user.email,
            accepted: { $exists: true, $ne: null },
            $or: [
                { given_up: null },
                { given_up: { $exists: false } }
            ]
        }, (err, punishments) => {
            if (err) console.log(err);
            if (punishments) {
                acceptedPunishments = JSON.parse(JSON.stringify(punishments));
                let ids = punishments.map(punishment => {
                    return punishment.fk_user_uid_ordering_punishment;
                });

                User.find({ _id: { $in: ids } }, (err, users) => {
                    for (punishment of acceptedPunishments) {
                        punishment.user_ordering_punishment = getUsernameFromPunishment(punishment.fk_user_uid_ordering_punishment, users);
                    }
                    /* console.log('------ ACCEPTED PUSNISHMENTS ------')
                    console.log(acceptedPunishments) */
                    return res.json({ acceptedPunishments: acceptedPunishments })
                });
            }
        });
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