'use-strict';
const {EmbedBuilder} = require('discord.js');

/*This module is used to get the Embed message when someone send @Disblock.*/
module.exports = ()=>{
  return (
  new EmbedBuilder()
  .setTitle('Disblock ~ Help')
  .setDescription('Thanks for adding me ! This message will explain how to get started with Disblock.')
  .setColor(('#2E86AB'))
  .setThumbnail("https://cdn.discordapp.com/attachments/1015240892539474011/1034484537729765448/Disblock.png")
  .setAuthor({name:'Disblock Bot' , url: 'https://disblock.xyz' , iconURL: "https://cdn.discordapp.com/attachments/1015240892539474011/1034484538174341332/Disblock_circle.png"})
  .setFooter({text: 'Disblock Help' })
  .addFields({name:'Is there any commands ?', value:'Nop, this message is the only command available by default, but you can create your own events or commands on the dashboard !', inline:true})
  .addFields({name:'Disblock\'s dashboard', value:'You can configure Disblock [Here](https://disblock.xyz/panel). Login, and select a server to see the editor ! ', inline:true})
  .addFields({name:'I need help !', value:'No problem, you can check the [docs](https://docs.disblock.xyz), or join the [support server](https://discord.gg/4b6j3UBKWp). Also, be sure to give the right permissions to the bot when creating an action flow !', inline:true})
  .addFields({name:'How do I get started ?', value:'We have a page in the docs to answer this question ! Just read [this](https://docs.disblock.xyz/disblock/first-steps) and everything should be more clear !', inline:false})
  .addFields({name:'Useful links', value:'[Dashboard](https://disblock.xyz/panel) • [Support server](https://discord.gg/4b6j3UBKWp) • [Vote for Disblock](https://top.gg/bot/903324635108634654/vote) • [Leave a review](https://top.gg/bot/903324635108634654#reviews)', inline:false})
  )
}
