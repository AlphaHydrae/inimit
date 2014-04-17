var _ = require('underscore'),
    events = require('events'),
    util = require('util');

module.exports = function(sourcePath) {
  this.path = sourcePath;
  events.EventEmitter.call(this);
};

util.inherits(module.exports, events.EventEmitter);

_.extend(module.exports.prototype, {
});
