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

  /*Let's copy References to make them usable in isolate*/
  functions = functions.copySync();
  functions['messages'] = functions.messages.copySync();
  `;

  let storedVariables = [];//Will hold variables and objects that we can't send in sandbox. Indexes are used to find something here, and are passed to sandbox.
  let sandboxVariables = {};//Object sent in sandbox, that will hold storedVariables indexes and properties of objects. Methods aren't accessible within sandbox, and are called using indexes and transit functions
  for(let key in args){
    sandboxVariables[key] = args[key];
    sandboxVariables[key].sandboxID = storedVariables.length;//sandboxID is used to refer to this object when using transit functions
    storedVariables.push(sandboxVariables[key]);
  };

  // This makes the global object available in the context as `global`. We use `derefInto()` here
  // because otherwise `global` would actually be a Reference{} object in the new isolate.
  sandboxContext.setSync('global', sandboxContext.derefInto());

  sandboxContext.setSync('variables', new ivm.ExternalCopy(sandboxVariables).copyInto());//Adding event args. Here, only properties are kept. Methods aren't passed to isolate

  sandboxContext.setSync('functions', new ivm.Reference({}));//Will hold functions to interact with Discord servers
  let functions = sandboxContext.getSync('functions');

  // *-----------------*
  // MESSAGES
  // *---------------- *

  functions.setSync('messages', new ivm.Reference({}));
  let messagesFunctions = functions.getSync('messages');

  messagesFunctions.setSync('reply', new ivm.Reference(async(message, text)=>{
    const sentMessage = await storedVariables[message].reply(text);

    sentMessage.sandboxID = storedVariables.length;//Position of the new variable in the list of saved variables, used to refer to this var within the sandbox
    storedVariables.push(sentMessage);//We can now add the sentMessage to the variables list
    return new ivm.Reference(sentMessage);
  }));

  messagesFunctions.setSync('delete', new ivm.Reference(async(message, text)=>{
    storedVariables[message].delete();
  }));

  messagesFunctions.setSync('sendInChannel', new ivm.Reference(async(channel, text)=>{
    const sentMessage = await storedVariables[channel].send(text);

    sentMessage.sandboxID = storedVariables.length;
    storedVariables.push(sentMessage);
    return new ivm.Reference(sentMessage);
  }));

  return initScript;
}
