const { SlashCommandBuilder } = require('discord.js');
const get_help_embed = require('../modules/help_embed.js');//Return an embed that explain how to use the bot


module.exports = {
  command: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Will show you how to get started with Disblock'),

	execute: async(interaction)=>{
		await interaction.reply({ embeds: [get_help_embed()], ephemeral: true });
	}
};
