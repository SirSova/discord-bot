const Discord = require('discord.js');
const twitchHelper = require("../twitch");
const url = require('url');
Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
}

module.exports.run = async (bot, message, args) => {
    let guild = message.guild,
        toxicUser = args[0],
        curChannel = message.channel,
        toxicity =  Math.round(Math.random() * 100)
        botReaction = '';

    //turn on/off comand
    if (toxicUser === "off" && message.member.hasPermission("ADMINISTRATOR")) {
        guild.commands.set(this.help.name, false);
        curChannel.send(`Я выключила команду ${this.help.name}`);
        return;
    } else if (toxicUser === "on" && message.member.hasPermission("ADMINISTRATOR")) {
        guild.commands.set(this.help.name, true);
        curChannel.send(`Возвращаем в действие команду ${this.help.name}!`);
        return;
    }

    //turned off -> go out
    if (!guild.commands.get(this.help.name)) return;

    //add funny reaction
    switch(true) {
        case (toxicity === 0) :
            botReaction = ['Не верю своим глазам 😦', 'Не может быть 😦'].random();    
            break;
        case (toxicity <= 30) :
            botReaction = ['Не токсичный', 'Вполне ничего!', 'Чист', 'Святоша 😇'].random();    
            break;
        case (toxicity < 80) :
            botReaction = ['Типичный "как ты играешь"', 'Типичный "я мог бы лучше"', 'Токсичность выше нормы', 'Еще немного и начнет ругаться!'].random();
            break;
        case (toxicity >= 80) :
            botReaction = ['Как вы его терпите ?!', 'Предводитель токсиков', 'Уровень токсичность на пределе ❗', 'Скоро в бан...', 'Все его не любят 🙄'].random();
            break;
    }

    //send to author
    if(!toxicUser) {
        curChannel.send(`${message.author} ваша токсичность : ${toxicity}% . ${botReaction}`);
        return;
    }

    //search user by provided id or throw syntax error message
    toxicUser = toxicUser.match(/<@(\d{17,19})?/);
    if (toxicUser) {
        let member = message.guild.members.find('id', toxicUser[1]);
            outMessage = member ? `Токсичность ${member.user} : ${toxicity}% . ${botReaction}` : `Я не нашла такого пользователя в нашем канале 😕`;
            curChannel.send(outMessage);
    } else {
        let syntaxEmbed = new Discord.RichEmbed().setDescription(`${bot.prefix}  ${this.help.syntax}`);
        curChannel.send(`Не правильно задана команда. Смотрите как надо:`, syntaxEmbed);
    }
    
}

module.exports.help = {
    name: "toxic",
    syntax : "toxic [@user]",
    description : "проверить токсичность пользователя 😈",
    emoji : "🔥",
    permission : "VIEW_CHANNEL",
}
