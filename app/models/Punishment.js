const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const PunishmentSchema = new Schema({
    fk_user_uid_ordering_punishment: {
        type: String
    },
    fk_user_email_taking_punishment: {
        type: String
    },
    how_many_times: {
        type: Number,
        min: 1,
        max: 999
    },
    deadline: { type: Date },
    what_to_write: { type: String },
    why: { type: String },
    created: {
        type: Date,
        default: Date.now
    },
    accepted: { type: Boolean },
    tris: {},
    done: { type: Date },
    failed: { type: Date },
    given_up: { type: Date },
    total_time_spent: { type: Number }
})