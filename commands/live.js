const Discord = require('discord.js');
const twitchHelper = require("../twitch");
const url = require('url');

module.exports.run = async (bot, message, args) => {
    if (!args[0]) {
        let syntaxEmbed = new Discord.RichEmbed().setDescription(`${bot.prefix}  ${this.help.syntax}`);
        channel.send(`Не правильно задана команда. Смотрите как надо:`, syntaxEmbed);
    }

    let twitchChannelName = parseTwitch(args[0]);
    twitchHelper.twitchStreamFunc(twitchChannelName, message.channel, (stream, channel) => {
        if(stream) {
            message.channel.send(`Прямой эфир!\n*${stream.channel.status}* \n${stream.channel.url}`);
        } else {
           message.channel.send(`Стрима нет 😦`);
        }
    });
    
}

function parseTwitch(text) {
    let name = text;
    if (text.includes('twitch.tv')) {
        name = name.split('/').pop();
    }

    return name;
}

module.exports.help = {
    name: "live",
    syntax : "live [twitch канал]",
    description : "посмотрим, подрубил ли мой любимый стример",
    emoji : "🎮",
    permission : "VIEW_CHANNEL"
}
