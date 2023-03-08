'use-strict';

//Functions used to manage saved data in database

module.exports = {

  saveValueInStorage: async function(database_pool, logger, serverId, storageName, key, value){
    /* Save a new value in a server's storage */

    //Key and value must be defined
    if(!key || key=='' || !value || value=='')return;

    //We will check that key and valud aren't bigger than 32 or 256 char
    if(key.length > 32){
      key = key.slice(0, 32);
    }
    if(value.toString().length > 255){
      value = value.toString().slice(0, 255);
    }

    database_pool.query("SELECT f_insert_or_update_data($1, $2, $3, $4)",
      [serverId, storageName, key, value.toString()])
    .catch((err)=>{
      logger.error("Error while saving data in data storage for server "+serverId+" : "+err);
    });

  },

  getValueInStorage: async function(database_pool, logger, serverId, storageName, key){
    /* Get a value stored in a data storage from database */

    //We will check that key isn't bigger than 32 char
    if(key.length > 32){
      key = key.slice(0, 32);
    }

    try{
      const row = (await database_pool.query("SELECT d.data, s.storage_is_int FROM data_storage s INNER JOIN stored_data d ON s.storage_id=d.storage_id WHERE s.server_id = $1 AND s.storage_name = $2 AND d.data_key = $3;",
        [serverId, storageName, key])).rows[0];

      if(row){
        return row.data;
      }else if(storageName.startsWith('I')){
        return -1;
      }else if(storageName.startsWith('S')){
        return 'undefined';
      }else{
        throw('Error : Invalid storage name "'+storageName+'" for server '+serverId);
      }

    }catch(err){
      logger.error("Error while getting data from data storage for server "+serverId+" : "+err);

      if(storageName.startsWith('I')){
        return -1;
      }else if(storageName.startsWith('S')){
        return 'undefined';
      }else{
        return null;//May cause errors in workspaces, so using this can be considered a bug
      }

    }
  }

}
