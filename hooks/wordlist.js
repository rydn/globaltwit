var axon = require('axon');
var Mongolian = require("mongolian");
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json'));
//main lib
libWl = require('../lib/createGlossary.js');
//	counters
var itemsProccessed = 0;
var totalTime = 0;
var avgTime = 0;

var server = new Mongolian();

var db = server.db("globalTwit");
var twits = db.collection("twits");

var wlHook = axon.socket('emitter');
wlHook.connect(config.hooks.wordlist.port);

var sink = axon.socket('push');
sink.connect(config.hooks.wordlist.sink.port);

wlHook.on('getGlossary', function(wlReq) {
	var startTime = new Date();
	console.log('getGlossary called');
	getTwitsFrmDb(wlReq, function(err, twitsArr) {
		if (!err) {
			var returnObj = {
				results: {
					keywords: [],
					count:0
				},
				time: {
					total: 0,
					avg: 0
				},
				action:'wl'
			};
			//	iterate the twits
			for (var i = twitsArr.length - 1; i >= 0; i--) {
				itemsProccessed++;
				var currentTwit = twitsArr[i];
				var currentKeyWords = libWl.extract(currentTwit.text);
				returnObj.results.keywords.push({
					text: currentTwit.text,
					keywords: currentKeyWords
				});

			}
			var endTime = new Date();
			var eventTime = endTime - startTime;
			totalTime = totalTime + eventTime;
			returnObj.time.total = totalTime;
			returnObj.time.avg = totalTime / itemsProccessed;
			sink.send(JSON.stringify(returnObj));
		} else {
			throw err;
		}
	});

});

function getTwitsFrmDb(wlReq, cb) {
	twits.find({
		limit: 2500
	}, function(err, twitsArr) {
		if (err) cb(err, null);
		else cb(null, twitsArr);
	});
}