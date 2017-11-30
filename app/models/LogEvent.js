const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const LogEventSchema = new Schema({
    _id: {
        type: Number,
        unique: true
    },
    description: {
        type: String
    }
}, { _id: false });

mongoose.model('LogEvent', LogEventSchema)

module.exports = mongoose.model('LogEvent');
