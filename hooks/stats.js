//  deps
var axon = require('axon'),
  _ = require('underscore'),
  fs = require('fs'),
  config = JSON.parse(fs.readFileSync('./config.json')),
  microtime = require('microtime');
inspect = require('util').inspect;
//  vars
var countryCount = [],
  twitCountWithGeo = 0,
  twitCount = 0,
  totalTime = 0,
  avgTime = 0,
  startTime;
//  logger
var caterpillar = require('caterpillar'),
  logger = new caterpillar.Logger();
//
//  tracer
if (config.hooks.stats.tracer.enabled) {
  require('look').start(config.hooks.stats.tracer.port, config.hooks.stats.tracer.host);
}
//
//  hook and sink
var statHook = axon.socket('emitter');
var statSink = axon.socket('push');
//  establish hook and sink
statSink.connect(config.hooks.stats.sink.port);
statHook.connect(config.hooks.stats.port);
//  log event
logger.log('stats sink connected to port: ' + config.hooks.stats.sink.port);
logger.log('stats subscriber connected to port: ' + config.hooks.stats.port);
//
//  main proccessing function(wrapped by rate limiting from underscore)


function process(value) {
  //  inc twitter counter
  twitCount++;
  //  if the tweet is has a lat long pos
  if (value.geo) {
    //  inc twit with lat long pos counter
    twitCountWithGeo++;
    //  if the tweet has geocoding that we can use
    if (value.place) {
      //  if country name is listed for counting twits by country
      if (value.place.country) {
        //get country to increase
        var currentCountry = _.find(countryCount, function(country) {
          if (country.name == value.place.country) {
            return country;
          }
        });
        //  if we havent seen a current country create entity
        if (!currentCountry) {
          countryCount.push({
            count: 1,
            name: value.place.country
          });
        } else {
          //  if we have record of country inc counter
          currentCountry.count = currentCountry.count + 1;
          //  merge into parent object
          countryCount = _.union(currentCountry, countryCount);
        }
      }
    }
  }
  //  sort the object by number of tweets
  countryCount = _.sortBy(countryCount, function(obj) {
    return obj.count;
  });
  //  record operation complete
  var completionTime = microtime.now();
  var calcTime = (completionTime - startTime);
  //  time result calculations
  totalTime = totalTime + calcTime;
  avgTime = totalTime / twitCount;
  //  constuct and serialize a return result
  statSink.send(JSON.stringify({
    action: "stat",
    result: {
      count: twitCount,
      withGeo: twitCountWithGeo,
      time: {
        calc: calcTime,
        start: startTime,
        complete: completionTime,
        calcTime: {
          total: totalTime,
          avg: avgTime
        }
      },
      countryCount: countryCount
    }
  }));
}
//
//  main logic
//  create throttled version of proccess
var proc = _.throttle(process, config.hooks.stats.rateLimit);
//  on call from server enque
statHook.on('calc', function(value) {
  //  if debug log event
  if (config.hooks.stats.debug) {
    logger.log('subscriber receiving: ' + inspect(value));
  }
  //  mark time
  startTime = microtime.now();
  // execute throttled proccessing
  proc(value);
});
//
//  interval for reporting stats
setInterval(function() {
  logger.log('\ntotal processed: ' + twitCount);
  logger.log('total time spent proccessing: ' + totalTime + 'ms');
  logger.log('average time per proc: ' + Math.round(avgTime) + 'ms');
}, 10000);