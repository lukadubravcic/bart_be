const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: String,
    email: String,
    password: String,
});

mongoose.model('User', UserSchema);

module.exports = mongoose.model('User');