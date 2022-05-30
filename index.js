'use strict';
/*############################################*/
/* Homemade modules */
/*############################################*/
const init_logs = require('./modules/init_logs.js');//Show a message in logs files and console when starting
const event_functions = require('./modules/event_functions.js');//Store the executed functions on events

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
/* System events */
/*############################################*/
//These events are only used by the bot, users can't use these

  discordClient.on("guildCreate", async(guild)=>{
    database_pool.query("INSERT INTO servers (server_id, name) VALUES ($1, $2)", [guild.id, guild.name])
    .then(()=>{
      logger.info("Bot was added in a new server : "+guild.id+"("+guild.name+")");
      logger.debug("Successfully added a new server to database !");
    })
    .catch((err)=>{logger.error("Error when joining a new server ! ID :"+guild.id+", error : "+err);})
  });

  discordClient.on("guildDelete", async(guild)=>{
    logger.info("Bot was removed from a guild : "+guild.id+"("+guild.name+")");
  });

/*############################################*/
/* Adding events */
/*############################################*/
//Functions args have the same name than the var created in Blockly generator

//Function to handle errors in guilds code
/*async function handleError(guildId, eventType, error){
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
}*/

process.on('uncaughtException', (err) => {
    //handleError(undefined, undefined, err);
    if(process.env.BOT_LOG_ERRORS==='true'){
      logger.error(err);
    }
});

//A message is sent
discordClient.on("messageCreate", async(eventMessage)=>{
  event_functions.messageCreate(eventMessage, logger, database_pool);
});

//A message is deleted
//Only triggered if message is cached, see https://stackoverflow.com/questions/55920870/problems-with-messagedelete-in-discord-js
//And https://discordjs.guide/popular-topics/partials.html#enabling-partials
discordClient.on("messageDelete", async (eventMessage) =>{
  event_functions.messageDelete(eventMessage, logger, database_pool);
});

//A message is updated
//Only work with cached messages
discordClient.on("messageUpdate", async (eventOldMessage, eventNewMessage) =>{
  event_functions.messageUpdate(eventOldMessage, eventNewMessage, logger, database_pool);
});

//An user join a guild
discordClient.on("guildMemberAdd", async (eventUser) =>{
  event_functions.guildMemberAdd(eventUser, logger, database_pool);
});

//An user left a guild
discordClient.on("guildMemberRemove", async (eventUser) =>{
  event_functions.guildMemberRemove(eventUser, logger, database_pool);
});

//A guild member is updated ( ranks, pseudo, ... )
discordClient.on("guildMemberUpdate", async (eventOldUser, eventNewUser) =>{
  event_functions.guildMemberUpdate(eventOldUser, eventNewUser, logger, database_pool);
});

//A channel is created
discordClient.on("channelCreate", async (channel) =>{
  event_functions.channelCreate(channel, logger, database_pool);
});

//A channel is deleted
discordClient.on("channelDelete", async (channel) =>{
  event_functions.channelDelete(channel, logger, database_pool);
});

//A channel is updated
discordClient.on("channelUpdate", async (oldChannel, newChannel) =>{
  event_functions.channelUpdate(oldChannel, newChannel, logger, database_pool);
});

//A rank is created
discordClient.on("roleCreate", async (eventRole) =>{
  event_functions.roleCreate(eventRole, logger, database_pool);
});

//A rank is deleted
discordClient.on("roleDelete", async (eventRole) =>{
  event_functions.roleDelete(eventRole, logger, database_pool);
});

//A rank is edited
discordClient.on("roleUpdate", async (eventOldRole, eventNewRole) =>{
  event_functions.roleUpdate(eventOldRole, eventNewRole, logger, database_pool);
});

//An user is banned from the guild
discordClient.on("guildBanAdd", async (eventBan) =>{
  event_functions.guildBanAdd(eventBan, logger, database_pool);
});

//An user is unbanned from the guild
discordClient.on("guildBanRemove", async (eventBan) =>{
  event_functions.guildBanRemove(eventBan, logger, database_pool);
});

//A reaction is added
discordClient.on("messageReactionAdd", async (eventMessageReaction, eventUser2) =>{
  event_functions.messageReactionAdd(eventMessageReaction, eventUser2, logger, database_pool);
});

//A reaction is removed
discordClient.on("messageReactionRemove", async (eventMessageReaction, eventUser2) =>{
  event_functions.messageReactionRemove(eventMessageReaction, eventUser2, logger, database_pool);
});

//A guild member join, leave or move from a voice channel
discordClient.on("voiceStateUpdate", async (oldState, newState) =>{
  event_functions.voiceStateUpdate(oldState, newState, logger, database_pool);
});

//A message is pined / unpined
/*discordClient.on("channelPinsUpdate", async (message) =>{
//TODO : https://discord.js.org/#/docs/discord.js/stable/class/Client?scrollTo=e-channelPinsUpdate
});*/

//A guildMember is typing
discordClient.on("typingStart", async (typingState) =>{
  event_functions.typingStart(typingState, logger, database_pool);
});

/*############################################*/
/* Starting the bot */
/*############################################*/

discordClient.login(process.env.TOKEN).then(()=>{logger.info("The Disblock's bot is ready !")});
