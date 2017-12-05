const mongoose = require('mongoose');
var Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const UserSchema = new Schema({
    username: {
        type: String,
        trim: true,
        required: true,
        unique: true,
        index: { unique: true }
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        required: true,
        index: { unique: true }
    },
    hash_password: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    confirmed: {
        type: Date,
        default: null
    },
    invited_by: { //fk_user_id“
        type: String, 
        default: null
    }
}, { strict: true });

UserSchema.methods.comparePassword = function (password) {
    return bcrypt.compareSync(password, this.hash_password);
}

mongoose.model('User', UserSchema);

module.exports = mongoose.model('User');