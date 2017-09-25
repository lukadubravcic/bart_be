const mongoose = require('moongoose');
var Schema = mongoose.Schema;

const PunishmentSchema = new Schema({
    fk_user_uid_ordering_punishment: {},
    fk_user_email_taking_punishment: {},
    how_many_times: {
        type: Number,
        min: 1,
        max: 999
    },
    deadline: { type: Date },
    what_to_write: { type: String },
    why: { type: String },
    created: { type: Date },
    accepted: { type: Boolean },
    tris: {},
    done: {},
    failed: {},
    given_up: {},
    total_time_spent: {}
})