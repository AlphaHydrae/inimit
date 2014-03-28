var _ = require('underscore'),
    fs = require('fs'),
    glob = require('glob'),
    q = require('q'),
    path = require('path');

module.exports = function() {
};

_.extend(module.exports.prototype, {

  find: function(source) {
    return q.nfcall(fs.stat, source).then(_.bind(this.listSource, this, source));
  },

  listSource: function(source, stats) {

    if (stats.isFile()) {
      var deferred = q.defer();
      deferred.resolve([ source ]);
      return deferred.promise;
    } else if (stats.isDirectory()) {
      return q.nfcall(glob, path.join(source, '**/*'));
    } else {
      throw new Error(source + ' is neither a file nor a directory');
    }
  }
});
