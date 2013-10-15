'use strict';

module.exports = function(grunt) {
  var sys = require('sys'),
      spawn = require('child_process').spawn,
      Q = require('q'),
      path = require('path'),
      fs = require('fs');


  var isWineInstalled = function() {
    var child = spawn('wine', ['--version']);
    var result = '';
    var defer = Q.defer();
    child.stdout.on('data', function (data) { result += data; });
    child.stdout.on('end', function () { defer.resolve(!!result.match(/wine-\d\.\d/)); });
    return defer.promise;
  };

  var invokeResourceHacker = function(wine, resHackerExe, params) {
    var defer = Q.defer();
    resHackerExe = path.resolve(resHackerExe);
    var cmd = wine ? 'wine' : resHackerExe.replace(/ /g, '\\ ');
    params = wine ? [resHackerExe.replace(/ /g, '\\ ')].concat(params) : params;
    if (fs.existsSync(resHackerExe)) {
      // Debugging: console.log('executing: <'+cmd + ' ' + params.join(' ')+'>');
      require('child_process').exec(cmd + ' ' + params.join(' '), function(err, stdout, stderr) {
        if (!err) {
          defer.resolve(true, stdout, stderr);
        } else {
          defer.reject(err, stdout, stderr);
        }
      });
    } else {
      defer.reject('Resource Hacker could not be found at "'+resHackerExe+'"!');
    }
    return defer.promise;
  };
  
  exports.replaceIcon = function(resHackerExe, exeFile, newIcon) {
    var defer = Q.defer();
    var isWin = !!process.platform.match(/^win/);
    var params = [
      '-addoverwrite', '"'+path.resolve(exeFile)+'",', '"'+path.resolve(exeFile)+'",',
      '"'+path.resolve(newIcon)+'",', 'ICONGROUP,', 'IDR_MAINFRAME,', '1033'
    ];
    if (!fs.existsSync(path.resolve(newIcon))) {
      defer.reject('Can not find windows icon at "'+path.resolve(newIcon)+'"!');
      return defer.promise; // Exit immediately
    }
    if (!isWin) {
      isWineInstalled().then(function(hasWine) {
        if (hasWine) {
          invokeResourceHacker('wine', resHackerExe, params).then(defer.resolve, defer.reject);
        } else {
          defer.reject('Wine is not installed!');
        }
      });
    } else {
      invokeResourceHacker(null, resHackerExe, params).then(defer.resolve, defer.reject);
    }
    return defer.promise;
  };

  return exports;
};