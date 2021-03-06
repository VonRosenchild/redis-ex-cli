module.exports = function(request, response, next) {
  var app = request.shell,
      async = require('async'),
      redis = app.settings.redis,
      regexp = null;
  
  if (redis == null) {
    response.red('You need connect to the redis server.');
    response.ln();
    response.prompt();
    return;
  }
  
  
  async.waterfall([
    //-----------------------------------
    // 1. Create a regular expression
    //-----------------------------------
    function(callback) {
      try {
        regexp = new RegExp(request.params.regexp);
      }catch (e) {
        regexp = null;
      }
      callback(null);
    },
    
    //-------------------------------------------
    // 2. Create pattern for redis-keys command.
    //-------------------------------------------
    function(callback) {
      var pattern = request.params.regexp;
      pattern = pattern.replace(/^\//, '');
      pattern = pattern.replace(/\/[gim]*$/, '');
      
      pattern = pattern.replace(/[^A-Za-z0-9\_\-\:].*$/, '*');
      if (pattern == null || pattern === "") {
        pattern = '';
      }
      callback(null, pattern);
    },
    
    //-----------------------------------
    // 3. pick up keys.
    //-----------------------------------
    function (pattern, callback) {
      redis.keys(pattern, callback);
    },
    
    //-----------------------------------
    // 4. filter the results.
    //-----------------------------------
    function (keys, callback) {
      if (regexp === null) {
        callback(null, keys);
        return;
      }
      async.filter(keys, function(key, cback) {
        cback(regexp.test(key));
      }, function(results) {
        callback(null, results);
      });
    }
    
  ], function(err, results) {
    if (!err) {
      results = results.sort();
    }
    if (!next) {
      response(err, results);
      return;
    }
    if (err) {
      response.red("[ERROR]");
      response.red(err);
      response.ln();
    } else {
      results.forEach(function(key) {
        response.println(key);
      });
    }
    response.prompt();
  });
};