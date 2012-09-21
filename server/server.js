var express = require('express'),
  app = express.createServer(),
  io = require('socket.io').listen(app),
  http = require('http'),
  https = require('https'),
  inspect = require('util').inspect,
  url = require("url"),
  axon = require('axon'),
  _ = require('underscore'),
  path = require("path"),
  spawn = require("child_process").spawn,
  jsonline = require('json-line-protocol').JsonLineProtocol,
  jsonTwitter = new jsonline(),
  fs = require('fs'),
  config = JSON.parse(fs.readFileSync('./config.json'));
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
//  socket config
io.enable('browser client minification');
io.enable('browser client etag');
io.enable('browser client gzip');
io.set('log level', config.server.websockets.loglevel);
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
//  hooks and sink config
var dbHook = axon.socket('emitter');
var statHook = axon.socket('emitter');
var wlHook = axon.socket('emitter');
//  sink
var sink = axon.socket('pull');
//  bind sink
sink.bind(config.hooks.stats.sink.port);
//  bind hooks
dbHook.bind(config.hooks.db.port);
statHook.bind(config.hooks.stats.port);
wlHook.bind(config.hooks.wordlist.port);

console.log('stats sink bound to port: ' + config.hooks.stats.sink.port);
console.log('db hook bound to port: ' + config.hooks.db.port);
console.log('stats hook bound to port: ' + config.hooks.stats.port);
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
<<<<<<< HEAD
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
  
=======
    //  emit data to be saved
    dbHook.emit('save', value);
    //  emit data to be processed
    if (config.hooks.stats.debug) {
      console.log('publishing to stat hook: ' + inspect(value));
    }
    statHook.emit('calc', value);
    //  only emit tweets with geo pos
    if (value.geo) {
<<<<<<< HEAD
      emitLatLngLim(socket, value);
>>>>>>> 809ef56f6db8d5ccf18b3bf74ee0b17189df69ce
=======
      socket.emit('latlng', {
        lat: value.geo.coordinates[0],
        lng: value.geo.coordinates[1],
        size: Math.random() * 150 + 50
      });
>>>>>>> 62fe0373703dc9f9a05094a6d22472bf1629303a
    }

  });
  //  emit stats
  sink.on('message', function(sinkResult) {
    sinkResult = JSON.parse(sinkResult.toString());
    if (sinkResult.action) {
      //  switch on action find socket emit name space
      switch(sinkResult.action){
      case 'stat'://  stats result
        socket.volatile.emit('stats', sinkResult.result);
        break;
        case 'wl'://  word list result
        console.log(inspect(sinkResult));
        break;
      default:
         console.log('cannot find sink action, ' + sinkResult.action);
      }

    }else{
      console.log(inspect(sinkResult));
    }

  });
  //  client disconnects
  socket.on('disconnect', function() {
    console.log('client disconnected');
  });
});
<<<<<<< HEAD
<<<<<<< HEAD
dbHook.start();
=======



=======
>>>>>>> 62fe0373703dc9f9a05094a6d22472bf1629303a
//  private functions

function emitLatLng(socket, value) {
  socket.emit('latlng', {
    lat: value.geo.coordinates[0],
    lng: value.geo.coordinates[1],
    size: Math.random() * 150 + 50
  });
}
<<<<<<< HEAD
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
>>>>>>> 809ef56f6db8d5ccf18b3bf74ee0b17189df69ce
=======
setInterval(function(){
  wlHook.emit('getGlossary', function(result){
    console.log(inspect(result));
  });
}, 15000);
app.listen(config.server.port);
console.log('http server bound to port: ' + config.server.port);
>>>>>>> 62fe0373703dc9f9a05094a6d22472bf1629303a
