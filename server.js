var express = require('express');
var BikeSampaClient = require('bikesampa-client').CachedBikeSampaClient;
var geolib = require('geolib');

bikesampa = new BikeSampaClient({ttl: 60});

var app = express();
var port = process.env.PORT || 8000;
console.dir(bikesampa);

var api = express.Router();
api.get('/stations', function(req, res, next) {
	bikesampa.getAll(function(err, stations) {
		if(err) next(req, res, err);
		else {
			res.json({timestamp: bikesampa.lastModified, stations: stations});
		}
	});
});
api.get('/stations/near', function(req, res, next){
	bikesampa.getAll(function(err, stations){
		if(err) next(req, res, err);
		else {
			var ref = {lat: req.query.lat, lng: req.query.lng};
			var nearest = geolib.orderByDistance(ref, stations)
				.slice(0, 6).map(function(el){
					var cur = stations[el.key];
					cur.distance = el.distance;
					return cur;
				});
			res.json({timestamp: bikesampa.lastModified, stations: nearest});
		}
	});
});
api.get('/stations/:station_id', function(req, res, next) {
	bikesampa.getStation(req.params.station_id, function(err, station){
		if(err) next(req, res, err);
		else if(!station) {
			res.status(404).send({error: 'Station not found ' + req.params.station_id});
		} else {
			res.json({timestamp: bikesampa.lastModified, station: station});
		}
	});
});

api.use(function errHandling(err, req, res, next){
	console.error(err.stack);
	res.status(500).json({error: err.message});
})


app.use('/api', api);
app.listen(port, function f () {
	console.log('listening on http://localhost:' + port);
})