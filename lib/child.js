var _ = require('underscore'),
    crypto = require('crypto'),
    events = require('events'),
    fs = require('fs'),
    path = require('path'),
    q = require('q');

process.on('message', function(data) {
  _.each(data.files, function(file) {
    hashFile(path.join(data.path, file)).then(function(digest) {
      process.send({ path: file, hash: digest });
    });
  });
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
