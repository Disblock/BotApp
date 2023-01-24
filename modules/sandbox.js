'use strict';
const {NodeVM} = require('vm2');//Sandbox
const data_storage_functions = require('./data_storage_functions.js');//Functions used to manage data saved in database

//Alls these var must be declared when executing generated code. These var are created at code generation ( Blockly ) Functions used by blocks can also be added here
const globalVars = `let embedMessage,createdTextChannel,createdVoiceChannel,sentMessage,createdThreadOnMessage,createdRank;let temporaryStorage = {};
  /*Functions*/ function colourRandom() {let num = Math.floor(Math.random() * Math.pow(2, 24));return '#' + ('00000' + num.toString(16)).substr(-6);}
  function mathRandomInt(min, max){return Math.floor(Math.random() * (max - min + 1) + min)};
  const sleep = ms => new Promise(r => {if(ms>5000){throw('Timeout too long !')}setTimeout(r, ms)});
  function strToInt(str){if(/^[0-9]{1,16}$/.test(str)){return(parseInt(str));}else{return(-1);}}`;

//Function that will add the object that allow us to manage stored data in database to sandbox
function addDataStorageObject(vm, database_pool, logger, serverId){
  const dataStorage = {
    saveValue: async function(storageName, key, value){//Pool, logger, and server_id shouldn't be editable in sandbox.
      data_storage_functions.saveValueInStorage(database_pool, logger, serverId, storageName, key, value);
    },
    getValue: async function(storageName, key){
      return await data_storage_functions.getValueInStorage(database_pool, logger, serverId, storageName, key);
    }
  };

  vm.freeze(dataStorage, 'dataStorage');
}

module.exports = {

  //Create the sandbox, add neccessary variables in it, and run code
  //https://github.com/patriksimek/vm2#nodevm
  runCodeInSandbox: function(args, database_pool, logger, sqlRows){

    let vm = new NodeVM({
        //console: 'inherit', //Show console
        console: 'off',
        sandbox: args,//Must at least contain CURRENT_GUILD, server that triggered an event
        eval: false,
        wasm: false,
        nesting: false,
        require: false,
        strict: true
    });

    addDataStorageObject(vm, database_pool, logger, args.CURRENT_GUILD.id);//Used to manage data in database

    for(let i=0; i<sqlRows.length; i++){//For each row ( event block ), we execute the code
      vm.run(globalVars+"async function a(){"+sqlRows[i].code+"};a();");
    }

  }

}
