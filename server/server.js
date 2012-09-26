var express = require('express'),
  app = express.createServer(),
  io = require('socket.io').listen(app),
  https = require('https'),
  inspect = require('util').inspect,
  axon = require('axon'),
  _ = require('underscore'),
  jsonline = require('json-line-protocol').JsonLineProtocol,
  jsonTwitter = new jsonline(),
  fs = require('fs'),
  config = JSON.parse(fs.readFileSync('./config.json'));

//  logger
var caterpillar = require('caterpillar');
var logger = new caterpillar.Logger();
//  tracer
if (config.hooks.stats.tracer.enabled) {
  require('look').start(config.server.tracer.port, config.server.tracer.host);
}
//  for tracking connection status
var twitCon = false;
//  total tweets for rate calculations
var totTwit = 0;
//  traces the amount of minutes since ini for calculating rates
var globalStartTime = process.hrtime();
//  configure web sockets
io.enable('browser client minification');
io.enable('browser client etag');
io.enable('browser client gzip');
io.set('log level', config.server.websockets.loglevel);
io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
//  http config
app.configure(function() {
  app.use(express.methodOverride());
  app.use(express.compress());
  app.use(express.static(__dirname + '/public/out'));
  app.use(app.router);
  app.use(express.errorHandler());
});

//  sink
var sink = axon.socket('pull');
//  bind sink
sink.bind(config.hooks.stats.sink.port);

//  hooks and sink config
var dbHook = axon.socket('emitter'),
  statHook = axon.socket('emitter'),
  wlHook = axon.socket('emitter');

//  bind hooks
dbHook.bind(config.hooks.db.port);
statHook.bind(config.hooks.stats.port);
wlHook.bind(config.hooks.wordlist.port);

//  confirm start up
logger.log('stats sink bound to port: ' + config.hooks.stats.sink.port);
logger.log('db hook bound to port: ' + config.hooks.db.port);
logger.log('stats hook bound to port: ' + config.hooks.stats.port);


//  socket events
io.sockets.on('connection', function(socket) {
  logger.log('client connected');
  //  config for connecting to twitter pipe
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
  //  if not already connected
  if (!twitCon) {
    //  stream twits to paser
    var twitStream = https.get(options, function(resp) {
      //  log connection
      logger.log('twit stream connection established');
      //  on data emit
      resp.on('data', function(chunk) {
        //  feed to jsonTwitter parser
        jsonTwitter.feed(chunk);
      });
    }).on("error", function(e) {
      logger.log("Got error: " + e.message);
      logger.log("Got error: " + e);
    });
  } else {
    logger.log('already connected to twit pipe, not doing it again');
  }
  //  parser returns a twit
  jsonTwitter.on('value', function(value) {
    //  inc twit counter
    totTwit++;
    //  emit data to be saved by hooks
    dbHook.emit('save', value); // save twit to db
    statHook.emit('calc', value); // add twit to calculation pool
    //  emit data to be processed
    if (config.hooks.stats.debug) {
      logger.log('publishing to stat hook: ' + inspect(value));
    }

    //  only emit tweets with geo pos
    if (value.geo) {
      //calculate time since start
      var calcTime = process.hrtime();
      calcTime = (calcTime[0] - globalStartTime[0]);
      emitClient(socket, 'latlng', {
        lat: value.geo.coordinates[0],
        lng: value.geo.coordinates[1],
        size: Math.random() * 150 + 50,
        rate: Math.round((totTwit / calcTime)*60),
        calcTime: calcTime,
        count: totTwit
      });
    }

  });
  //  on result from hooks
  sink.on('message', function(sinkResult) {
    //  parse
    sinkResult = JSON.parse(sinkResult.toString());
    //  switch on action find socket emit name space
    switch (sinkResult.action) {
    case 'stat':
      //  save to db
      dbHook.emit('statResult', sinkResult.result);
      //  stats result
      emitClient(socket, 'stats', sinkResult.result);
      break;
    case 'wl':
      //  save to db
      dbHook.emit('wlResult', sinkResult.result);
      //  word list result
      emitClient(socket, 'wordlist', sinkResult);
      break;
    default:
      logger.log('cannot find sink action, ' + sinkResult.action);
    }
  });
  //  client disconnects
  socket.on('disconnect', function() {
    logger.log('client disconnected');
    twitStream.end();
    logger.log('twitter stream closed');
  });
});
//  private functions
//  rate controller for client events
var cEmitter = _.throttle(function(socket, action, data) {
  socket.volatile.emit(action, data);
}, 500);
//  interface for client side throttle

function emitClient(socket, action, data) {
  if ((action) && (data)) {
    cEmitter(socket, action, data);
  }
}
//  loop for emitting word structure calls
setInterval(function() {
  wlHook.emit('getGlossary');
}, 150000);
app.listen(config.server.port);
logger.log('http server bound to port: ' + config.server.port);