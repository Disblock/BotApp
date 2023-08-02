'use-strict';
const ivm = require('isolated-vm');

module.exports = function(sandboxContext, database_pool, logger, serverId){

  // This makes the global object available in the context as `global`. We use `derefInto()` here
  // because otherwise `global` would actually be a Reference{} object in the new isolate.
  //sandboxContext.setSync('global', sandboxContext.derefInto());

  sandboxContext.setSync('a', 5);//Working
}
