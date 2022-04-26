'use strict';

/* Functions executed on guilds events are defined here */

const {NodeVM} = require('vm2');//Sandbox
const get_sandbox = require('./init_sandbox.js').getSandbox;//Return a sandbox when called with object containing shared vars as arg
const Discord = require('discord.js');

//Alls these var must be declared when executing generated code. These var are created at code generation ( Blockly )
const globalVars = "let embedMessage,createdTextChannel,createdVoiceChannel,sentMessage,createdThreadOnMessage,createdRank;";
//SQL request to get code to execute, $n are defined when executing this request
const sqlRequest = "SELECT code FROM server_code WHERE server_id = $1 AND action_type = $2 AND active = TRUE;";


module.exports = {

  messageCreate: async(eventMessage, logger, database_pool)=>{
    const eventType = "event_message_sent";

    if(eventMessage.author.bot || eventMessage.channel.type == "DM"){return;}//Do nothing if a bot sent the message or sent in DM
    const CURRENT_GUILD = eventMessage.guild;//We save here the guild we're working on

    logger.debug("A message was sent in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventMessage:eventMessage});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageDelete: async(eventMessage, logger, database_pool)=>{
    const eventType = "event_message_deleted";

    if(eventMessage.channel.type == "DM"){return;}//Do nothing if done in PM channel
    const CURRENT_GUILD = eventMessage.guild;//We save here the guild we're working on

    logger.debug("A message was deleted in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventMessage:eventMessage});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageUpdate: async(eventOldMessage, eventNewMessage, logger, database_pool) =>{
    const eventType = "event_message_updated";

    if(eventNewMessage.channel.type == "DM"){return;}//Do nothing if done in PM channel
    const CURRENT_GUILD = eventNewMessage.guild;//We save here the guild we're working on

    logger.debug("A message was edited in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldMessage:eventOldMessage, eventNewMessage:eventNewMessage});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  guildMemberAdd: async(eventUser, logger, database_pool)=>{
    const eventType = "event_user_join";

    if(eventUser.user.bot){return;}//Do nothing if member is bot
    const CURRENT_GUILD = eventUser.guild;//We save here the guild we're working on

    logger.debug("A member joigned guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  guildMemberRemove: async(eventUser, logger, database_pool)=>{
    const eventType = "event_user_left";

    if(eventUser.user.bot){return;}//Do nothing if member is bot
    const CURRENT_GUILD = eventUser.guild;//We save here the guild we're working on

    logger.debug("A member left guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  guildMemberUpdate: async(eventOldUser, eventNewUser, logger, database_pool)=>{
    const eventType = "event_user_updated";

    if(eventOldUser.user.bot){return;}//Do nothing if member is bot
    const CURRENT_GUILD = eventOldUser.guild;//We save here the guild we're working on

    logger.debug("A member was updated in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldUser:eventOldUser, eventNewUser:eventNewUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  channelCreate: async(channel, logger, database_pool)=>{
    //eventVoiceChannel, eventTextChannel, eventThreadChannel
    const CURRENT_GUILD = channel.guild;

    //We check here who created the channel. Bot created channels should not trigger this
    const log = await CURRENT_GUILD.fetchAuditLogs({limit:1, type: "CHANNEL_CREATE"});//Store the log entry about the channel creation
    if(!log.entries.first()){
      return;//Logs not found, cancelling...
    }
    if(log.entries.first().executor.bot){
      return;//The channel seems to be created by a bot, cancelling to avoid infinite loop...
    }

    let eventType = undefined;
    let eventVoiceChannel, eventTextChannel, eventThreadChannel = undefined;//Store event channel

    if(channel instanceof Discord.TextChannel){//Type of channel is checked and triggered event block determined
      eventType = "event_text_channel_created";
      eventTextChannel = channel;
    }else if(channel instanceof Discord.VoiceChannel){
      eventType = "event_voice_channel_created";
      eventVoiceChannel = channel;
    }else if(channel instanceof Discord.ThreadChannel){
      //TODO : add blocks for this
      return;
    }else{
      return;//Channel created is a not supported type
    }

    logger.debug("A channel was created in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventVoiceChannel:eventVoiceChannel, eventTextChannel:eventTextChannel, eventThreadChannel:eventThreadChannel});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  channelDelete: async(channel, logger, database_pool)=>{
    const CURRENT_GUILD = channel.guild;
    let eventType = undefined;
    let eventVoiceChannel, eventTextChannel, eventThreadChannel = undefined;//Store event channel

    if(channel instanceof Discord.TextChannel){//Type of channel is checked and triggered event block determined
      eventType = "event_text_channel_deleted";
      eventTextChannel = channel;
    }else if(channel instanceof Discord.VoiceChannel){
      eventType = "event_voice_channel_deleted";
      eventVoiceChannel = channel;
    }else if(channel instanceof Discord.ThreadChannel){
      //TODO : add blocks for this
      return;
    }else{
      return;//Channel created is a not supported type
    }

    logger.debug("A channel was deleted in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventVoiceChannel:eventVoiceChannel, eventTextChannel:eventTextChannel, eventThreadChannel:eventThreadChannel});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  channelUpdate: async(oldChannel, newChannel, logger, database_pool)=>{
    //eventOldVoiceChannel, eventNewVoiceChannel
    //eventOldTextChannel, eventNewTextChannel
    //eventOldThreadChannel, eventNewThreadChannel

    const CURRENT_GUILD = newChannel.guild;

    //We check here who updated the channel. Bot updated channels should not trigger this
    const log = await CURRENT_GUILD.fetchAuditLogs({limit:1, type: "CHANNEL_UPDATE"});//Store the log entry about the channel creation
    if(!log.entries.first()){
      return;//Logs not found, cancelling...
    }
    if(log.entries.first().executor.bot){
      return;//The channel seems to be updated by a bot, cancelling to avoid infinite loop...
    }

    let eventType = undefined;
    let eventOldVoiceChannel, eventNewVoiceChannel, eventOldTextChannel, eventNewTextChannel, eventOldThreadChannel, eventNewThreadChannel = undefined;//Store event channel

    if(newChannel instanceof Discord.TextChannel){//Type of channel is checked and triggered event block determined
      eventType = "event_text_channel_edited";
      eventOldTextChannel = oldChannel;
      eventNewTextChannel = newChannel;
    }else if(newChannel instanceof Discord.VoiceChannel){
      eventType = "event_voice_channel_edited";
      eventOldVoiceChannel = oldChannel;
      eventNewVoiceChannel = newChannel;
    }else if(newChannel instanceof Discord.CategoryChannel){
      //TODO : add blocks for this
      return;
    }else{
      return;//Channel created is a not supported type
    }

    logger.debug("A channel was updated in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord,
        eventOldVoiceChannel:eventOldVoiceChannel, eventNewVoiceChannel:eventNewVoiceChannel, eventOldTextChannel:eventOldTextChannel,
        eventNewTextChannel:eventNewTextChannel, eventOldThreadChannel:eventOldThreadChannel, eventNewThreadChannel:eventNewThreadChannel});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  roleCreate: async(eventRole, logger, database_pool)=>{
    const CURRENT_GUILD = eventRole.guild;

    //We check here who created the role. Bot created roles should not trigger this
    const log = await CURRENT_GUILD.fetchAuditLogs({limit:1, type: "ROLE_CREATE"});//Store the log entry about the channel creation
    if(!log.entries.first()){
      return;//Logs not found, cancelling...
    }
    if(log.entries.first().executor.bot){
      return;//A bot made it, cancelling...
    }

    let eventType = "event_role_created";

    logger.debug("A role was created in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventRole:eventRole});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  roleDelete: async(eventRole, logger, database_pool)=>{
    const CURRENT_GUILD = eventRole.guild;

    let eventType = "event_role_deleted";

    logger.debug("A role was deleted in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventRole:eventRole});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  roleUpdate: async(eventOldRole, eventNewRole, logger, database_pool)=>{
    const CURRENT_GUILD = eventNewRole.guild;

    //We check here who edited the role. Bot edited roles should not trigger this
    const log = await CURRENT_GUILD.fetchAuditLogs({limit:1, type: "ROLE_UPDATE"});//Store the log entry about the channel creation
    if(!log.entries.first()){
      return;//Logs not found, cancelling...
    }
    if(log.entries.first().executor.bot){
      return;//A bot made it, cancelling...
    }

    let eventType = "event_role_edited";

    logger.debug("A role was edited in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldRole:eventOldRole, eventNewRole:eventNewRole});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  guildBanAdd: async(eventBan, logger, database_pool)=>{
    const CURRENT_GUILD = eventBan.guild;

    const eventUser = await eventBan.guild.members.fetch(eventBan.user);

    let eventType = "event_user_banned";

    logger.debug("A member was banned in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  guildBanRemove: async(eventBan, logger, database_pool)=>{
    const eventUser = eventBan.user;//TODO : Check that, that's not an GuildMember
    const CURRENT_GUILD = eventBan.guild;

    let eventType = "event_user_unbanned";

    logger.debug("A member was unbanned in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageReactionAdd: async(eventMessageReaction, eventUser2, logger, database_pool)=>{
    const eventReaction = eventMessageReaction.emoji;
    const eventMessage = eventMessageReaction.message;
    const CURRENT_GUILD = eventMessage.guild;
    const eventUser = await CURRENT_GUILD.members.fetch(eventUser2);

    let eventType = "event_reaction_added";

    logger.debug("A reaction was added in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventReaction:eventReaction, eventMessage:eventMessage, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageReactionRemove: async(eventMessageReaction, eventUser2, logger, database_pool)=>{
    const eventReaction = eventMessageReaction.emoji;
    const eventMessage = eventMessageReaction.message;
    const CURRENT_GUILD = eventMessage.guild;
    const eventUser = await CURRENT_GUILD.members.fetch(eventUser2);

    let eventType = "event_reaction_removed";

    logger.debug("A reaction was removed in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventReaction:eventReaction, eventMessage:eventMessage, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  voiceStateUpdate: async(oldState, newState, logger, database_pool)=>{
    const CURRENT_GUILD = newState.guild;
    const eventOldVoiceChannel = oldState.channel;
    const eventNewVoiceChannel = newState.channel;
    const eventUser = newState.member;

    let eventType = "event_user_voice_update";

    logger.debug("A voice state was updated in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldVoiceChannel:eventOldVoiceChannel, eventNewVoiceChannel:eventNewVoiceChannel, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  typingStart: async(typingState, logger, database_pool)=>{
    if(!typingState.inGuild()){return;}//If not in guild, stop here

    const CURRENT_GUILD = typingState.guild;
    const eventUser = typingState.member;
    const eventTextChannel = typingState.channel;

    const eventType = "event_user_start_writting";

    logger.debug("A user started typing in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      const vm = get_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser, eventTextChannel:eventTextChannel});//A sandbox is created in module init_sandbox.js
      for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
        vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
      }

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  }
}