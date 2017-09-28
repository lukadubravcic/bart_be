const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const sendmail = require('sendmail');

router.use(bodyParser.urlencoded({ extended: true }));

const User = require('../models/User');
const Punishment = require('../models/Punishment');



router.get('/', (req, res) => {

    /* 
        TODO: MAILLLLLLL
    */

    sendmail({
        from: 'mrs.abrakadabra@gmail.com',
        to: 'lukadubravcic@yahoo.com',
        subject: 'piknik',
        html: 'Alo ej, saljem ti neke stvari koje bi nam trebale. javi se! ',
      }, function(err, reply) {
        console.log(err && err.stack);
        console.dir(reply);
    });
    res.json('mail sent');
    // posalji punishment s najskorijim rokom ili ako user nije logiran, default punishment
    if (req.user) {


    }

});

router.post('/create', (req, res) => {
    let punishmentData = req.body;
    if (req.user) { // if user logged in
        let userOrderingPunishment = req.user;
        // ako je poslan username
        if (punishmentData.whomUsername) {
            User.findOne({ username: punishmentData.whomUsername }, (err, user) => {
                if (err) return res.send({ errorMsg: 'Error on finding desired user'});
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
                             return res.send({errorMsg: 'Error on database entry'});
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