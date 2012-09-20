var express = require('express'),
  app = express.createServer(),
  io = require('socket.io').listen(app),
  Hook = require('hook.io').Hook,
  http = require('http'),
  https = require('https'),
  url = require("url"),
  _ = require('underscore'),
  path = require("path"),
  spawn = require("child_process").spawn,
  jsonline = require('json-line-protocol').JsonLineProtocol,
  jsonTwitter = new jsonline(),
  fs = require('fs'),
  config = JSON.parse(fs.readFileSync('./config.json'));
//  socket config
io.enable('browser client minification');
io.enable('browser client etag');
io.enable('browser client gzip');
io.set('log level', 1);
io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
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
//  hook config
var dbHook = new Hook({
  name: "db",
  silent: true,
  autoheal: true
});
var statHook = new Hook({
  name: "stat",
  silent: true,
  autoheal: true
});
statHook.on('hook::ready', function() {
  console.log('stat hook ready');
});
dbHook.on('hook::ready', function() {
  console.log('db hook ready');
});
//  rate limited lat long emitter wrapper
var emitLatLngLim = _.rateLimit(emitLatLng, config.server.latlngLimit, false);
//  configure web sockets
//  socket events
io.sockets.on('connection', function(socket) {
  console.log('client connected');
  var username = config.server.twitter.username,
    password = config.server.twitter.password;
  var options = {
    host: 'stream.twitter.com',
    port: 443,
    path: '/1/statuses/filter.json?locations=-180,-90,180,90',
    headers: {
      'Authorization': 'Basic ' + new Buffer(username + ':' + password).toString('base64')
    }
  };
  //  stream twits to paser
  https.get(options, function(resp) {
    console.log('twit stream connection established');
    resp.on('data', function(chunk) {
      jsonTwitter.feed(chunk);
    });
  }).on("error", function(e) {
    console.log("Got error: " + e.message);
    console.log("Got error: " + e);
  });

  //  parser returns a twit
  jsonTwitter.on('value', function(value) {
    //  emit data to be saved
    dbHook.emit('save', value);
    //  emit data to be processed
    statHook.emit('calc', value);
    //  only emit tweets with geo pos
    if (value.geo) {
      emitLatLngLim(socket, value);
    }
  });
  //  emit stats
  statHook.on('*::result', function(statCalcResult) {
    socket.volatile.emit('stats', statCalcResult);
  });
  socket.on('disconnect', function() {
    console.log('client disconnected');
  });
});



//  private functions

function emitLatLng(socket, value) {
  socket.emit('latlng', {
    lat: value.geo.coordinates[0],
    lng: value.geo.coordinates[1],
    size: Math.random() * 150 + 50
  });
}
//  extend underscore to provide non-async rate limiting
_.rateLimit = function(func, rate, async) {
  var queue = [];
  var timeOutRef = false;
  var currentlyEmptyingQueue = false;

  var emptyQueue = function() {
      if (queue.length) {
        currentlyEmptyingQueue = true;
        _.delay(function() {
          if (async) {
            _.defer(function() {
              queue.shift().call();
            });
          } else {
            queue.shift().call();
          }
          emptyQueue();
        }, rate);
      } else {
        currentlyEmptyingQueue = false;
      }
    };

  return function() {
    var args = _.map(arguments, function(e) {
      return e;
    }); // get arguments into an array
    queue.push(_.bind.apply(this, [func, this].concat(args))); // call apply so that we can pass in arguments as parameters as opposed to an array
    if (!currentlyEmptyingQueue) {
      emptyQueue();
    }
  };
};

statHook.start();
dbHook.start();
app.listen(8000);