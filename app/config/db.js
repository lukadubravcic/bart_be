const credentials = require('./config');
const url = 'mongodb://' + credentials.name + ':' + credentials.pwd + '@ds133044.mlab.com:33044/notes';

const mongoose = require('mongoose');
mongoose.connect(url);
