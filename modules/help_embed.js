'use-strict';
/*This module is used to get the Embed message when someone send @Disblock.*/
module.exports = (Discord)=>{
  return (
  new Discord.EmbedBuilder()
  .setTitle('Disblock ~ Help')
  .setDescription('Thanks for adding me ! This message will explain how to get started with Disblock.')
  .setColor(('#2E86AB'))
  .setThumbnail("https://cdn.discordapp.com/attachments/969581738042986576/1022469483291484191/logo.png")
  .setAuthor({name:'Disblock Bot' , url: 'https://disblock.xyz' , iconURL: "https://cdn.discordapp.com/attachments/969581738042986576/1022469483291484191/logo.png"})
  .setFooter({text: 'Disblock Help' })
  .addFields({name:'Is there any commands ?', value:'Nop, this message is the only command available by default, but you can create your own events or commands on the dashboard !', inline:true})
  .addFields({name:'Disblock\'s dashboard', value:'You can configure Disblock [Here](https://disblock.xyz/panel). Login, and select a server to see the editor ! ', inline:true})
  .addFields({name:'I need help !', value:'No problem, you can check the [docs](https://docs.disblock.xyz), or join the [support server](https://discord.gg/4b6j3UBKWp). Also, be sure to give the right permissions to the bot when creating an action flow !', inline:true})
  )
}
