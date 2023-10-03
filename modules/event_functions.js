'use strict';

/* Functions executed on guilds events are defined here */

const {NodeVM} = require('vm2');//Sandbox
const run_code_in_sandbox = require('./sandbox.js').runCodeInSandbox;//Run code in a sandbox
const get_help_embed = require('./help_embed.js');//Return an embed that explain how to use the bot
const data_storage_functions = require('./data_storage_functions.js');//Functions used to manage data saved in database
const Discord = require('discord.js');

//SQL request to get code to execute, $n are defined when executing this request
const sqlRequest = "SELECT code FROM server_code WHERE server_id = $1 AND action_type = $2 AND active = TRUE;";

//Function used to check if a bot or an user triggered an event
async function didBotDidIt(guild, eventType){
  //We check here who edited the role. Bot edited roles should not trigger this
  let log;

  try{
    log = await guild.fetchAuditLogs({limit:1, type: eventType});//Store the log entry about the channel creation
  }catch(err){
    //The bot don't have the permission to check the logs ?...
    return undefined;//Can't access logs...
  }

  if(!log.entries.first()){
    return undefined;//Logs not found, cancelling...
  }
  if(log.entries.first().executor.bot){
    return true;//A bot made it, cancelling...
  }
  return false;//An user did it
}

module.exports = {

  CommandReceived: async(interaction, logger, database_pool)=>{
    const CURRENT_GUILD = interaction.guild;//We save here the guild we're working on

    logger.debug("Custom slash command "+interaction.commandName+" ran in server "+interaction.guild.id);

    database_pool//Query to database to get code to execute
    .query("SELECT code, ephemeral, EXISTS(SELECT form_id FROM forms WHERE forms.command_id=commands.command_id) AS formcommand FROM commands WHERE server_id = $1 AND name = $2 AND active = TRUE LIMIT 1;", [CURRENT_GUILD.id, interaction.commandName])
    .then(async (res)=>{

      if(res.rows.length!==1){
        interaction.reply({
          content: ":stop_sign: Sorry, but there was a problem while running your slash command...\
            \nTry to reload the editor, and use `/reloadcommands`\
            \nIf this problem persist, please, report this on the support server",
          ephemeral: true
        });
        return;
      }

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", we found a command to run !");
      //We will delay the answer and start the sandbox :
      if(! res.rows[0].formcommand) await interaction.deferReply({ ephemeral: res.rows[0].ephemeral }); //Not a form command. It conflict with forms, so we don't call that if the command contains one.

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, interaction:interaction},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  formAnswered: async(interaction, logger, database_pool)=>{

    logger.debug("Form "+interaction.customId+" received from server "+interaction.guild.id);

    database_pool//Query to database to get code to execute
    .query("SELECT code FROM forms WHERE form_id = $1 LIMIT 1;", [interaction.customId])
    .then(async (res)=>{

      //Only one row due to LIMIT 1, so we can add it easily :
      res.rows[0].code = res.rows[0].code+"await interaction.reply({ content: 'Your submission was received successfully!', ephemeral:true });";//This line is required, as it tells Discord that we finished to handle the form correctly

      run_code_in_sandbox({CURRENT_GUILD:interaction.guild, Discord:Discord, interaction:interaction},
        database_pool, logger, res.rows);
    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageCreate: async(eventMessage, logger, database_pool)=>{
    const eventType = "event_message_sent";

    if(eventMessage.author.bot || eventMessage.channel.type === Discord.ChannelType.DM){return;}//Do nothing if a bot sent the message or sent in DM

    if(eventMessage.mentions.has(eventMessage.client.user, {ignoreRoles:true, ignoreRepliedUser:true, ignoreEveryone:true})){
      //The help command. We just send an help message and return.
      if(eventMessage.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator, true)){
        //User is admin
        eventMessage.reply({embeds: [get_help_embed()]}).catch(()=>{
          //The bot can't send the message here, so we will DM the user
          eventMessage.author.send({embeds: [get_help_embed()]});
          eventMessage.react('📨');
        });
      }else{
        //User isn't admin
        eventMessage.author.send({embeds: [get_help_embed()]});
        eventMessage.react('📨');
      }
      return;
    }

    const CURRENT_GUILD = eventMessage.guild;//We save here the guild we're working on

    logger.debug("A message was sent in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventMessage:eventMessage}, database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageDelete: async(eventMessage, logger, database_pool)=>{
    const eventType = "event_message_deleted";

    if(eventMessage.partial){
      //Partial, we can't get data about this message since it is deleted
      return;
    }

    if(eventMessage.channel.type === Discord.ChannelType.DM){return;}//Do nothing if done in PM channel
    const CURRENT_GUILD = eventMessage.guild;//We save here the guild we're working on

    logger.debug("A message was deleted in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventMessage:eventMessage}, database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageUpdate: async(eventOldMessage, eventNewMessage, logger, database_pool) =>{
    const eventType = "event_message_updated";

    if(eventOldMessage.partial){
      //Partial, we can't get old message, so we can stop here
      return;
    }

    if(eventNewMessage.channel.type == Discord.ChannelType.DM || eventNewMessage.author.bot || eventOldMessage.content === eventNewMessage.content ){return;}//Do nothing if done in PM channel or author is bot or content wasn't edited
    const CURRENT_GUILD = eventNewMessage.guild;//We save here the guild we're working on

    logger.debug("A message was edited in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldMessage:eventOldMessage, eventNewMessage:eventNewMessage},
        database_pool, logger, res.rows);

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

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser},
        database_pool, logger, res.rows);

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

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  guildMemberUpdate: async(eventOldUser, eventNewUser, logger, database_pool)=>{
    const eventType = "event_user_updated";

    if(eventOldUser.user.bot){return;}//Do nothing if member is bot
    const CURRENT_GUILD = eventOldUser.guild;//We save here the guild we're working on

    if(await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.MemberUpdate)){return;}//A bot triggered this event

    logger.debug("A member was updated in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldUser:eventOldUser, eventNewUser:eventNewUser},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  channelCreate: async(channel, logger, database_pool)=>{
    //eventVoiceChannel, eventTextChannel, eventThreadChannel
    const CURRENT_GUILD = channel.guild;

    if(await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.ChannelCreate)){return;}//A bot triggered this event

    let eventType = undefined;
    let eventVoiceChannel, eventTextChannel, eventThreadChannel = undefined;//Store event channel

    if(channel.type === Discord.ChannelType.GuildText){//Type of channel is checked and triggered event block determined
      eventType = "event_text_channel_created";
      eventTextChannel = channel;
    }else if(channel.type === Discord.ChannelType.GuildVoice){
      eventType = "event_voice_channel_created";
      eventVoiceChannel = channel;
    }else if(channel.type === Discord.ChannelType.GuildPublicThread || channel.type === Discord.ChannelType.GuildPrivateThread){
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

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventVoiceChannel:eventVoiceChannel,
        eventTextChannel:eventTextChannel, eventThreadChannel:eventThreadChannel},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  channelDelete: async(channel, logger, database_pool)=>{
    const CURRENT_GUILD = channel.guild;
    let eventType = undefined;
    let eventVoiceChannel, eventTextChannel, eventThreadChannel = undefined;//Store event channel

    if(await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.ChannelDelete)){return;}//A bot triggered this event

    if(channel.type === Discord.ChannelType.GuildText){//Type of channel is checked and triggered event block determined
      eventType = "event_text_channel_deleted";
      eventTextChannel = channel;
    }else if(channel.type === Discord.ChannelType.GuildVoice){
      eventType = "event_voice_channel_deleted";
      eventVoiceChannel = channel;
    }else if(channel.type === Discord.ChannelType.GuildPublicThread || channel.type === Discord.ChannelType.GuildPrivateThread){
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

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventVoiceChannel:eventVoiceChannel,
        eventTextChannel:eventTextChannel, eventThreadChannel:eventThreadChannel},
        database_pool, logger, res.rows);

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
    if(await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.ChannelUpdate) ||
        await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.ChannelOverwriteUpdate) ||
        await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.ChannelOverwriteCreate) ||
        await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.ChannelOverwriteDelete)
      ){return;}

    let eventType = undefined;
    let eventOldVoiceChannel, eventNewVoiceChannel, eventOldTextChannel, eventNewTextChannel, eventOldThreadChannel, eventNewThreadChannel = undefined;//Store event channel

    if(newChannel.type === Discord.ChannelType.GuildText){//Type of channel is checked and triggered event block determined
      eventType = "event_text_channel_edited";
      eventOldTextChannel = oldChannel;
      eventNewTextChannel = newChannel;
    }else if(newChannel.type === Discord.ChannelType.GuildVoice){
      eventType = "event_voice_channel_edited";
      eventOldVoiceChannel = oldChannel;
      eventNewVoiceChannel = newChannel;
    }else if(newChannel.type === Discord.ChannelType.GuildPublicThread || newChannel.type === Discord.ChannelType.GuildPrivateThread){
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

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord,
        eventOldVoiceChannel:eventOldVoiceChannel, eventNewVoiceChannel:eventNewVoiceChannel, eventOldTextChannel:eventOldTextChannel,
        eventNewTextChannel:eventNewTextChannel, eventOldThreadChannel:eventOldThreadChannel, eventNewThreadChannel:eventNewThreadChannel},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  roleCreate: async(eventRole, logger, database_pool)=>{
    const CURRENT_GUILD = eventRole.guild;

    //We check here who created the role. Bot created roles should not trigger this
    if(await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.RoleCreate)){return;}

    let eventType = "event_role_created";

    logger.debug("A role was created in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventRole:eventRole},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  roleDelete: async(eventRole, logger, database_pool)=>{
    const CURRENT_GUILD = eventRole.guild;

    //Only real users should trigger events
    if(await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.RoleDelete)){return;}

    let eventType = "event_role_deleted";

    logger.debug("A role was deleted in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventRole:eventRole},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  roleUpdate: async(eventOldRole, eventNewRole, logger, database_pool)=>{
    const CURRENT_GUILD = eventNewRole.guild;

    //Only real users should trigger events
    if(await didBotDidIt(CURRENT_GUILD, Discord.AuditLogEvent.RoleUpdate)){return;}

    let eventType = "event_role_edited";

    logger.debug("A role was edited in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldRole:eventOldRole, eventNewRole:eventNewRole},
        database_pool, logger, res.rows);

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

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser},
        database_pool, logger, res.rows);

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

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageReactionAdd: async(eventMessageReaction, eventUser2, logger, database_pool)=>{

    if(eventMessageReaction.partial){
      //Partial, we need to get data for this event
      try {
        await eventMessageReaction.fetch();
      } catch (error) {
        logger.error('Error when getting partial messageReaction '+ error);
        return;// Return, eventMessage may be null/undefined
      }
    }

    const eventReaction = eventMessageReaction.emoji;
    const eventMessage = eventMessageReaction.message;
    const CURRENT_GUILD = eventMessage.guild;
    const eventUser = await CURRENT_GUILD.members.fetch(eventUser2);

    //Only real users should trigger events
    if(eventUser.user.bot){return;}

    let eventType = "event_reaction_added";

    logger.debug("A reaction was added in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventReaction:eventReaction,
        eventMessage:eventMessage, eventUser:eventUser},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  },

  messageReactionRemove: async(eventMessageReaction, eventUser2, logger, database_pool)=>{

    if(eventMessageReaction.partial){
      //Partial, we need to get data for this event
      try {
        await eventMessageReaction.fetch();
      } catch (error) {
        logger.error('Error when getting partial messageReaction '+ error);
        return;// Return, eventMessage may be null/undefined
      }
    }

    const eventReaction = eventMessageReaction.emoji;
    const eventMessage = eventMessageReaction.message;
    const CURRENT_GUILD = eventMessage.guild;
    const eventUser = await CURRENT_GUILD.members.fetch(eventUser2);

    //event user is the user who reacted, not the one removing this reaction
    if(eventUser.user.bot){return;}

    let eventType = "event_reaction_removed";

    logger.debug("A reaction was removed in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventReaction:eventReaction,
        eventMessage:eventMessage, eventUser:eventUser},
        database_pool, logger, res.rows);

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

    //Only real users should trigger events
    if(eventUser.user.bot){return;}

    let eventType = "event_user_voice_update";

    logger.debug("A voice state was updated in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldVoiceChannel:eventOldVoiceChannel,
        eventNewVoiceChannel:eventNewVoiceChannel, eventUser:eventUser},
        database_pool, logger, res.rows);

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

    //Only real users should trigger events
    if(eventUser.user.bot){return;}

    const eventType = "event_user_start_writting";

    logger.debug("A user started typing in guild "+CURRENT_GUILD.id+", creating a SQL request...");

    database_pool//Query to database to get code to execute
    .query(sqlRequest, [CURRENT_GUILD.id, eventType])
    .then(async (res)=>{

      logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

      run_code_in_sandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser, eventTextChannel:eventTextChannel},
        database_pool, logger, res.rows);

    })
    .catch(err =>{//Got an error while getting data from database or while executing code
      //handleError(CURRENT_GUILD.id, eventType, err);
    });
  }
}
