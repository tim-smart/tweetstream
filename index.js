var http = require('http'),
    streams = require('stream'),
    util = require('util'),
    base64 = require('./lib/base64'),
    qs = require('querystring');

function TweetStream(options) {
  if (!(this instanceof TweetStream)) return new TweetStream(options);

  streams.Stream.call(this);

  var self = this;
  var path, query, headers, method;

  this.paused = false;
  this.readable = false;
  this.writable = true;
  this._buffer = '';

  if (options.firehose) {
    path = '/1/statuses/firehose.json';
    method = 'GET';
  } else if (options.links) {
    path = '/1/statuses/links.json';
    method = 'GET';
  } else if (options.retweet) {
    path = '/1/statuses/retweet.json';
    method = 'GET';
  } else if (options.follow || options.locations || options.track) {
    path = '/1/statuses/filter.json';
    method = 'POST';
  } else {
    path = '/1/statuses/sample.json';
    method = 'GET';
  }

  query = options.query || {};

  if (options.count) {
    query.count = options.count;
  }

  if (options.follow) {
    query.follow = Array.isArray(options.follow) ?
      options.follow.join(',') :
      options.follow;
  }

  if (options.track) {
    query.track = Array.isArray(options.track) ?
      options.track.join(',') :
      options.track;
  }

  if (options.locations) {
    query.locations = Array.isArray(options.locations) ?
      options.locations.join(',') :
      options.locations;
  }

  query = qs.stringify(query);

  headers = {
    'Host': 'stream.twitter.com'
  };

  if (query) {
    if ('POST' === method) {
      this._body = query;
      headers['Content-Length'] = Buffer.byteLength(this._body);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      path += '?';
      path += query;
    }
  }

  this._headers = headers;
  this._method  = method;
  this._path    = path;

  if (options.username && options.password) {
    headers['Authorization'] = 'Basic ' +
      base64.encode(options.username + ':' + options.password);

    this._doConnect();
  } else if (options.key && options.secret) {
    // setup and use oauth.
    this._doConnect();
  }
}

util.inherits(TweetStream, streams.Stream);

TweetStream.prototype._doConnect = function() {
  var self = this;

  this.req = http.request({
    host:    'stream.twitter.com',
    port:    80,
    method:  this._method,
    path:    this._path,
    headers: this._headers
  });

  this.req.on('error', function (error) {
    self.emit('error', error);
  });

  this.req.on('response', function(response) {
    response.setEncoding('utf8');
    response.pipe(self);
    self.readable = true;
  });

  if (this._body) {
    this.req.write(this._body);
  }

  this.req.end();
};

TweetStream.prototype.write = function(data) {
  this._buffer += data;

  var idx = this._buffer.indexOf('\r\n');
  var blob;

  while (idx !== -1) {
    blob = this._buffer.slice(0, idx);
    this._buffer = this._buffer.slice(idx + 2);

    if (blob.length > 0) {
      try {
        this.emit('data', JSON.parse(blob));
      } catch (e) {
        this.emit('error', e);
      }
    }

    idx = this._buffer.indexOf('\r\n');
  }

  return true;
};

TweetStream.prototype.end = function() {
  if (this.req.connection) {
    this.req.connection.destroy();
  } else {
    this.req.end();
  }

  this.emit('end');
};

exports.TweetStream = TweetStream;
exports.createTweetStream = function(options) {
  return new TweetStream(options);
};
