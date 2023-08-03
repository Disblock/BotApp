'use-strict';
const ivm = require('isolated-vm');

module.exports = function(sandboxContext, args, database_pool, logger, serverId){

  // This makes the global object available in the context as `global`. We use `derefInto()` here
  // because otherwise `global` would actually be a Reference{} object in the new isolate.
  sandboxContext.setSync('global', sandboxContext.derefInto());

  sandboxContext.setSync('functions', new ivm.Reference({}));//Will hold functions to interact with Discord servers
  let functions = sandboxContext.getSync('functions');

  // *-----------------*
  // MESSAGES
  // *---------------- *

  functions.setSync('messages', new ivm.Reference({}));
  let messagesFunctions = functions.getSync('messages');

  messagesFunctions.setSync('reply', new ivm.Reference(async(message, text)=>{
    args.eventMessage.reply(text);
  }));
}
