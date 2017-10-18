const credentials = require('./config');
const url = 'mongodb://' + credentials.name + ':' + credentials.pwd + '@ds151554.mlab.com:51554/bart';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(url);