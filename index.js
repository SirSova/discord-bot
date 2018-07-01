const config = require('./config.json');
const Discord = require('discord.js');
const fs = require("fs");
const url = require("url");
const twitchHelper = require("./twitch");
require('./mongo');
const reactionModel = require('./models/reaction');


const bot = new Discord.Client();
bot.prefix = config.prefix;
bot.commands = new Discord.Collection();

//add bot commands by file;
fs.readdir("./commands/", (err, files) => {
    if(err) console.log(err);

    let jsFile = files.filter(f => f.split(".").pop() === "js");
    if(jsFile.length <= 0) return;

    jsFile.forEach((f, i) => {
        let props = require(`./commands/${f}`);
        bot.commands.set(props.help.name, props);
    })
});

//#region EVENTS

//Initialize bot
bot.on("ready", async () => {
    console.log(`${bot.user.username} is online!`);
    bot.user.setActivity(`${bot.prefix} help`);

    bot.guilds.map(async (guild, key, collection) => {
        let channel = guild.channels.find('name', config.newsChannel);

        guild.newsChannel = channel ? channel : guild.systemChannel;
        guild.streamRole = guild.roles.find('name', config.streamerRole);
        guild.botReactions = new Discord.Collection();
        let reactionModels = await reactionModel.find({
            guild : guild.id
        });

        reactionModels.forEach((model, index) => {
            let emoji = model.isCustomEmoji ? guild.emojis.find('identifier', model.emoji) : model.emoji;
            
            if(emoji) {
                guild.botReactions.set(model.word, emoji)
            }
        });
    
        guild.commands = new Discord.Collection();

        for (let command of bot.commands.keys()) {
            guild.commands.set(command, true);
        }
    });
});

//whenever the client joins a guild
bot.on("guildCreate", async guild => {
    let channel = guild.channels.find('name', config.newsChannel);

    guild.newsChannel = channel ? channel : guild.systemChannel;
    guild.streamRole = guild.roles.find('name', config.streamerRole);
    guild.botReactions = new Discord.Collection();
    guild.commands = new Discord.Collection();

    for (let command of bot.commands.keys()) {
        guild.commands.set(command, true);
    }
})


//Message event
bot.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") {
        message.channel.send(
            `Мама говорила с незнакомцами не общаться 😇\n` +
            `На самом деле команды не выполняются в личных сообщениях, попробуй лучше на сервере`);
        return;
    }

    let prefix = bot.prefix;
        messageArray = message.content.split(" "),
        guild = message.guild;

    //bot commands
    if(messageArray[0] === prefix) {
        let cmd = messageArray[1];
        let args = messageArray.slice(2);
        let commandFile = bot.commands.get(cmd);
        if (commandFile) commandFile.run(bot, message, args);
    } 
    //special cases
    else {
        guild.botReactions.forEach(async (emoji, word) => {
            let wordRegexp = new RegExp(word + '([!\\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~\\s]|$){1}', 'i');

            if(message.content.match(wordRegexp)) {
                await message.react(emoji);
            }
        });
    }
    
});

//on update guildMember presence (check stream up/down)
bot.on("presenceUpdate", (oldMember, newMember) => {
    let oldGame = oldMember.presence.game,
        oldStream = oldGame ? oldGame.streaming : false, //streamed
        newGame = newMember.presence.game,
        newStream = newGame ? newGame.streaming : false //streaming now
        guild = newMember.guild;
        streamRole = guild.streamRole

    if (!oldStream && newStream) {
        newMember.addRole(streamRole);
        
        if (newMember.id === guild.owner.id && guild.newsChannel) {
            let streamUrl = new url.URL(newGame.url);

            if (streamUrl.hostname === "www.twitch.tv") {
                let streamName = streamUrl.pathname.split('\\').pop().split('/').pop();

                twitchHelper.twitchStreamFunc(streamName, guild.newsChannel, postStreamLive);
            }
        }
    }   
    //stream down
    else if (oldStream && !newStream) {
        newMember.removeRole(streamRole);
    }
   
});
//#endregion

//create new embed message about stream
let postStreamLive = (stream, channel) => {
    if(stream) {            
        let hypeEmoji = channel.guild.emojis.find('name', 'wow'),
            streamTime = new Date(stream.created_at),
            embed = new Discord.RichEmbed()
        .setColor("#9e07fc")
        .setDescription(
            `${hypeEmoji} **${stream.channel.display_name}** начал(а) стрим!  ${hypeEmoji}\n ***${stream.channel.status}***\n🔗 ${stream.channel.url} 🔗`)
        .addField("Game", stream.game, true)
        .addField("Views", stream.channel.views, true)
        .addField("Followers", stream.channel.followers, true)
        .addField("Link", stream.channel.url)
        .setFooter(streamTime.toUTCString());

        channel.send(embed);
        channel.send(`${stream.channel.url}`);
    }
};


bot.login(config.token);