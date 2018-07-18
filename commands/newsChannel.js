const Discord = require('discord.js');
const settingsModel = require('../models/settings');

/**
 * @param {Discord.Client} bot 
 * @param {Discord.Message} message 
 * @param {string[]} args 
 */
module.exports.run = async (bot, message, args) => {
    let curChannel = message.channel;
    if(message.member.hasPermission(this.help.permission)) {
        //syntax error on empty params
        if (!args[0]) {
            let syntaxEmbed = new Discord.RichEmbed().setDescription(`${bot.prefix}  ${this.help.syntax}`);
            curChannel.send(`Не правильно задана команда. Смотрите как надо:`, syntaxEmbed);
        }
        
        //remove newsChannel and off notifications about stream
        if(args[0] === "remove") {
            message.guild.newsChannel = null;
            //remove from db
            message.guild.settings.newsChannel = null;
            message.guild.settings.save();
            
            curChannel.send(`Анонсов больше не будет 😟 Если захотите вернуть анонсы – воспользуйтесь командой снова`);
            return;
        }

        let channelId = channelIdParse(args[0]);
        let chnl = message.guild.channels.find('id', channelId);

        //failed search
        if (!channelId || !chnl) {
            curChannel.send(`Я не нашла канала ${args[0]}`);
            return;
        }

        message.guild.newsChannel = chnl;
        curChannel.send(`Я изменила новостной канал на ${chnl}. Ждите анонсов здесь`);
    } else {
        curChannel.send(`${message.author} Изменять канал анонсов могут только администраторы 😉`);
    }
}

function channelIdParse(channel) {
    let m = channel.match(/<#(\d{17,19})>?/);
    if (!m) return null;
    return m[1];
}

module.exports.help = {
    name: "newsChannel",
    syntax: "newsChannel [#канал | remove]",
    description : "изменить канал для новостей об начале стрима \n(remove - удалить оповещания)",
    emoji : "🤖",
    permission : "ADMINISTRATOR"
}
