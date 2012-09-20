var Hook = require('hook.io').Hook,
Mongolian = require("mongolian");

var server = new Mongolian();

var db = server.db("globalTwit"),
twits = db.collection("twits"),
dbHook = new Hook({
  name: "db"
});
//	save tp db
dbHook.on('*::save', function(dataToSave){
	twits.insert(dataToSave);
});

dbHook.start();