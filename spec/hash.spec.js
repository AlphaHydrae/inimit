var hash = require('../lib/hash'),
    path = require('path');

describe('hash', function() {

  it("should compute the correct sha1 hash", function() {
    checkFileHash('.ackrc', '7d907a8cf479fa2c0a46698771185a7b80428ba5');
    checkFileHash('LICENSE.txt', 'df04cb8401788e9e0abcbf4a48f9bb92934e6a13');
  });

  function checkFileHash(file, expectedHash) {

    var fulfilledSpy = jasmine.createSpy();
    runs(function() {
      hash(path.join(__dirname, '..', file)).then(fulfilledSpy);
    });

    waitsFor(function() {
      return fulfilledSpy.calls.length;
    }, 'the hash to have been computed', 100);

    runs(function() {
      expect(fulfilledSpy).toHaveBeenCalledWith(expectedHash);
    });
  }
});
