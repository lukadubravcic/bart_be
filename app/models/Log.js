const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const LogSchema = new Schema({
    fk_user_id: {
        type: String
    },
    when: {
        type: Date,
        default: Date.now
    },
    fk_log_events_uid: {
        type: String
    }
});

mongoose.model('Log', LogSchema);

module.exports = mongoose.model('Log');
