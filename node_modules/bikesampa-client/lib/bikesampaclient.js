"use strict";
var request = require("request"),
  vm = require("vm"),
  iconv = require('iconv');

var BikeSampaClient = function (options) {
  options = options || {};
  this._url = options.url || BikeSampaClient.FETCH_URL;
  this.debug = options.debug || false;
};

BikeSampaClient.FETCH_PROTOCOL = "http://";
BikeSampaClient.FETCH_HOST = "ww2.mobilicidade.com.br";
BikeSampaClient.FETCH_PATH = "/bikesampa/mapaestacao.asp";
BikeSampaClient.FETCH_URL = BikeSampaClient.FETCH_PROTOCOL + BikeSampaClient.FETCH_HOST + BikeSampaClient.FETCH_PATH;

BikeSampaClient._statusForStation = function (statusOnline, statusOperacao) {
  if (statusOnline === "A" && statusOperacao === "EO") {
    return "working";
  }
  if (statusOperacao === "EM") {
    return "maintenance";
  }
  if (statusOperacao === "EI") {
    return "deploying";
  }
  return "offline";
};

BikeSampaClient._normalizeStationModel = function (el) {
  return {
    stationId: el.IdEstacao,
    name: el.Nome,
    address: el.Endereco,
    reference: el.Referencia,
    lat: el.Latitude,
    lng: el.Longitude,
    status: BikeSampaClient._statusForStation(el.StatusOnline, el.StatusOperacao),
    acceptsBilheteUnico: el.estacaoIntegradaBU === 'S',
    freePositions: parseInt(el.QtdPosicaoLivre, 10),
    availableBikes: parseInt(el.QtdBicicletas, 10)
  };
};

BikeSampaClient._buildObjectsFromStringFunc = function (body) {
  var ctx = {
    exibirEstacaMapa: function exibirEstacaMapa(latitude, longitude, icone, Nome, IdEstacao, StatusOnline, StatusOperacao, VagasOcupadas, numBicicletas, Endereco, stations) {
      var ends = Endereco.split(/ \/ /),
        end = ends[0],
        ref = ends.length > 1 ? ends[1] : '';

      // if (global.stations === undefined) global.stations = [];

      stations.push({
        "Endereco": end,
        "IdEstacao": IdEstacao,
        "Latitude": latitude,
        "Longitude": longitude,
        "Nome": Nome,
        "QtdBicicletas": VagasOcupadas,
        "QtdPosicaoLivre": String(parseInt(numBicicletas, 10) - parseInt(VagasOcupadas, 10)),
        "Referencia": ref,
        "StatusOnline": StatusOnline,
        "StatusOperacao": StatusOperacao,
        "estacaoIntegradaBU": "S",
        "qtdBicicletasDisponiveisEstacao": VagasOcupadas,
        "statusEstacao": null
      });
    }
  };

  // how my life would be wonderful without this hack
  var adjustedScript = 'var stations = [];' + body.replace(/\)/mg, ', stations)');
  if(BikeSampaClient.debug){
    console.log("running script\n", adjustedScript);
  }
  vm.runInNewContext(adjustedScript, ctx, {timeout: 10000});
  return ctx.stations;
};

BikeSampaClient._sliceStationsInfoFromHtml = function (html) {
  var ret = {copy: false, lines: []};
  html.split(/\n/).reduce(function (cur, el) {
    if (cur.copy) {
      if (el.search(/funcao responsavel por plotar as estacoes/) >= 0) {
        cur.copy = false;
      } else {
        cur.lines.push(el);
      }
    }
    if (el.search(/Criando ponto - plotanto ponto no mapa/) >= 0) {
      cur.copy = true;
    }
    return cur;
  }, ret);
  
  // remove the last line from the output
  if(ret.lines.length !== 0){
    ret.lines.pop();
  }

  return ret.lines.join('\n');
};

BikeSampaClient.prototype.getAll = function (callback) {
  var opts = {
    url: this._url,
    json: false,
    strictSSL: false,
    headers: {
      'User-Agent': 'request'
    },
    encoding: null
  };
  var self = this;
  request.get(opts, function (err, resp, body) {
    if (err) {
      callback(err);
    } else {
      // convert buffer
      var ic = new iconv.Iconv('iso-8859-1', 'utf-8');
      body = ic.convert(body).toString('utf-8');
      
      // get HTML slice with JS Script
      var slicedBody = BikeSampaClient._sliceStationsInfoFromHtml(body);
      if(self.debug){
        console.log("recognized body to eval:", slicedBody);
      }

      var entryStations = BikeSampaClient._buildObjectsFromStringFunc(slicedBody),
        idEstacaoKeyReducer = function (ac, el) {ac[el.stationId] = el; return ac; },
        stations = entryStations.map(function (el) {
          return BikeSampaClient._normalizeStationModel(el);
        }).reduce(idEstacaoKeyReducer, {});
      callback(null, stations);
    }
  });
};

BikeSampaClient.prototype.getStation = function (id, callback) {
  this.getAll(function (err, stations) {
    if (err) {
      callback(err);
    } else {
      callback(null, stations[id]);
    }
  });
};

function CachedBikeSampaClient(options) {
  this.delegate = new BikeSampaClient(options);
  this.ttl = (options.ttl || 30) * 1000;
  this.lastModified = 0;
}
CachedBikeSampaClient.prototype.isCacheValid = function () {
  if (!this.cache) {
    return false;
  }
  var delta = new Date().getTime() - this.lastModified;
  return delta < this.ttl;
};

CachedBikeSampaClient.prototype.getAll = function (callback) {
  if (this.isCacheValid()) {
    callback(null, this.cache);
  } else {
    var _this = this;
    this.delegate.getAll(function (err, stations) {
      _this.cache = stations;
      _this.lastModified = new Date().getTime();
      callback(err, stations);
    });
  }
};
CachedBikeSampaClient.prototype.getStation = function (id, callback) {
  if (this.isCacheValid()) {
    callback(null, this.cache[id]);
  } else {
    this.getAll(function (err, stations) {
      callback(err, stations[id]);
    });
  }
};

module.exports = {
  BikeSampaClient: BikeSampaClient,
  CachedBikeSampaClient: CachedBikeSampaClient
};