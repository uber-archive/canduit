var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var request = require('request');

module.exports = createCanduit;

function createCanduit (opts, cb) {
  if (!cb) {
    cb = opts;
    opts = { };
  }
  return new Canduit(opts, cb);
}

function Canduit (opts, cb) {
  this.client = opts.client || 'canduit';
  this.logger = opts.logger || {
    log: function silent () { }
  };

  this.api = opts.api;
  this.user = opts.user;
  this.cert = opts.cert;

  this.configFile = opts.configFile ||
    path.join(process.env.HOME, '.arcrc');

  var self = this;
  if (!this.api) {
    this.parseConfigFile(function (err) {
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
  fs.readFile(this.configFile, function (err, data) {
    if (err) return cb(err, null);

    try {
      var arcrc = JSON.parse(data);
      var host = Object.keys(arcrc.hosts)[0];
      self.user = arcrc.hosts[host].user;
      self.cert = arcrc.hosts[host].cert;
      self.token = arcrc.hosts[host].token;
      self.api = host;
      cb(null);
    } catch (e) {
      cb(e, null);
    }
  });
};

Canduit.prototype.requestWithToken = function requestWithToken (route, params, cb) {
  params['api.token'] = this.token;

  var req = request.get(this.api + route, {
    json: true,
    qs: params,
  }, cb);

  this.logger.log('GET %s', this.api + route);

  return req;
};

Canduit.prototype.requestWithCert = function requestWithCert (route, params, cb) {
  if (this.session) {
    params.__conduit__ = this.session;
  }

  var req = request.post(this.api + route, {
    json: true,
    form: {
      output: 'json',
      params: JSON.stringify(params)
    }
  }, cb);

  this.logger.log('POST to %s with %s',
    this.api + route, req.body.toString());

  return req;
};

Canduit.prototype.exec = function exec (route, params, cb) {
  var logger = this.logger;

  var request = this.token ? this.requestWithToken : this.requestWithCert;
  var req = request.call(this, route, params, processResponse);

  function processResponse(error, response, data) {
    if (error) return cb(error, null);

    if (response.statusCode >= 400) {
      return cb(Canduit.serverError(response), null);
    }

    if (data.result) {
      data = data.result;
    }

    if (data.error_info) {
      return cb(Canduit.conduitError(data), null);
    }

    logger.log('%s responded with %s',
      req.href, JSON.stringify(data));

    cb(null, data);
  }

  return req;
};

Canduit.prototype.authenticate = function authenticate (cb) {
  if (!this.cert || this.token) return cb(null, this);

  var authToken = Date.now() / 1000;
  var authSignature = crypto
    .createHash('sha1')
    .update(authToken + this.cert)
    .digest('hex');

  var self = this;
  this.exec('conduit.connect', {
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

  return this;
};
