//  dep
var Hook = require('hook.io').Hook;
var _ = require('underscore');
//  vars
var countryCount = [];
var twitCountWithGeo = 0;
var twitCount = 0;
var totalTime = 0;
var avgTime = 0;
var startTime;
//  hook
var statHook = new Hook({
  name: 'stat',
  silent: true,
  autoheal: true
});
//  private functions
//  main proccessing function
function process(value) {
  twitCount++;
  if (value.geo) {
    twitCountWithGeo++;
    if (value.place) {
      if (value.place.country) {
        //get country to increase
        var currentCountry = _.find(countryCount, function(country) {
          if (country.name == value.place.country) {
            return country;
          }
        });
        if (!currentCountry) {
          countryCount.push({
            count: 1,
            name: value.place.country
          });
        } else {
          currentCountry.count = currentCountry.count + 1;
          countryCount = _.union(currentCountry, countryCount);
        }
      }
    }
  }
  countryCount = _.sortBy(countryCount, function(obj) {
    return obj.count;
  });
  var completionTime = new Date();
  var calcTime = (completionTime - startTime);
  totalTime = totalTime + calcTime;
  avgTime = totalTime / twitCount;
  statHook.emit('result', {
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

//  main logic
//  create throttled version of proccess
var proc = _.rateLimit(process, 500, false);
statHook.on('hook::ready', function() {
  console.log('stats hook ready, running in sync mode with a limit of 1 request per 1000ms');
});
statHook.on('*::calc', function(value) {
  //  mark time
  startTime = new Date();
  proc(value);
});
//  interval for reporting stats
setInterval(function(){
  console.log('\ntotal processed: '+twitCount);
  console.log('total time spent proccessing: ' + totalTime +'ms');
  console.log('average time per proc: '+Math.round(avgTime)+'ms');
}, 10000);
statHook.start();