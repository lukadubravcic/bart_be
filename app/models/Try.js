const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const TrySchema = new Schema({
    fk_punishment_uid: {
        type: String
    },
    try: {
        type: Date,
        default: Date.now
    },
    time_spent: {
        type: Number, // number of miliseconds
        default: 0
    }
});

mongoose.model('Try', TrySchema);

module.exports = mongoose.model('Try');