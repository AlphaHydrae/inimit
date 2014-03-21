var _ = require('underscore'),
    crypto = require('crypto'),
    events = require('events'),
    fs = require('fs'),
    program = require('commander'),
    q = require('q');

module.exports = function(args) {

  program
    .version(require('../package').version)
    .parse(args);

  if (program.args.length != 2) {
    throw new Error('Two files must be specified, got ' + program.args.length + ' arguments');
  }

  var f1 = checkFile(program.args.shift()),
      f2 = checkFile(program.args.shift());

  hashFile(f1).then(_.bind(console.log, console));
  hashFile(f2).then(_.bind(console.log, console));
};

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

function checkFile(f) {

  if (!fs.existsSync(f)) {
    throw new Error('No such file ' + f);
  }

  return f;
}
