const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScoreSchema = new Schema({
    fk_user_id: {
        type: String,
        unique: true
    },
    points: {
        type: Number,
        default: 0
    },
    last_pun_taken_id: {
        type: String
    }
});

mongoose.model('Score', ScoreSchema);

module.exports = mongoose.model('Score');