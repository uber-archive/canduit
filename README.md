# canduit [![Build status](https://travis-ci.org/uber/canduit.png?branch=master)](https://travis-ci.org/uber/canduit)

Node.js Phabricator Conduit API client.

## Getting Started

```javascript
var createCanduit = require('canduit');

// Create and authenticate client
createCanduit(function (err, canduit) {

  // Execute a conduit API call
  canduit.exec('user.query', {
    usernames: ['aleksey']
  }, function (err, users) {

    console.log(users);
  });
});
```

## Documentation

#### `Canduit(config, callback)`

The Canduit constructor takes an optional `config` parameter, and a `callback(error, conduit)` function. The callback fires after the canduit client instance have successfully authenticated with the server.

The first argument of the callback function is an error (if present), and the second is the reference to the conduit client instance for convenience.

The **`config`** object can take the following configuration parameters:

 - `configFile` - file to read the Arcanist configuration parameters. By default, phab reads `~/.arcrc` for host and authentication configuration.

You can also programmatically override the Conduit host and credentials:

 - `user` - conduit username,
 - `api` - conduit api root,
 - `cert` - conduit certificate

#### `canduit.exec(route, params)`

Call a [conduit API endpoint](https://secure.phabricator.com/book/phabdev/article/conduit/).
 - `route` is the name of the endpoint, and
 - `params` object contains the parameters to pass.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via `npm lint` and test via `npm test`.

## License

Copyright (c) 2014 Uber

Licensed under the MIT license.
