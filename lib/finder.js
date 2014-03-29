var _ = require('underscore'),
    fs = require('fs'),
    glob = require('glob'),
    q = require('q'),
    path = require('path');

module.exports = function() {
};

_.extend(module.exports.prototype, {

  find: function(source) {
    if (source.type == 'file') {
      return q([ source.path ]);
    } else if (source.type == 'directory') {
      var deferred = q.defer();
      var g = new glob.Glob(path.join(source.path, '**/*'), { stat: true }, function(err, matches) {
        deferred.resolve(_.reduce(matches, function(memo, file) {

          if (g.statCache[file].isFile()) {
            memo.push(path.relative(source.path, file));
          }

          return memo;
        }, []));
      });
      return deferred.promise;
    } else {
      throw new Error('Unsupported source type ' + source.type);
    }
  }
});
