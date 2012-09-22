var axon = require('axon');
var Mongolian = require("mongolian");
var _ = require('underscore');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json'));
//  logger
var caterpillar = require('caterpillar');
var logger = new caterpillar.Logger();
//main lib
libWl = require('../lib/createGlossary.js')({
	minFreq: 2
});
//	counters
var itemsProccessed = 0;
var totalTime = 0;
var avgTime = 0;

var server = new Mongolian();

var db = server.db("globalTwit");
var twits = db.collection("twits");
var keywords = db.collection('keywords');
//	wordlist rpc socket
var wlHook = axon.socket('emitter');
wlHook.connect(config.hooks.wordlist.port);
logger.log('wordlist subscriber connected to port: ' + config.hooks.wordlist.port);

//	sink socket
var sink = axon.socket('push');
sink.connect(config.hooks.wordlist.sink.port);
logger.log('sink connected on port: ' +config.hooks.wordlist.sink.port);

//	private functions
//	main task

function _getGlossary() {
	var startTime = new Date();
	getTwitsFrmDb(function(err, twitsArr) {
		if (!err) {
			var returnObj = {
				results: {
					keywords: [],
					count: 0
				},
				time: {
					total: 0,
					avg: 0
				},
				action: 'wl'
			};
			//	iterate the twits
			for (var i = twitsArr.length - 1; i >= 0; i--) {
				itemsProccessed++;
				var currentTwit = twitsArr[i];
				if ((currentTwit.text) && (currentTwit.text.length > 10)) {
					var currentKeyWords = libWl.extract(currentTwit.text);
					if(currentKeyWords.length > 0)
					{
						returnObj.results.keywords.push(currentKeyWords);
					}
				}
			}
			//	save to db
			keywords.insert({results:returnObj.results.keywords});
			var endTime = new Date();
			var eventTime = endTime - startTime;
			totalTime = totalTime + eventTime;
			returnObj.count = itemsProccessed;
			returnObj.time.total = totalTime;
			returnObj.time.avg = totalTime / itemsProccessed;
			sink.send(JSON.stringify(returnObj));
		} else {
			logger.log('ERROR - ' + err);
		}
	});
}

function getTwitsFrmDb(cb) {
	twits.find().skip(itemsProccessed).limit(1000).toArray(function(err, twitsArr) {
		if ((err) || (!twitsArr)) cb(err, null);
		else cb(null, twitsArr);
	});
}
//	rate limited main task
var getGlossary = _.throttle(_getGlossary, 100);
//	socket bindings
wlHook.on('getGlossary', function(wlReq) {
	getGlossary();
});

//  interval for reporting stats
setInterval(function() {

	twits.count(function(err, totalInDb) {
		logger.log('\ntotal tweets in database: ' + totalInDb);
		logger.log('total processed: ' + itemsProccessed);
		logger.log('total time spent proccessing: ' + totalTime + 'ms');
		logger.log('average time per proc: ' + Math.round(totalTime / itemsProccessed) + 'ms');
	});
}, 10000);