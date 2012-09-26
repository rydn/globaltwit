var axon = require('axon');
var Mongolian = require("mongolian");
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json'));
//  logger
var caterpillar = require('caterpillar');
var logger = new caterpillar.Logger();
//	counters
var itemsSaved = 0;
var totalTime = 0;
var avgTime= 0;
var server = new Mongolian();
//	tracer
if(config.hooks.db.tracer.enabled)
{
	require('look').start(config.hooks.db.tracer.port, config.hooks.db.tracer.host);
}
var db = server.db("globalTwit"),
//	tweets
twits = db.collection("twits");
//	stats
stats = db.collection("stats");
//	word lists
wordlist = db.collection("wordlist");

var dbHook = axon.socket('emitter');
dbHook.connect(config.hooks.db.port);
logger.log('db subscriber connected on port: '+config.hooks.db.port);
//	save tp db
dbHook.on('save', function(dataToSave){
	var start = new Date();
	itemsSaved++;
	twits.insert(dataToSave);
	var finish = new Date();
	totalTime = totalTime + (finish - start);
	avgTime = Math.round(totalTime / itemsSaved);
});
//	save stats
dbHook.on('statResult', function(statResult){
	var start = new Date();
	logger.log('statResult\n'+statResult);
	itemsSaved++;
	stats.insert(statResult);
	var finish = new Date();
	totalTime = totalTime + (finish - start);
	avgTime = Math.round(totalTime / itemsSaved);
});
//	save wordlist
dbHook.on('wlResult', function(wlResult){
	var start = new Date();
	logger.log('wlResult\n'+wlResult);
	itemsSaved++;
	stats.insert(wlResult);
	var finish = new Date();
	totalTime = totalTime + (finish - start);
	avgTime = Math.round(totalTime / itemsSaved);
});
//  interval for reporting stats
setInterval(function(){
  logger.log('\ntotal saved to db: '+itemsSaved);
  logger.log('total time spent proccessing: ' + totalTime +'ms');
  logger.log('average time per save: '+Math.round(avgTime)+'ms');
}, 10000);

