'use strict';

const sinon = require('sinon');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const sinonChai = require('sinon-chai');

before(function() {
  global.expect = chai.expect;
  global.sinon = sinon;
  chai.use(sinonChai);
  chai.use(chaiSubset);
});

beforeEach(function() {
  global.sinonSandbox = sinon.createSandbox();
});

afterEach(function() {
  global.sinonSandbox.restore();
});
