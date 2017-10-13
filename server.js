var app = require('./app');
var port = process.env.PORT || 8000;

var server = app.listen(port, function() {
  console.log('Bart server listening on port ' + port);
});