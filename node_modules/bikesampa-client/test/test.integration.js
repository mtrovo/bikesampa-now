'use strict';

var BikeSampaClient = require('../lib/bikesampaclient.js').BikeSampaClient,
  expect = require('chai').expect;


describe('BikeSampaClient', function () {
  describe('!integration', function () {
    var bikesp = new BikeSampaClient({debug: false});
    it('should load stations', function (done) {
      bikesp.getAll(function (err, stations){
        if(err) {
          done(err);
        } else {
          expect(stations.length).not.to.equal(0);
          done();
        }
      });
    });
  });
});