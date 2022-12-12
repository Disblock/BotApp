'use-strict';
const Discord = require('discord.js');
const argsTypesEnum = require('../modules/enums/commands_args_types.js');

module.exports = {
  command: new Discord.SlashCommandBuilder()
    .setName('reloadcommands')
    .setDescription('If you edited the Slash commands in the editor, use this command to reload them !')
    .setDescriptionLocalizations({
      fr: 'Si vous avez modifié les commandes dans l\'éditeur, utilisez cette commande pour les recharger !'
     })
     .setDMPermission(false)
     .setDefaultMemberPermissions(Discord.PermissionFlagsBits.Administrator),

	execute: async(interaction, database_pool, logger)=>{
    if(!interaction.memberPermissions.has(Discord.PermissionFlagsBits.Administrator)){
      //User isn't admin ! We can stop here
      await interaction.reply({ content: "Sorry, but you need an Admin permission to run this !", ephemeral: true });
      return;
    }

    try{
      logger.debug("We will reload slash commands for guild "+interaction.guild.id);
      await interaction.deferReply({ ephemeral: true });
      //We will get in database commands defined for this server
      const commands = (await database_pool.query("SELECT command_id AS id, name, description FROM commands WHERE server_id=$1 AND defined = FALSE;", [interaction.guild.id])).rows;

      //If we can't find a new command, there are two possible cases :
      //There isn't any commands, so we can continue, or the user already did this command, so we can stop here
      //We will check here if the user already did this command
      if(commands.length==0){
        const commandAlreadyUsed = (await database_pool.query("SELECT EXISTS(SELECT 1 FROM commands WHERE server_id=$1 AND defined = TRUE) as exist;", [interaction.guild.id])).rows[0];
        if(commandAlreadyUsed.exist){
          //All commands was sent to Discord, we don't need to do it again, so we will stop here
          await interaction.editReply({
            content: ":stop_sign: You already used this command. Update slash commands with the editor before reloading commands !",
            ephemeral: true
          });
          logger.debug("All commands are already defined, cancelling commands reload for guild "+interaction.guild.id);
          return;
        }
      }

      logger.debug("Successfully got new commands for "+interaction.guild.id);

      let builtCommands = [];
      for(let i=0; i<commands.length; i++){//For each command

        //We will check that this command don't have the same name as a global command
        if(interaction.client.commands.get(commands[i].name)){
          //Same name as a global command
          logger.debug("Cancelling reloading of commands for guild "+interaction.guild.id+" : a command was defined with same name as a global one");
          await interaction.editReply({
            content: ":stop_sign: One of your slash commands has the same name than a global command...\
              \nTry to rename the command `"+commands[i].name+"` before trying `/"+interaction.commandName+"` again",
            ephemeral: true
          });
          return;
        }

        let tempCommand = new Discord.SlashCommandBuilder().setName(commands[i].name).setDescription(commands[i].description).setDMPermission(false);

        //We will now get the args for this command
        const args = (await database_pool.query("SELECT name, description, required, type FROM commands_args WHERE command_id = $1 ORDER BY arg_id;", [commands[i].id])).rows;
        for(let j=0; j<args.length; j++){//For each arg in this command

          switch(args[j].type){
            case argsTypesEnum.boolean:
              tempCommand.addBooleanOption(new Discord.SlashCommandBooleanOption().setName(args[j].name).setDescription(args[j].description).setRequired(args[j].required));
              break;
            case argsTypesEnum.int:
              tempCommand.addNumberOption(new Discord.SlashCommandNumberOption().setName(args[j].name).setDescription(args[j].description).setRequired(args[j].required));
              break;
            case argsTypesEnum.role:
              tempCommand.addRoleOption(new Discord.SlashCommandRoleOption().setName(args[j].name).setDescription(args[j].description).setRequired(args[j].required));
              break;
            case argsTypesEnum.string:
              tempCommand.addStringOption(new Discord.SlashCommandStringOption().setName(args[j].name).setDescription(args[j].description).setRequired(args[j].required));
              break;
            case argsTypesEnum.user:
              tempCommand.addUserOption(new Discord.SlashCommandUserOption().setName(args[j].name).setDescription(args[j].description).setRequired(args[j].required));
              break;
            case argsTypesEnum.textChannel:
              tempCommand.addChannelOption(new Discord.SlashCommandChannelOption().setName(args[j].name).setDescription(args[j].description).setRequired(args[j].required)
                .addChannelTypes(Discord.ChannelType.GuildText));
              break;
            default:
              throw("Error : unknown type for slash command arg "+args[j].type);
          }
        }

        //This command is now ready to send to Discord
        builtCommands.push(tempCommand);
      }

      //We will mark these commands a defined
      await database_pool.query("UPDATE commands SET defined = TRUE WHERE server_id = $1;", [interaction.guild.id]);

      //We calculated commands for this guild, we can now add them to the server
      logger.debug("We're ready to send new commands to Discord for guild "+interaction.guild.id);
      const rest = new Discord.REST({ version: '10' }).setToken(process.env.TOKEN);

      try{
        await rest.put(
        	Discord.Routes.applicationGuildCommands(process.env.CLIENT_ID, interaction.guild.id),
        	{ body: builtCommands }
        );
        await interaction.editReply({
          content: ':white_check_mark: '+builtCommands.length+' commands were loaded on your server !',
          ephemeral: true
        });
        logger.debug("Successfully sent new slash commands to Discord for guild "+interaction.guild.id);

      }catch(err){
        logger.error("Error while sending custom slash commands to Discord : "+err);
        await interaction.editReply({
          content: ":stop_sign: Sorry, but there was a problem while reloading your slash commands...\
            \nTry to remove the bot from the server and add it again, you can find an invite link on https://disblock.xyz/\
            \nIf this problem persist, please, report this on the support server",
          ephemeral: true
        });
        return;
      }

    }catch(err){
      logger.error("Error while getting slash commands from database : "+err);
      await interaction.editReply({
        content: ":stop_sign: Sorry, but there was a problem while reloading your slash commands...\
          \nRetry later, or if this problem persist, please, report this on the support server",
        ephemeral: true
      });
      return;
    }

	}
};
