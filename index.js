// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;

var databaseUri = process.env.DATABASE_URI || process.env.MONGOLAB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI:  'mongodb://heroku_jwhk347t:easuk2rilgdiu3qnjbjobpl6k8@ds019708.mlab.com:19708/heroku_jwhk347t',
  cloud:  __dirname + '/cloud/main.js',
  appId: 'ck6vEY86u2hwvlZiwYjbxW9zcmkVrq3MBRIHetgY',
  masterKey:  'SLZtu100g9idpw4UkCVHckvfzEJlBuMGBNnXA3sh' //Add your master key here. Keep it secret!
  //,serverURL: process.env.SERVER_URL || 'http://localhost:1337'  // Don't forget to change to https if needed
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a web site.');
});

var port = process.env.PORT || 1337;
app.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});
