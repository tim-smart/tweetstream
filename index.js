var http = require('http'),
    streams = require('stream'),
    util = require('util'),
    base64 = require('../base64'),
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

  if (query) {
    path += '?';
    path += query;
  }

  headers = {
    'Content-Type': 'application/json',
    'Host': 'stream.twitter.com'
  };

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

  this._client = http.createClient(80, 'stream.twitter.com', false);
  this._client.on('error', function(err) {
    self.emit('error', er);
  });

  this.req = this._client.request(method, path, headers);

  this.req.on('response', function(response) {
    response.setEncoding('utf8');
    response.pipe(self);
    self.readable = true;
  });

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
        stream.emit('error', e);
      }
    }

    idx = this._buffer.indexOf('\r\n');
  }
  return true;
};

TweetStream.prototype.end = function() {
  this._client.end();
  this.emit('end');
};

exports.TweetStream = TweetStream;
exports.createTweetStream = function(options) {
  return new TweetStream(options);
};
