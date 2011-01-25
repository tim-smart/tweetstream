var tweetstream = require('../'),
    fs = require('fs'),
    path = require('path'),
    sys = require('sys');

var credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'creds')));

var stream = tweetstream.createTweetStream({
  track: ['twitter'],
  username: credentials['username'],
  password: credentials['password'],
  key: credentials['key'],
  secret: credentials['secret']
});

stream.addListener('data', function(tweet) {
  console.log(tweet);
});
