const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const TrySchema = new Schema({
    FK_punishment_uid: {
        type: String
    },
    try: {
        type: Date,
        default: Date.now
    },
    time_spent: {
        type: Number // number of miliseconds
    }
});

mongoose.model('Try', TrySchema);

module.exports = mongoose.model('Try');