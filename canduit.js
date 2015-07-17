var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var request = require('request');
var NullLogtron = require('null-logtron');

module.exports = createCanduit;

function createCanduit (opts, cb) {
  if (!cb) {
    cb = opts;
    opts = { };
  }
  return new Canduit(opts, cb);
}

function Canduit (opts, cb) {
  var self = this;
  self.client = opts.client || 'canduit';
  self.logger = opts.logger || NullLogtron();

  self.api = opts.api;
  self.user = opts.user;
  self.cert = opts.cert;

  self.configFile = opts.configFile ||
    path.join(process.env.HOME, '.arcrc');

  if (!self.api) {
    self.parseConfigFile(function (err) {
      if (err) return cb(err, null);
      self.authenticate(cb);
    });
  } else {
    self.authenticate(cb);
  }
}

Canduit.conduitError = function conduitError (data) {
  var err = new Error(data.error_info);
  err.code = data.error_code;
  return err;
};

Canduit.serverError = function serverError (response) {
  var err = new Error(response.body &&
    response.body.toString());
  err.code = response.statusCode;
  return err;
};

Canduit.prototype.parseConfigFile = function parseConfigFile (cb) {
  var self = this;
  fs.readFile(self.configFile, function (err, data) {
    if (err) return cb(err, null);

    try {
      var arcrc = JSON.parse(data);
      var host = Object.keys(arcrc.hosts)[0];
      self.user = arcrc.hosts[host].user;
      self.cert = arcrc.hosts[host].cert;
      self.api = host;
      cb(null);
    } catch (e) {
      cb(e, null);
    }
  });
};

Canduit.prototype.exec = function exec (route, params, cb) {
  var self = this;

  if (self.session) {
    params.__conduit__ = self.session;
  }

  var req = request.post(self.api + route, {
    json: true,
    form: {
      output: 'json',
      params: JSON.stringify(params)
    }
  }, function (err, response, data) {
    if (err) return cb(err, null);
    if (response.statusCode >= 400) {
      return cb(Canduit.serverError(response), null);
    }
    if (data.error_info) {
      return cb(Canduit.conduitError(data), null);
    }

    self.logger.info('response from phabricator', {
      href: req.href,
      data: data
    });

    cb(null, data.result);
  });

  self.logger.info('post to phabricator', {
    url: self.api + route,
    json: true
  });
};

Canduit.prototype.authenticate = function authenticate (cb) {
  var self = this;
  if (!self.cert) return cb(null, self);

  var authToken = Date.now() / 1000;
  var authSignature = crypto
    .createHash('sha1')
    .update(authToken + self.cert)
    .digest('hex');

  self.exec('conduit.connect', {
    user: self.user,
    host: self.host,
    client: self.client,
    authToken: authToken,
    authSignature: authSignature
  }, function (err, result) {
    if (err) return cb(err, null);
    self.session = result;
    return cb(null, self);
  });

  return self;
};
