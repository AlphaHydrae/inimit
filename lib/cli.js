var _ = require('underscore'),
    cp = require('child_process'),
    crypto = require('crypto'),
    events = require('events'),
    fs = require('fs'),
    program = require('commander'),
    q = require('q'),
    path = require('path');

var Comparator = require('./comparator'),
    Finder = require('./finder'),
    Source = require('./source');

module.exports = function(args) {
  args = args || process.argv;

  program
    .version(require('../package').version)
    .parse(args);

  if (!program.args.length) {
    throw new Error('At least one file or directory must be specified');
  }

  var sources = _.map(program.args, function(sourcePath) {
    return new Source(sourcePath)
  });

  console.log();
  console.log('Sources:');
  _.each(sources, function(source) {
    console.log('- ' + source.path);
  });

  var workers = _.map(sources, function(source) {
    return cp.fork(path.join(__dirname, 'worker.js'));
  });

  console.log();

  var done = 0;
  _.each(workers, function(worker, i) {
    worker.on('message', function(m) {
      if (m.type === 'event' && m.name === 'scan:start') {
        console.log('Starting to scan ' + sources[i].path);
      } else if (m.type === 'event' && m.name === 'scan:file') {
        console.log('Found ' + m.data.path + ' in ' + sources[i].path);
      } else if (m.type === 'event' && m.name === 'scan:end' && ++done === sources.length) {
        console.log();
        process.exit(0);
      }
    });
  });

  _.each(sources, function(source, i) {
    workers[i].send({ message: 'scan', args: [ source.path ] });
  });
};
