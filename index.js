'use strict';
/*############################################*/
/* Homemade modules */
/*############################################*/
const init_logs = require('./modules/init_logs.js');//Show a message in logs files and console when starting
const getSandbox = require('./modules/init_sandbox.js').getSandbox;//Return a sandbox when called with object containing shared vars as arg

/*############################################*/
/* Imported modules */
/*############################################*/
const Discord = require('discord.js');
const pg = require('pg');//Postgresql
const winston = require('winston');//Used to save logs
const {NodeVM} = require('vm2');//Sandbox
require('winston-daily-rotate-file');//Daily rotating files

/*############################################*/
/* Discord Client creation */
/*############################################*/
const discordClient = new Discord.Client({
  shards: 'auto',
  restRequestTimeout: 1000,
  restGlobalRateLimit: 50,
  intents:[
    //Check https://discord.js.org/#/docs/discord.js/stable/class/Intents?scrollTo=s-FLAGS
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_BANS,
    //Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    //Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
    Discord.Intents.FLAGS.GUILD_WEBHOOKS,
    Discord.Intents.FLAGS.GUILD_INVITES,
    Discord.Intents.FLAGS.GUILD_VOICE_STATES,
    Discord.Intents.FLAGS.GUILD_PRESENCES,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Discord.Intents.FLAGS.DIRECT_MESSAGES,
    Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Discord.Intents.FLAGS.GUILD_SCHEDULED_EVENTS
  ],
  rejectOnRateLimit: ()=>{return(true)},
  sweepers:
  {
      'messages':{
        interval: 60,
        lifetime: 3600 //A message is saved in cache for an hour
      }
  }
});

/*############################################*/
/* Morgan & winston modules ( Logging ) */
/*############################################*/

init_logs.initConsole();//Show a message in console when starting

/* ##### MAIN LOGGER ##### */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }), winston.format.json()),
  //exitOnError: false,
  transports: [
    new winston.transports.DailyRotateFile({ filename: './logs/app/error-%DATE%.log', level: 'error', maxFiles:process.env.LOGS_MAX_FILES, maxSize:'1g' }),//Errors file ( Errors )
    new winston.transports.DailyRotateFile({ filename: './logs/app/backend-%DATE%.log', maxFiles:process.env.LOGS_MAX_FILES, maxSize:'1g' })//Backend logs ( info, errors, debug, ...)
  ]
});

//Debug mode
if(process.env.DEBUG === 'true'){
  logger.add(new winston.transports.DailyRotateFile({filename:'./logs/app/debug-%DATE%.log', level: 'debug', maxFiles:process.env.LOGS_MAX_FILES, maxSize:'1g'}))
}

init_logs.initLogger(logger);//Initialized here to avoid showing the message twice in console
//logger.error('The server has started, logging errors here !');//Sending a message in error logs to show that we started

//If not in production, data is also logged in console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({

    format: winston.format.combine(
      winston.format.colorize({level:true}),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }), winston.format.simple()),

    level: (process.env.DEBUG === 'true' ? 'debug':'info')//Debug mode or normal errors ?
  }));
}

/* ##### Actions logger ##### */
const actionsLogger = winston.createLogger({
  levels: {info:1,action:0},
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.DailyRotateFile({ filename: './logs/actions/actions-%DATE%.log', maxFiles:process.env.LOGS_MAX_FILES, maxSize:'1g'}),//Access logs
  ]
});

init_logs.initLogger(actionsLogger);//Initialized here to avoid showing the message twice in console

/*############################################*/
/* Database database_pool */
/*############################################*/

//database_pool to the database
const database_pool = new pg.Pool();//Credentials are given by env var
database_pool.query('SELECT NOW();', (err, res) => {
      if(err instanceof Error){
        logger.error("Can't connect to the Database when starting !");
        throw(err);
      }else{
        logger.debug("Successfully connected to the Database !");
      }
});

/*############################################*/
/* Adding events */
/*############################################*/
//Functions args have the same name than the var created in Blockly generator

