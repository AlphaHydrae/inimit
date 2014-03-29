var _ = require('underscore'),
    cp = require('child_process'),
    crypto = require('crypto'),
    events = require('events'),
    fs = require('fs'),
    program = require('commander'),
    q = require('q'),
    path = require('path');

var Finder = require('./finder');

module.exports = function(args) {

  program
    .version(require('../package').version)
    .parse(args);

  if (program.args.length != 2) {
    throw new Error('Two files or directories must be specified, got ' + program.args.length + ' arguments');
  }

  var paths = [ program.args.shift(), program.args.shift() ];
  getSourcesInfo(paths).then(checkSources).then(scanSources).then(compareSources).then(hashCommonFiles).then(function(data) {
    console.log(data);
  }).fail(function(err) {
    console.log(err.toString());
  });

  return;
  var f1 = checkFile(program.args.shift()),
      f2 = checkFile(program.args.shift());

  hashFile(f1).then(_.bind(console.log, console));
  hashFile(f2).then(_.bind(console.log, console));
};

function hashCommonFiles(data) {
  return q.all([
    hashSourceFiles(data.sources[0], data.both, data.leftHashes),
    hashSourceFiles(data.sources[1], data.both, data.rightHashes)
  ]).then(function() {
    return data;
  });
}

function hashSourceFiles(source, files, cache) {

  if (!files.length) {
    return q();
  }

  var n = files.length,
      deferred = q.defer(),
      child = cp.fork(path.join(__dirname, 'child.js'));

  child.on('message', function(data) {

    cache[data.path] = data.hash;

    if (!--n) {
      child.kill();
      deferred.resolve();
    }
  });

  child.send({ path: source.path, files: files });

  return deferred.promise;
}

function compareSources(sources) {
  console.log(sources);

  var data = {
    sources: sources,
    both: _.intersection(sources[0].files, sources[1].files),
    leftHashes: {},
    rightHashes: {}
  };

  data.left = _.difference(sources[0].files, data.both);
  data.right = _.difference(sources[1].files, data.both);

  return q(data);
}

function scanSources(sources) {
  return q.all(_.map(sources, function(source) {
    return scanSource(source);
  }));
}

function scanSource(source) {
  return new Finder().find(source).then(function(files) {
    source.files = files;
    return source;
  });
}

function checkSources(sources) {

  _.each(sources, function(source) {
    if (!source.type) {
      throw new Error(source.path + ' is neither a file nor a directory');
    }
  });

  if (sources[0].type != sources[1].type) {
    throw new Error('Cannot compare a file and a directory');
  }

  return q(sources);
}

function getSourcesInfo(paths) {
  return q.all(_.map(paths, function(path) {
    return getSourceInfo(path);
  }));
}

function getSourceInfo(path) {
  return q.nfcall(fs.stat, path).then(_.bind(setSourceType, undefined, { path: path })).fail(function(err) {
    if (err && err.code == 'ENOENT') {
      throw new Error(err.path + ' does not exist');
    } else {
      return q.reject(err);
    }
  });
}

function setSourceType(source, stats) {

  if (stats.isFile()) {
    source.type = 'file';
  } else if (stats.isDirectory()) {
    source.type = 'directory';
  }

  return q(source);
}

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
