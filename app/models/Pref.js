const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const PrefSchema = new Schema({
    fk_user_uid: {
        type: String
    },
    language:{
        type: String,
        default: 'EN'
    },
    show_tooltips:{
        type: Boolean,
        default: true
    },
    notify_trying:{
        type: Boolean,
        default: false
    },
    notify_done:{
        type: Boolean, 
        default: true
    },
    notify_failed:{
        type: Boolean,
        default: false
    },
    sound:{
        type: Boolean,
        default: true
    },
    wall_season:{
        type: String,
        default: 'plain'
    },
    classroom_wall:{
        type: String,
        default: 'plain'
    },
    classroom_board:{
        type: String,
        default: 'plain'
    }
});

mongoose.model('Pref', PrefSchema);

module.exports = mongoose.model('Pref');