//Function to handle errors in guilds code
async function handleError(guildId, eventType, error){
  if(guildId!=undefined && eventType!=undefined){

    logger.error("Error while getting or executing code for "+guildId+", the code will be disabled : "+error);
    //Disabling code that may be responsible for that crash
    //If the error came from the database connection, this request shouldn't work
    database_pool.query("UPDATE server_code SET active = FALSE WHERE server_id = $1 AND action_type = 'event_message_sent';", [CURRENT_GUILD.id])
    .catch(err => {
      logger.error("Error while disabling code for "+CURRENT_GUILD.id+", we may have a database connection failure : "+err);//Error while disabling code
    });

  }else{
    logger.error("Error in guild code execution : "+error);
  }
}

//TODO : Correctly implement this
/*process.on('uncaughtException', (err) => {
    handleError(undefined, undefined, err);
});*/

//Alls these var must be declared when executing generated code. These var are created at code generation ( Blockly )
const globalVars = "let embedMessage,createdTextChannel,createdVoiceChannel,sentMessage,createdThreadOnMessage,createdRank;";
//SQL request to get code to execute, $n are defined when executing this request
const sqlRequest = "SELECT code FROM server_code WHERE server_id = $1 AND action_type = $2 AND active = TRUE;";

//A message is sent
discordClient.on("messageCreate", async (eventMessage) =>{
  const eventType = "event_message_sent";

  if(eventMessage.author.bot || eventMessage.channel.type == "DM"){return;}//Do nothing if a bot sent the message
  const CURRENT_GUILD = eventMessage.guild;//We save here the guild we're working on

  logger.debug("A message was sent in guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventMessage:eventMessage});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A message is deleted
//Only triggered if message is cached, see https://stackoverflow.com/questions/55920870/problems-with-messagedelete-in-discord-js
//And https://discordjs.guide/popular-topics/partials.html#enabling-partials
discordClient.on("messageDelete", async (eventMessage) =>{
  const eventType = "event_message_deleted";

  if(eventMessage.channel.type == "DM"){return;}//Do nothing if done in PM channel
  const CURRENT_GUILD = eventMessage.guild;//We save here the guild we're working on

  logger.debug("A message was deleted in guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventMessage:eventMessage});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A message is updated
//Only work with cached messages
discordClient.on("messageUpdate", async (eventOldMessage, eventNewMessage) =>{
  const eventType = "event_message_updated";

  if(eventNewMessage.channel.type == "DM"){return;}//Do nothing if done in PM channel
  const CURRENT_GUILD = eventNewMessage.guild;//We save here the guild we're working on

  logger.debug("A message was edited in guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldMessage:eventOldMessage, eventNewMessage:eventNewMessage});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//An user join a guild
discordClient.on("guildMemberAdd", async (eventUser) =>{
  const eventType = "event_user_join";

  if(eventUser.user.bot){return;}//Do nothing if member is bot
  const CURRENT_GUILD = eventUser.guild;//We save here the guild we're working on

  logger.debug("A member joigned guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//An user left a guild
discordClient.on("guildMemberRemove", async (eventUser) =>{
  const eventType = "event_user_left";

  if(eventUser.user.bot){return;}//Do nothing if member is bot
  const CURRENT_GUILD = eventUser.guild;//We save here the guild we're working on

  logger.debug("A member left guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A guild member is updated ( ranks, pseudo, ... )
discordClient.on("guildMemberUpdate", async (eventOldUser, eventNewUser) =>{
  const eventType = "event_user_updated";

  if(eventOldUser.user.bot){return;}//Do nothing if member is bot
  const CURRENT_GUILD = eventOldUser.guild;//We save here the guild we're working on

  logger.debug("A member was updated in guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldUser:eventOldUser, eventNewUser:eventNewUser});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A channel is created
discordClient.on("channelCreate", async (channel) =>{
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

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventVoiceChannel:eventVoiceChannel, eventTextChannel:eventTextChannel, eventThreadChannel:eventThreadChannel});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A channel is deleted
discordClient.on("channelDelete", async (channel) =>{
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

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventVoiceChannel:eventVoiceChannel, eventTextChannel:eventTextChannel, eventThreadChannel:eventThreadChannel});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A channel is updated
discordClient.on("channelUpdate", async (oldChannel, newChannel) =>{
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

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord,
      eventOldVoiceChannel:eventOldVoiceChannel, eventNewVoiceChannel:eventNewVoiceChannel, eventOldTextChannel:eventOldTextChannel,
      eventNewTextChannel:eventNewTextChannel, eventOldThreadChannel:eventOldThreadChannel, eventNewThreadChannel:eventNewThreadChannel});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A rank is created
discordClient.on("roleCreate", async (eventRole) =>{
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

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventRole:eventRole});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A rank is deleted
discordClient.on("roleDelete", async (eventRole) =>{
  const CURRENT_GUILD = eventRole.guild;

  let eventType = "event_role_deleted";

  logger.debug("A role was deleted in guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventRole:eventRole});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A rank is edited
discordClient.on("roleUpdate", async (eventOldRole, eventNewRole) =>{
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

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventOldRole:eventOldRole, eventNewRole:eventNewRole});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//An user is banned from the guild
discordClient.on("guildBanAdd", async (eventBan) =>{
  const CURRENT_GUILD = eventBan.guild;

  const eventUser = await eventBan.guild.members.fetch(eventBan.user);

  let eventType = "event_user_banned";

  logger.debug("A member was banned in guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });

});

//An user is unbanned from the guild
discordClient.on("guildBanRemove", async (eventBan) =>{
  const eventUser = eventBan.user;//TODO : Check that, that's not an GuildMember
  const CURRENT_GUILD = eventBan.guild;

  let eventType = "event_user_unbanned";

  logger.debug("A member was unbanned in guild "+CURRENT_GUILD.id+", creating a SQL request...");

  database_pool//Query to database to get code to execute
  .query(sqlRequest, [CURRENT_GUILD.id, eventType])
  .then(async (res)=>{

    logger.debug("Got SQL result for "+CURRENT_GUILD.id+", codes to execute : "+res.rows.length);

    const vm = getSandbox({CURRENT_GUILD:CURRENT_GUILD, Discord:Discord, eventUser:eventUser});//A sandbox is created in module init_sandbox.js
    for(let i=0; i<res.rows.length; i++){//For each row in database ( for each Event block in workspace )
      vm.run(globalVars+"async function a(){"+res.rows[i].code+"};a();");
    }

  })
  .catch(err =>{//Got an error while getting data from database or while executing code
    handleError(CURRENT_GUILD.id, eventType, err);
  });
});

//A reaction is added
discordClient.on("messageReactionAdd", async (eventMessageReaction, eventUser) =>{
  //TODO : check types https://discord.js.org/#/docs/discord.js/stable/class/Client?scrollTo=e-messageReactionAdd
});

//A reaction is removed
discordClient.on("messageReactionRemove", async (eventMessageReaction, eventUser) =>{
//TODO : check types https://discord.js.org/#/docs/discord.js/stable/class/Client?scrollTo=e-messageReactionAdd
});

//A guild member join, leave or move from a voice channel
discordClient.on("voiceStateUpdate", async (oldState, newState) =>{

});

//A message is pined / unpined
discordClient.on("channelPinsUpdate", async (message) =>{
//TODO : https://discord.js.org/#/docs/discord.js/stable/class/Client?scrollTo=e-channelPinsUpdate
//GLHF
});

//A guildMember is typing
discordClient.on("typingStart", async (typingState) =>{
//TODO : https://discord.js.org/#/docs/discord.js/stable/class/Typing
});

/*############################################*/
/* Starting the bot */
/*############################################*/

discordClient.login(process.env.TOKEN).then(()=>{logger.info("The Disblock's bot is ready !")});
