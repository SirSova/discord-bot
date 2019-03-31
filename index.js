const config = require('./config.json');
const Discord = require('discord.js');
const fs = require("fs");
const url = require("url");
const twitchHelper = require("./twitch");
require('./mongo');
const reactionModel = require('./models/reaction');
const settingsModel = require('./models/settings');
const subdayModel   = require('./models/subday');

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
        await guildPrepare(guild);

        //prepare existing reactions
        let reactionModels = await reactionModel.find({
            guild : guild.id
        });

        reactionModels.forEach((model, index) => {
            let emoji = model.isCustomEmoji ? guild.emojis.find('identifier', model.emoji) : model.emoji;
            
            if(emoji) {
                guild.botReactions.set(model.word, emoji)
            }
        });

        //prepare existing guild's subday
        let subdayModels = await subdayModel.find({
            guild : guild.id,
            current : true,
        });

        subdayModels.forEach((model, index) => {
            guild.subday.set(model.user, {game : model.game, win : model.win, order : model.order});
        });
        
        if(subdayModels.length > 0) {
            guild.subdayNumber = subdayModels[0].number;
        } else {
            let subdayMaxNumber = await subdayModel.find({
                guild : guild.id   
            }).sort({number : -1}).limit(1);

            if (subdayMaxNumber.length > 0) {
                guild.subdayNumber = subdayMaxNumber[0].number + 1;
            }
        }
    });
});

//whenever the client joins a guild
bot.on("guildCreate", async guild => {
    await guildPrepare(guild);
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

    let prefix = bot.prefix,
        shortPrefix = config.shortPrefix,
        messageArray = message.content.split(" "),
        guild = message.guild;
        
    //bot commands
    if(messageArray[0] === prefix) {
        let cmd = messageArray[1];
        let args = messageArray.slice(2);
        let commandFile = bot.commands.get(cmd);

        if (commandFile) commandFile.run(bot, message, args);
    } else if(messageArray[0].startsWith(shortPrefix)) {
        let cmd = messageArray[0].slice(shortPrefix.length);
        let args = messageArray.slice(1);
        let commandFile = bot.commands.get(cmd);

        if (commandFile && commandFile.help.shortPrefix) commandFile.run(bot, message, args);
    }
    //special cases
    else {
        const regexPostfix = '([!\\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~\\s]|$){1}';
        const regexPrefix = '(^|[!\\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~\\s]){1}';
        
        guild.botReactions.forEach(async (emoji, word) => {
            let wordRegexp = new RegExp(regexPrefix + word + regexPostfix, 'i');

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
        newStream = newGame ? newGame.streaming : false, //streaming now
        guild = newMember.guild,
        streamRole = guild.streamRole;

    if (!oldStream && newStream) {
        newMember.addRole(streamRole);
        
        if (newMember.id === guild.owner.id && guild.newsChannel) {
            let streamUrl = new url.URL(newGame.url);

            if (streamUrl.hostname === "www.twitch.tv") {
                let streamName = streamUrl.pathname.split('\\').pop().split('/').pop();
                const dayInTime = 86400;
                let lastTime = guild.lastOwnerStreamNotificationTime ? new Date(guild.lastOwnerStreamNotificationTime) : null,
                    now = new Date();

                if (!lastTime || (now - lastTime) / 1000 > dayInTime / 2) {
                    twitchHelper.twitchStreamFunc(streamName)
                        .then((stream) => {
                            postStreamLive(stream, guild.newsChannel);
                            guild.lastOwnerStreamNotificationTime = new Date();
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
            }
        }
    }   
    //stream down
    else if (oldStream && !newStream) {
        newMember.removeRole(streamRole);
    }
   
});
//#endregion

/**
 * Create new embed message about stream
 * 
 * @param {Object} stream 
 * @param {Discord.Channel} channel 
 */
let postStreamLive = (stream, channel) => {
    if(stream) {            
        let hypeEmoji = channel.guild.emojis.find('name', config.hypeEmoji || 'wow'),
            streamTime = new Date(stream.created_at),
            description = `**${stream.channel.display_name}** начал(а) стрим!`;

        if (hypeEmoji !== null) {
            description = `${hypeEmoji} ${description} ${hypeEmoji}`;
        }

        let embed = new Discord.RichEmbed()
        .setColor("#9e07fc")
        .setDescription(description)
        .addField("Name", `***${stream.channel.status}***`, true)
        .addField("Link", `🔗 ${stream.channel.url} 🔗`, true)
        .addField("Game", stream.game, true)
        .addField("Views", stream.channel.views, true)
        .addField("Followers", stream.channel.followers, true)
        .setFooter(streamTime.toUTCString());

        channel.send(embed);
        channel.send(`${stream.channel.url}`);
    }
};

/**
 * @param {Discord.Guild} guild 
 */
async function guildPrepare(guild) {
    let channel = guild.channels.find('name', config.newsChannel);

    let settings = await settingsModel.findOne({
        guild : guild.id
    });

    //if guild already exist -> set settings
    if (settings) {
        if(settings.newsChannel) guild.newsChannel = guild.channels.get(settings.newsChannel);
        else guild.newsChannel = channel ? channel : guild.systemChannel;
        
        if(settings.streamerRole) guild.streamRole = guild.roles.get(settings.streamerRole);
        else guild.streamRole = guild.roles.find('name', config.streamerRole);

        if(settings.subscriberRole) guild.subscriberRole = guild.roles.get(settings.subscriberRole);
        else guild.subscriberRole = guild.roles.find('name', config.subscriberRole);

        if(settings.subdayOrdersAvailable !== null || settings.subdayOrdersAvailable !== undefined) guild.subdayOrdersAvailable = settings.subdayOrdersAvailable;
        else guild.subdayOrdersAvailable = true;

        guild.settings = settings;
    } 
    //create new settingsModel in db + init required fields for guild
    else {
        guild.newsChannel = channel ? channel : guild.systemChannel;
        guild.streamRole = guild.roles.find('name', config.streamerRole);
        guild.subscriberRole = guild.roles.find('name', config.subscriberRole);
        guild.subdayOrdersAvailable = true;

        settingsModel({
            newsChannel : guild.newsChannel.id,
            subscriberRole : guild.subscriberRole ? guild.subscriberRole.id : null,
            streamerRole : guild.streamRole ? guild.streamRole.id : null,
            guild : guild.id,
            subdayOrdersAvailable : guild.subdayOrdersAvailable
        }).save();
    }

    //no settingsModel parametes
    guild.botReactions = new Discord.Collection();
    guild.subday = new Discord.Collection();
    guild.subdayNumber = 1;
    guild.commands = new Discord.Collection();

    for (let command of bot.commands.keys()) {
        guild.commands.set(command, true);
    }
}


bot.login(config.token);
