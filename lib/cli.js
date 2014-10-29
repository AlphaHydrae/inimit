var _ = require('underscore'),
    cp = require('child_process'),
    crypto = require('crypto'),
    events = require('events'),
    fs = require('fs'),
    program = require('commander'),
    q = require('q'),
    path = require('path');

var hash = require('./hash');

module.exports = function(args) {
  args = args || process.argv;

  program
    .version(require('../package').version)
    .option('-j, --json', 'Output JSON')
    .parse(args);

  if (!program.args.length) {
    throw new Error('At least one file or directory must be specified');
  }

  hashFiles(program.args).then(function(data) {
    if (program.json) {
      console.log(JSON.stringify(data));
    } else {
      _.each(data, function(d) {
        console.log(d.result[0].value);
      });
    }
  });
};

function hashFiles(files) {
  return q.all(_.map(files, hashFile));
}

function hashFile(file) {
  return hash(file).then(function(digest) {
    return {
      file: file,
      result: [
        {
          type: 'sha1',
          value: digest
        }
      ]
    };
  });
}
