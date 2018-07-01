const Discord = require('discord.js');

module.exports.run = async (bot, message, args) => {
    let helpResponse = 'All my commands : \n',
        embedMessage = new Discord.RichEmbed();

    embedMessage.setDescription('Посмотрим что я умею');

    bot.commands.map((value, index, arr) => {
        let command = value.help;
        if(message.member.hasPermission(command.permission)) {  // check enough permissions on use command
            let turn = message.guild.commands.get(index);
            if (!turn && !message.member.hasPermission("ADMINISTRATOR")) return; // go out if command turned off and author is not admin 

            embedMessage.addField(
                `${command.emoji ? command.emoji : ''}  ${command.name} ${turn ? '' : '(off)'}`,
                `\`${bot.prefix} ${command.syntax}\`\n ${command.description}`
            );
        }
    })

    message.channel.send(embedMessage);
}

module.exports.help = {
    name : "help",
    syntax: "help",
    description : "показать все мои способности",
    emoji : "ℹ",
    permission: "VIEW_CHANNEL"
}
