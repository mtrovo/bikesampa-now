'use strict';

var assert = require('assert');
var nock = require('nock');
var fs = require('fs');
var expect = require('chai').expect;

var bikesp = require('../lib/bikesampaclient.js');
var CachedBikeSampaClient = bikesp.CachedBikeSampaClient;
var BikeSampaClient = bikesp.BikeSampaClient;

var client;

describe('CachedBikeSampaClient', function () {
  var singlestationPayload = fs.readFileSync(__dirname + '/html-cases/station1.html');

  beforeEach(function setupEachTest() {
    client = new CachedBikeSampaClient({ttl: 1});
  });

  describe("#isCacheValid", function  () {

    it('should return false when there is no cache', function () {
      var c = new CachedBikeSampaClient({ttl: 1});
      c.lastModified = new Date().getTime();

      assert.ok(!c.isCacheValid());
    });
    it('should return true when cache is up to ttl time', function () {
      var c = new CachedBikeSampaClient({ttl: 1});
      c.cache = {};
      c.lastModified = new Date().getTime();

      assert.ok(c.isCacheValid());
    });
    it('should return false when cache is out of ttl time', function () {
      var c = new CachedBikeSampaClient({ttl: 1});
      c.cache = {};
      c.lastModified = new Date().getTime() - 60000;

      assert.ok(!c.isCacheValid());
    });
  });
  describe('#getAll', function () {
    it('should fetch all expected stations', function (done) {
      nock(BikeSampaClient.FETCH_PROTOCOL + BikeSampaClient.FETCH_HOST)
        .get(BikeSampaClient.FETCH_PATH)
        .reply(200, singlestationPayload);
      
      client.getAll(function (err, stations) {
        if(err) done(err);
        else{
          expect(Object.keys(stations).length).to.equal(1);
          assert.ok(stations['1']);
          expect(stations['1']).to.deep.equal({
            "stationId":"1",
            "name":"Instituto Biologico",
            "address":"Rua Morgado de Mateus, em frente ao numero 652",
            "reference":"",
            "lat":"-23.587315",
            "lng":"-46.647974",
            "status":"offline",
            "acceptsBilheteUnico":true,
            "freePositions":11,
            "availableBikes":1
          });
          expect(client.cache).to.equal(stations);
          assert.ok(client.ttl !== 0);
          done();
        }
      });
    });
    it('should cache result for the ttl time', function (done) {
      nock(BikeSampaClient.FETCH_PROTOCOL + BikeSampaClient.FETCH_HOST)
        .get(BikeSampaClient.FETCH_PATH)
        .reply(200, singlestationPayload);
      var lastModified;
      client.getAll(function (err, stations) {
        if(err) done(err);
        else{
          expect(Object.keys(stations).length).to.equal(1);
          assert.ok(stations['1']);
          expect(stations['1']).to.deep.equal({
            "stationId":"1",
            "name":"Instituto Biologico",
            "address":"Rua Morgado de Mateus, em frente ao numero 652",
            "reference":"",
            "lat":"-23.587315",
            "lng":"-46.647974",
            "status":"offline",
            "acceptsBilheteUnico":true,
            "freePositions":11,
            "availableBikes":1
          });
          expect(client.cache).to.equal(stations);
          assert.ok(client.lastModified !== 0);
          lastModified = client.lastModified;


          client.getAll(function (err, stations2) {
            if(err) done(err);
            else{
              expect(Object.keys(stations2).length).to.equal(1);
              assert.ok(stations2['1']);
              expect(stations2['1']).to.deep.equal({
                "stationId":"1",
                "name":"Instituto Biologico",
                "address":"Rua Morgado de Mateus, em frente ao numero 652",
                "reference":"",
                "lat":"-23.587315",
                "lng":"-46.647974",
                "status":"offline",
                "acceptsBilheteUnico":true,
                "freePositions":11,
                "availableBikes":1
              });
              expect(client.cache).to.equal(stations2);
              expect(client.lastModified).to.equal(lastModified);
              done();
            }
          });
        }
      });
    });

    it('should refresh cache after ttl time', function (done) {
      nock(BikeSampaClient.FETCH_PROTOCOL + BikeSampaClient.FETCH_HOST)
        .get(BikeSampaClient.FETCH_PATH)
        .reply(200, singlestationPayload);
      
      var lastModified;
      client.getAll(function (err, stations) {
        if(err) done(err);
        else{
          expect(Object.keys(stations).length).to.equal(1);
          assert.ok(stations['1']);
          expect(stations['1']).to.deep.equal({
            "stationId":"1",
            "name":"Instituto Biologico",
            "address":"Rua Morgado de Mateus, em frente ao numero 652",
            "reference":"",
            "lat":"-23.587315",
            "lng":"-46.647974",
            "status":"offline",
            "acceptsBilheteUnico":true,
            "freePositions":11,
            "availableBikes":1
          });
          expect(client.cache).to.equal(stations);
          assert.ok(client.lastModified !== 0);
          lastModified = client.lastModified;

          // last modified 1min ago
          client.lastModified -= 60000;
          nock(BikeSampaClient.FETCH_PROTOCOL + BikeSampaClient.FETCH_HOST)
            .get(BikeSampaClient.FETCH_PATH)
            .reply(200, singlestationPayload);
          client.getAll(function (err, stations) {
            if(err) done(err);
            else{
              expect(Object.keys(stations).length).to.equal(1);
              assert.ok(stations['1']);
              expect(stations['1']).to.deep.equal({
                "stationId":"1",
                "name":"Instituto Biologico",
                "address":"Rua Morgado de Mateus, em frente ao numero 652",
                "reference":"",
                "lat":"-23.587315",
                "lng":"-46.647974",
                "status":"offline",
                "acceptsBilheteUnico":true,
                "freePositions":11,
                "availableBikes":1
              });
              expect(client.cache).to.equal(stations);
              assert.ok(lastModified < client.lastModified);
              done();
            }
          });
        }
      });
    });
  });
});