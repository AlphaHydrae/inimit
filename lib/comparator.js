var _ = require('underscore'),
    crypto = require('crypto'),
    events = require('events'),
    fs = require('fs'),
    q = require('q'),
    path = require('path');

module.exports = function(sources) {

  this.sources = sources;
  this.files = {};
  this.n = 0;
  this.checking = 0;

  _.each(sources, function(source, i) {
    source.on('file', _.bind(this.registerFile, this, source, i));
  }, this);
};

_.extend(module.exports.prototype, {

  compare: function() {
    console.log('Comparing ' + JSON.stringify(_.pluck(this.sources, 'path')));
    return q.all(_.map(this.sources, function(source) {
      return source.scan();
    }));
  },

  registerFile: function(source, i, data) {

    this.n++;

    if (!this.files[data.rel]) {
      this.files[data.rel] = { sources: 0, checked: 0, data: [], hashes: [] };
    }

    var meta = this.files[data.rel],
        mask = 1 << i,
        known = meta.sources != 0;

    meta.data[i] = data;

    if (known) {

      if (meta.sources != 0) {

        var previousIndex = Math.log(meta.sources) / Math.LN2;

        this.checking++;
        hashFile(meta.data[previousIndex].abs).then(_.bind(this.storeFileHash, this, meta, previousIndex));
      }

      this.checking++;
      hashFile(data.abs).then(_.bind(this.storeFileHash, this, meta, previousIndex));
    }

    meta.sources = meta.sources | mask;
  },

  storeFileHash: function(meta, i, hash) {
    this.checking--;
    console.log(hash);
  }
});

function hashFile(f) {

  var deferred = q.defer();

  var size = 4096,
      buf = new Buffer(size),
      shasum = crypto.createHash('sha1'),
      emitter = new events.EventEmitter();

  emitter.on('data', function(data) {
    shasum.update(data);
  });

  fs.open(f, 'r', function(err, fd) {
    if (err) {
      return deferred.reject(err);
    }

    readFileRecursive(fd, buf, size, emitter).then(function() {
      deferred.resolve(shasum.digest('hex'));
    }, function(err) {
      deferred.reject(err);
    });
  });

  return deferred.promise;
}

function readFileRecursive(fd, buf, size, emitter, deferred, pos) {

  pos = pos || 0;
  deferred = deferred || q.defer();

  fs.read(fd, buf, 0, size, pos, function(err, bytesRead, buf) {
    if (err) {
      return deferred.reject(err);
    } else if (bytesRead <= 0) {
      return deferred.resolve();
    }

    emitter.emit('data', buf.slice(0, bytesRead));

    readFileRecursive(fd, buf, size, emitter, deferred, pos + bytesRead);
  });

  return deferred.promise;
}
