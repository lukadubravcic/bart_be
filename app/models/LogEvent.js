const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const LogEventSchema = new Schema({
    description: {
        type: String,        
    }
});

mongoose.model('LogEvent', LogEventSchema)

module.exports = mongoose.model('LogEvent');
