'use-strict';

//Functions used to manage saved data in database

module.exports = {

  saveValueInStorage: async function(database_pool, logger, serverId, storageName, key, value){
    /* Save a new value in a server's storage */
    database_pool.query("SELECT f_insert_or_update_data($1, $2, $3, $4)",
      [serverId, storageName, key, value.toString()])
    .catch((err)=>{
      logger.error("Error while saving data in data storage for server "+serverId+" : "+err);
    });

  },

  getValueInStorage: async function(database_pool, logger, serverId, storageName, key){
    /* Get a value stored in a data storage from database */
    try{
      const row = (await database_pool.query("SELECT d.data, s.storage_is_int FROM data_storage s INNER JOIN stored_data d ON s.storage_id=d.storage_id WHERE s.server_id = $1 AND s.storage_name = $2 AND d.data_key = $3;",
        [serverId, storageName, key])).rows[0];
      return (row ? row.data : null);
    }catch(err){
      logger.error("Error while getting data from data storage for server "+serverId+" : "+err);
      return undefined;
    }
  }

}
