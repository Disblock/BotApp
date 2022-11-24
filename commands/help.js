'use-strict';
const { SlashCommandBuilder,PermissionFlagsBits } = require('discord.js');
const get_help_embed = require('../modules/help_embed.js');//Return an embed that explain how to use the bot


module.exports = {
  command: new SlashCommandBuilder()
    .setName('help')
    .setDescription('This command will show you how to get started with Disblock')
    .setDescriptionLocalizations({
	    fr: 'Cette commande vous montrera comment bien débuter avec Disblock'
	   }),

	execute: async(interaction)=>{
		await interaction.reply({ embeds: [get_help_embed()], ephemeral: true });
	}
};
