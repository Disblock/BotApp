'use-strict';
const ivm = require('isolated-vm');

module.exports = function(sandboxContext, args, database_pool, logger, serverId){
  //Alls these var must be declared when executing generated code. These var are created at code generation ( Blockly ) Functions used by blocks can also be added here
  initScript = `
  let embedMessage, createdTextChannel, createdVoiceChannel, sentMessage, createdThreadOnMessage, createdRank;
  let temporaryStorage = {};

  /*Functions*/
  function colourRandom() {
      let num = Math.floor(Math.random() * Math.pow(2, 24));
      return '#' + ('00000' + num.toString(16)).substr(-6);
  }

  function mathRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min)
  };
  const sleep = ms => new Promise(r => {
      if (ms > 5000) {
          throw ('Timeout too long !')
      }
      setTimeout(r, ms)
  });

  function strToInt(str) {
      if (/^[0-9]{1,16}$/.test(str)) {
          return (parseInt(str));
      } else {
          return (-1);
      }
  }
  `;

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

  return initScript;
}
