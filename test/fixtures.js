var fs = require('fs');
var tmp = require('tmp');
var getport = require('getport');
var parallel = require('run-parallel');
var FixedServer = require('fixed-server').FixedServer;

module.exports = Fixtures;

function Fixtures(test) {
  test('setup', this.setup.bind(this));
}

Fixtures.prototype.teardown = function (test) {
  var self = this;

  test('teardown', function (t) {
    self.fixedServer.destroy(t.end);
  });
};

Fixtures.prototype.addFixture = function addFixture(route, response, useToken) {
  var self = this;

  self.fixtureNames.push(route);

  self.fixedServer.installFixture({
    method: !useToken ? 'post' : 'get',
    route: route,
    response: function (req, res) {
      res.json(response);
    }
  });
};

Fixtures.prototype.setup = function setup(t) {
  var self = this;

  parallel({
    tmpName: tmp.tmpName,
    tokenTmpName: tmp.tmpName,
    port: getport
  }, function (err, results) {
    if (err) throw err;

    self.configFile = results.tmpName;
    self.tokenConfigFile = results.tokenTmpName
    self.port = results.port;

    self.fixedServer = new FixedServer({
      port: self.port
    });

    self.host = 'http:\/\/localhost:' + self.port + '\/api\/';
    self.arcConfig = {hosts: {}};
    self.arcConfig.hosts[self.host] = {
      'user': 'test',
      'cert': 'test-certificate'
    };

    self.tokenArcConfig = {hosts: {}};
    self.tokenArcConfig.hosts[self.host] = {
      token: 'test-token'
    };

    fs.writeFileSync(self.configFile, JSON.stringify(self.arcConfig));
    fs.writeFileSync(self.tokenConfigFile, JSON.stringify(self.tokenArcConfig));

    self.fixtureNames = [];

    self.addFixture('/api/conduit.connect', {
      'result': {
        'connectionID': 12345,
        'sessionKey': 'secret-key',
        'userPHID': 'PHID-USER-12345'
      },
      'error_code': null,
      'error_info': null
    });

    self.fixedServer.listen();
    t.end();
  });
};
