const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const SpecialPunishmentSchema = new Schema({    
    
    how_many_times: {
        type: Number,
        min: 1,
        max: 999
    },
    what_to_write: { type: String },    
});

mongoose.model('SpecialPunishment', SpecialPunishmentSchema);

module.exports = mongoose.model('SpecialPunishment');