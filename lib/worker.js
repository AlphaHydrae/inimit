var _ = require('underscore'),
    events = require('events'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
    q = require('q'),
    util = require('util');

var hash = require('./hash');

function Worker() {
  events.EventEmitter.call(this);
}

util.inherits(Worker, events.EventEmitter);

_.extend(Worker.prototype, {

  scan: function(f) {

    var stats = fs.statSync(f);

    this.emit('scan:start');

    if (stats.isFile()) {
      this.emit('scan:file', { path: f, stats: stats });
      this.emit('scan:end');
      return q();
    }

    var deferred = q.defer(),
        g = new glob.Glob(path.join(f, '**/*'), { stat: true });

    g.on('error', _.bind(function(err) {
      this.emit('scan:error', err);
      deferred.reject(err);
    }, this));

    g.on('match', _.bind(function(match) {
      
      var stats = g.statCache[match];
      if (stats.isFile()) {
        this.emit('scan:file', { path: match, stats: stats });
      }
    }, this));

    g.on('end', _.bind(function() {
      this.emit('scan:end');
      deferred.resolve();
    }, this));

    return deferred.promise;
  }
});

var worker = new Worker();

worker.on('scan:start', function() {
  process.send({ type: 'event', name: 'scan:start' });
});

worker.on('scan:file', function(data) {
  process.send({ type: 'event', name: 'scan:file', data: data });
});

worker.on('scan:end', function() {
  process.send({ type: 'event', name: 'scan:end' });
});

process.on('message', function(data) {
  if (data.message == 'scan') {
    worker.scan.apply(worker, data.args || []);
  }
});
