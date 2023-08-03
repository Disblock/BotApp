'use-strict';
const ivm = require('isolated-vm');//sandbox
const data_storage_functions = require('./data_storage_functions.js');//Functions used to manage data saved in database
const initSandbox = require('./init_sandbox.js');//Used to add functions and everything required to sandbox

//Alls these var must be declared when executing generated code. These var are created at code generation ( Blockly ) Functions used by blocks can also be added here
const globalVars = `let embedMessage,createdTextChannel,createdVoiceChannel,sentMessage,createdThreadOnMessage,createdRank;let temporaryStorage = {};
  /*Functions*/ function colourRandom() {let num = Math.floor(Math.random() * Math.pow(2, 24));return '#' + ('00000' + num.toString(16)).substr(-6);}
  function mathRandomInt(min, max){return Math.floor(Math.random() * (max - min + 1) + min)};
  const sleep = ms => new Promise(r => {if(ms>5000){throw('Timeout too long !')}setTimeout(r, ms)});
  function strToInt(str){if(/^[0-9]{1,16}$/.test(str)){return(parseInt(str));}else{return(-1);}}`;

//Function that will add the object that allow us to manage stored data in database to sandbox
function addDataStorageObject(jail, database_pool, logger, serverId){
  const dataStorage = {
    saveValue: async function(storageName, key, value){//Pool, logger, and server_id shouldn't be editable in sandbox.
      data_storage_functions.saveValueInStorage(database_pool, logger, serverId, storageName, key, value);
    },
    getValue: async function(storageName, key){
      return await data_storage_functions.getValueInStorage(database_pool, logger, serverId, storageName, key);
    },
    delValue: async function(storageName, key){
      return await data_storage_functions.deleteValueInStorage(database_pool, logger, serverId, storageName, key);
    }
  };

  jail.setSync('DataStorage', new ivm.Reference(dataStorage));
}

module.exports = {
  //See https://github.com/laverdet/isolated-vm#examples

  //Create the sandbox, add neccessary variables in it, and run code
  //https://github.com/patriksimek/vm2#nodevm
  runCodeInSandbox: async function(args, database_pool, logger, sqlRows){

    if(sqlRows.length==0)return;

    const isolate = new ivm.Isolate({ memoryLimit: 32 });// Create a new sandbox/isolate limited to 32MB
    const context = await isolate.createContext();
    const jail = context.global;//Will hold variables and functions required in the isolate

    for(let key in args){
      jail.setSync(key, new ivm.Reference(args[key], {unsafeInherit:false}));//Adding old args. Here, only properties are kept. Methods aren't passed to isolate
    };

    initSandbox(jail, args, database_pool, logger, args.CURRENT_GUILD.id);

    for(let i=0; i<sqlRows.length; i++){//For each row ( event block ), we execute the code
      const code = await isolate.compileScript(globalVars+sqlRows[i].code);
      await code.run(context).catch(err => {
        logger.error("Error in sandbox : "+err);
      });
    }

  }

}
