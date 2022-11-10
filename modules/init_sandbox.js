'use strict';
const {NodeVM} = require('vm2');//Sandbox

module.exports = {

  //Get the sandbox object for a vm and return the created vm
  //https://github.com/patriksimek/vm2#nodevm
  getSandbox: function(args){

    return new NodeVM({
        //console: 'inherit', //Show console
        console: 'off',
        sandbox: args,
        eval: false,
        wasm: false,
        nesting: false,
        require: false,
        strict: true
    });
  }

}
