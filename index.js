'use strict';
/*############################################*/
/* Homemade modules */
/*############################################*/
const init_logs = require('./modules/init_logs.js');//Show a message in logs files and console when starting


/*############################################*/
/* Imported modules */
/*############################################*/
const Discord = require('discord.js');
const winston = require('winston');//Used to save logs
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
/* Starting the bot */
/*############################################*/

discordClient.login(process.env.TOKEN).then(()=>{logger.info("The Disblock's bot is ready !")});
