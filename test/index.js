var test = require('tape');
var Fixtures = require('./fixtures');
var createCanduit = require('../');

var fixtures = new Fixtures(test); 

function shouldError(t) {
  return function (err, canduit) {
    t.ok(err, 'should call back with an error');
    t.ok(!canduit, 'should not create a canduit instance');
    t.end();
  };
}

function shouldReportServerError(t) {
  return function (err, result) {
    t.ok(err, 'should call back with an error');
    t.ok(err.code === 'ECONNREFUSED', 'should match the client error');
    t.ok(!result, 'should not call back with data');
    t.end();
  };
}

function shouldReportClientError(t) {
  return function (err, result) {
    t.ok(err, 'should call back with a error');
    t.ok(err.code === 400, 'should match the canduit error');
    t.ok(!result, 'should not call back with data');
    t.end();
  };
}

function shouldReportNotFoundError(t) {
  return function (err, result) {
    t.ok(err, 'should call back with an error');
    t.ok(err.code === 404, 'should match the server error');
    t.ok(!result, 'should not call back with data');
    t.end();
  };
}

function shouldSucceed(t) {
  return function (err, canduit) {
    t.error(err);
    t.ok(canduit, 'should create canduit instance');
    t.ok(canduit.session, 'should record canduit session credentials');
    t.end();
  };
}

function shouldCallBack(t) {
  return function (err, users) {
    t.error(err);
    t.ok(users, 'should call back with canduit API response');
    t.end();
  };
}

test('creating canduit instance without parameters', function (t) {
  t.doesNotThrow(function () {
    createCanduit(function noop ( ) { });
  }, 'should not throw an error');
  t.end();
});

test('authenticating with an unreadable config file', function (t) {
  createCanduit({
    configFile: 'not.there'
  }, shouldError(t));
});

test('authenticating with an malformed config file', function (t) {
  createCanduit({
    configFile: __filename
  }, shouldError(t));
});

test('authenticating with a .arcrc passed through an argument', function (t) {
  createCanduit({
    configFile: fixtures.configFile
  }, shouldSucceed(t));
});

test('authenticating with passed config parameters', function (t) {
  createCanduit({
    user: 'user',
    cert: 'cert',
    api: 'http://localhost:' + fixtures.port + '/api/'
  }, shouldSucceed(t));
});

test('requesting conduit api', function (t) {
  fixtures.addFixture('/api/user.query', {
    'result': [{
      'phid': 'PHID-USER-12345',
      'userName': 'test',
    }],
    'error_code': null,
    'error_info': null
  });

  createCanduit({
    configFile: fixtures.configFile
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('user.query', {
      usernames: ['aleksey']
    }, shouldCallBack(t));
  });
});

test('requesting conduit api route that returns an error', function (t) {
  fixtures.addFixture('/api/error', {
    'error_code': 400,
    'error_info': 'test error'
  });

  createCanduit({
    configFile: fixtures.configFile
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('error', {
      data: ['test']
    }, shouldReportClientError(t));
  });
});

test('requesting a non-existing route', function (t) {
  createCanduit({
    configFile: fixtures.configFile
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('404', {
      data: ['test']
    }, shouldReportNotFoundError(t));
  });
});

test('create canduit instance with token', function (t) {
  t.doesNotThrow(function () {
    createCanduit({api: 'somelink', token: 'some-token'}, function noop ( ) { });
  }, 'should not throw an error');
  t.end();
});

test('requesting conduit api with token', function (t) {
  fixtures.addFixture('/api/user.query', {
    'result': [{
      'phid': 'PHID-USER-12345',
      'userName': 'test',
    }],
    'error_code': null,
    'error_info': null
  }, true);

  createCanduit({
    configFile: fixtures.tokenConfigFile
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('user.query', {
      usernames: ['aleksey']
    }, shouldCallBack(t));
  });
});

test('requesting conduit api with token', function (t) {
  fixtures.addFixture('/api/user.query', {
    'result': [{
      'phid': 'PHID-USER-12345',
      'userName': 'test',
    }],
    'error_code': null,
    'error_info': null
  }, true);

  createCanduit({
    configFile: fixtures.tokenConfigFile
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('user.query', null, shouldCallBack(t));
  });
});

test('attempting to request a non-existing api', function (t) {
  createCanduit({
    api: 'http://localhost/does/not/exist'
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('404', {
      data: ['test']
    }, shouldReportServerError(t));
  });
});

test('requesting conduit api route that returns an error with token', function (t) {
  fixtures.addFixture('/api/error', {
    'error_code': 400,
    'error_info': 'test error'
  }, true);

  createCanduit({
    configFile: fixtures.tokenConfigFile
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('error', {
      data: ['test']
    }, shouldReportClientError(t));
  });
});

test('requesting a non-existing route with token', function (t) {
  createCanduit({
    configFile: fixtures.tokenConfigFile
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('404', {
      data: ['test']
    }, shouldReportNotFoundError(t));
  });
});

test('attempting to request a non-existing api with token', function (t) {
  createCanduit({
    api: 'http://localhost/does/not/exist',
    token: 'test-token'
  }, function (err, canduit) {
    t.error(err);
    canduit.exec('404', {
      data: ['test']
    }, shouldReportServerError(t));
  });
});

fixtures.teardown(test);
