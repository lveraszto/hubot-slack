'use strict';

import sinon from 'sinon';
import chai from 'chai';
import chaiSubset from 'chai-subset';
import sinonChai from 'sinon-chai';

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
