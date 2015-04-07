/* jshint -W030 */
'use strict';

var nock = require('nock'),
  BikeSampaClient = require('../lib/bikesampaclient.js').BikeSampaClient,
  fs = require('fs'),
  _ = require('underscore'),
  path = require('path'),
  expect = require('chai').expect,
  iconv = require('iconv');

var client;

var TEST_STATION = {
  "CodArea": "21",
  "CodTipo": "3",
  "Endereco": "Rua Morgado de Mateus, em frente ao numero 652",
  "IdEstacao": "1",
  "Latitude": "-23.587315",
  "Longitude": "-46.647974",
  "Nome": "Instituto Biologico",
  "QtdBicicletas": "1",
  "QtdPosicaoLivre": "11",
  "Referencia": "",
  "StatusOnline": "I",
  "StatusOperacao": "EO",
  "estacaoIntegradaBU": "N",
  "qtdBicicletasDisponiveisEstacao": "1",
  "statusEstacao": "Est_Normal 1"
};

function isTest(f) {
  return (/\.test\.html$/).test(f);
}

function isExpectation(f) {
  return (/\.expectation\.js$/).test(f);
}

describe('BikeSampaClient', function () {
  var casefiles = [], tests, expectations, cases;

  fs.readdirSync(__dirname + '/html-cases/').forEach(function (f) {
    return casefiles.push(path.normalize(__dirname + '/html-cases/' + '/' + f));
  });

  tests = casefiles.filter(isTest);
  tests.sort();

  expectations = casefiles.filter(isExpectation);
  expectations.sort();

  cases = _.zip(tests, expectations);

  beforeEach(function setupEachTest() {
    client = new BikeSampaClient();
  });

  describe('@_statusForStation', function () {
    it('should transform working status', function () {
      expect(BikeSampaClient._statusForStation('A', 'EO')).to.equal('working');
      expect(BikeSampaClient._statusForStation('I', 'EO')).not.to.equal('working');
      expect(BikeSampaClient._statusForStation('A', 'I')).not.to.equal('working');
    });
    it('should transform maintenance status', function () {
      expect(BikeSampaClient._statusForStation('A', 'EM')).to.equal('maintenance');
      expect(BikeSampaClient._statusForStation('I', 'EM')).to.equal('maintenance');
    });
    it('should transform deploying status', function () {
      expect(BikeSampaClient._statusForStation('A', 'EI')).to.equal('deploying');
      expect(BikeSampaClient._statusForStation('I', 'EI')).to.equal('deploying');
    });
    it('should transform offline status', function () {
      expect(BikeSampaClient._statusForStation('I', 'EO')).to.equal('offline');
    });
  });

  describe('@_normalizeStationModel', function () {
    it('should transform acceptsBilheteUnico', function () {
      expect(BikeSampaClient._normalizeStationModel({estacaoIntegradaBU: 'S'}).acceptsBilheteUnico).to.equal(true);
      expect(BikeSampaClient._normalizeStationModel({estacaoIntegradaBU: 'N'}).acceptsBilheteUnico).to.equal(false);
    });

    it('should transform status', function () {
      expect(BikeSampaClient._normalizeStationModel({StatusOnline: "A", StatusOperacao: 'EO'}).status).to.equal('working');
      expect(BikeSampaClient._normalizeStationModel({StatusOperacao: 'EM'}).status).to.equal('maintenance');
      expect(BikeSampaClient._normalizeStationModel({StatusOperacao: 'EI'}).status).to.equal('deploying');
      expect(BikeSampaClient._normalizeStationModel({StatusOnline: "I", StatusOperacao: "EO"}).status).to.equal('offline');
    });

    it('should transform full object', function () {
      expect(BikeSampaClient._normalizeStationModel(TEST_STATION)).to.deep.equal({
        "stationId": "1",
        "name": "Instituto Biologico",
        "address": "Rua Morgado de Mateus, em frente ao numero 652",
        "reference": "",
        "lat": "-23.587315",
        "lng": "-46.647974",
        "status": "offline",
        "acceptsBilheteUnico": false,
        "freePositions": 11,
        "availableBikes": 1
      });
    });
  });

  describe('@_buildObjectsFromStringFunc', function () {
    it('should read single station correctly', function () {
      var func = fs.readFileSync(__dirname + '/html-cases/singlestation.expectation.js', {encoding: "UTF-8"}),
        stations = BikeSampaClient._buildObjectsFromStringFunc(func);

      expect(stations).to.deep.equal([{
        "Endereco": "Rua Morgado de Mateus, em frente ao numero 652",
        "IdEstacao": "1",
        "Latitude": "-23.587315",
        "Longitude": "-46.647974",
        "Nome": "Instituto Biologico",
        "QtdBicicletas": "0",
        "QtdPosicaoLivre": "12",
        "Referencia": "",
        "StatusOnline": "I",
        "StatusOperacao": "EM",
        "estacaoIntegradaBU": "S",
        "qtdBicicletasDisponiveisEstacao": "0",
        "statusEstacao": null
      }]);
    });
    it('should identify all stations availables', function () {
      var func = fs.readFileSync(__dirname + '/html-cases/manystations.expectation.js', {encoding: "UTF-8"}),
        stations = BikeSampaClient._buildObjectsFromStringFunc(func);

      expect(stations.length).to.equal(253);
      expect(stations.pop()).to.deep.equal({
        "Endereco": "Rua Artur de Azevedo 1760",
        "IdEstacao": "285",
        "Latitude": "-23.566085",
        "Longitude": "-46.687460",
        "Nome": "Artur de Azevedo",
        "QtdBicicletas": "0",
        "QtdPosicaoLivre": "12",
        "Referencia": "",
        "StatusOnline": "I",
        "StatusOperacao": "EI",
        "estacaoIntegradaBU": "S",
        "qtdBicicletasDisponiveisEstacao": "0",
        "statusEstacao": null
      });
    });
    it('should identify accents correctly', function () {
      var func = fs.readFileSync(__dirname + '/html-cases/accents.js');

      // convert buffer
      var ic = new iconv.Iconv('iso-8859-1', 'utf-8');
      func = ic.convert(func).toString('utf-8');
      
      var stations = BikeSampaClient._buildObjectsFromStringFunc(func);

      expect(stations[248]).to.deep.equal({
        "Endereco": "Praça Horàcio Sabino 161",
        "IdEstacao": "281",
        "Latitude": "-23.550679",
        "Longitude": "-46.684531",
        "Nome": "Praça Horàcio Sabino",
        "QtdBicicletas": "0",
        "QtdPosicaoLivre": "12",
        "Referencia": "",
        "StatusOnline": "I",
        "StatusOperacao": "EI",
        "estacaoIntegradaBU": "S",
        "qtdBicicletasDisponiveisEstacao": "0",
        "statusEstacao": null
      });
    });
  });

  describe('@_sliceStationsInfoFromHtml', function () {
    cases.forEach(function (cur) {
      var test = cur[0], exp = cur[1],
        radical = _.last(exp.split(/\./)[0].split('/'));
      it('should fetch only stations info #' + radical, function () {
        var content = fs.readFileSync(test, {encoding: 'UTF-8'}),
          expected = fs.readFileSync(exp, {encoding: 'UTF-8'});
        expect(expected).to.equal(BikeSampaClient._sliceStationsInfoFromHtml(content));
      });
    });
  });

  describe('#getAll', function () {
    it('should fetch all expected stations', function (done) {
      nock(BikeSampaClient.FETCH_PROTOCOL + BikeSampaClient.FETCH_HOST)
        .get(BikeSampaClient.FETCH_PATH)
        .reply(200, fs.readFileSync(__dirname + '/html-cases/station1.html'));

      client.getAll(function (err, stations) {
        if (err) {
          done(err);
        } else {
          expect(Object.keys(stations).length).to.equal(1);
          expect(stations['1']).to.be.ok;
          expect(stations['1']).to.deep.equal({
            "stationId": "1",
            "name": "Instituto Biologico",
            "address": "Rua Morgado de Mateus, em frente ao numero 652",
            "reference": "",
            "lat": "-23.587315",
            "lng": "-46.647974",
            "status": "offline",
            "acceptsBilheteUnico": true,
            "freePositions": 11,
            "availableBikes": 1
          });
          done();
        }
      });
    });
  });
});