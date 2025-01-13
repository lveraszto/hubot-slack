'use strict';

import sinon from 'sinon';
import { use, expect } from 'chai';
import chaiSubset from 'chai-subset';
import sinonChai from 'sinon-chai';

before(function() {
  global.expect = expect;
  global.sinon = sinon;
  use(sinonChai);
  use(chaiSubset);
});

beforeEach(function() {
  global.sinonSandbox = sinon.createSandbox();
});

afterEach(function() {
  global.sinonSandbox.restore();
});
