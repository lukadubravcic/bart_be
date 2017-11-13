const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const RandomPunishmentSchema = new Schema({    
    
    how_many_times: {
        type: Number,
        min: 1,
        max: 999
    },
    what_to_write: { type: String },    
});

mongoose.model('RandomPunishment', RandomPunishmentSchema);

module.exports = mongoose.model('RandomPunishment');