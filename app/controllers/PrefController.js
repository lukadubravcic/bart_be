const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const Pref = require('../models/Pref');

router.use(bodyParser.urlencoded({ extended: true }));

router.post('/update', (req, res) => {
    if (req.user) {
        Pref.findOne({ fk_user_uid: req.user._id }, (err, pref) => {
            if (err) return res.status(500).json('There was a probem finding preferences.');

            for (prop of Object.keys(req.body)) {
                pref[prop] = req.body[prop];
            }

            pref.save((err, result) => {
                if (err) return res.status(500).json('There was a problem updating preferences.');
                return res.status(200).json('Preferences updated');
            });
        });
    }
});

module.exports = router;

