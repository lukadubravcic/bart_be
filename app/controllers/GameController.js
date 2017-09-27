const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));

const Punishment = require('../models/Punishment');

router.get('/', (req, res) => {

    // posalji punishment s najskorijim rokom ili ako user nije logiran, default punishment
    if (req.user) {


    }

});

router.post('/create', (req, res) => {
    console.log(req.body.howManyTimes)
    res.json(req.body.howManyTimes);
});



module.exports = router;