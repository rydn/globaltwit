var express = require('express'),
  app = express.createServer(),
  io = require('socket.io').listen(app),
  Hook = require('hook.io').Hook,
  http = require('http'),
  https = require('https'),
  url = require("url"),
  path = require("path"),
  spawn = require("child_process").spawn,
  jsonline = require('json-line-protocol').JsonLineProtocol;

//  http config
app.configure(function() {
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

app.listen(8000);
//  hook config


var dbHook = new Hook({
  name: "db"
});

dbHook.on('hook::ready', function(){
  console.log('db hook ready');
});

//  socket events
io.sockets.on('connection', function(socket) {
  //  counters
  var twitCount = 0;
  var twitCountWithGeo = 0;
  //  parser
  var jsonTwitter = new jsonline();
  var username = 'ryandick',
    password = 'D1z4yd1ck!';
  var options = {
    host: 'stream.twitter.com',
    port: 443,
    path: '/1/statuses/filter.json?locations=-180,-90,180,90',
    headers: {
      'Authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
    }
  };

  https.get(options, function(resp) {
    resp.on('data', function(chunk) {
      jsonTwitter.feed(chunk);
    });
  }).on("error", function(e) {
    console.log("Got error: " + e.message);
    console.log("Got error: " + e);
  });

  jsonTwitter.on('value', function(value) {
      //  emit data to be saved
      dbHook.emit('save', value);
    //  increment counter
      twitCount++;
    //  only record tweets with geo pos
    if (value.geo) {
      twitCountWithGeo++;
      socket.emit('latlng', {
        lat: value.geo.coordinates[0],
        lng: value.geo.coordinates[1],
        size: Math.random() * 150 + 50
      });
      //  emit stats
      socket.emit('stats', {count:twitCount,withGeo:twitCountWithGeo, timestamp:new Date().toString()});
  
    }
  });
});
dbHook.start();
