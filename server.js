var express = require('express');
var BikeSampaClient = require('bikesampa-client').CachedBikeSampaClient;
var geolib = require('geolib');
var morgan = require('morgan');

bikesampa = new BikeSampaClient({ttl: 60});

var app = express();
app.use(morgan('dev'));

var port = process.env.PORT || 8000;
console.dir(bikesampa);

function orderStationsByDistance (ref, stations) {
	return geolib.orderByDistance(ref, stations)
	.map(function(el){
		var cur = stations[el.key];
		cur.distance = el.distance;
		return cur;
	});
}

var api = express.Router();
api.get('/now', function(req, res, next) {
	bikesampa.getAll(function(err, stations) {
		if(err) next(req, res, err);
		else {
			var working = Object.keys(stations).map(k => stations[k])
					.filter(el => el.status === "working");
			var availIn = working.filter(el => el.freePositions > 0);
			var availOut = working.filter(el => el.availableBikes > 0);

			var respDoc = { timestamp: bikesampa.lastModified };
			if(!!req.query.lat && !!req.query.lng){
				var ref = {lat: req.query.lat, lng: req.query.lng};
				availIn = orderStationsByDistance(ref, availIn).slice(0, 6);
				availOut = orderStationsByDistance(ref, availOut).slice(0, 6);
				respDoc.referencePoint = ref;
			}
			respDoc.availableIn = availIn;
			respDoc.availableOut = availOut;
			res.json(respDoc);
		}
	});
})
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