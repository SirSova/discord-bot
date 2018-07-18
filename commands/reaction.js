const Discord = require('discord.js');
const actions = ['добавить', 'удалить', 'показать'];
const model = require('../models/reaction');

/**
 * @param {Discord.Client} bot 
 * @param {Discord.Message} message 
 * @param {string[]} args 
 */
module.exports.run = async (bot, message, args) => {
    let curChannel = message.channel;
    if(message.member.hasPermission(this.help.permission)) {
        let action = args.shift();
        let noSpecifiedParams = () => {
            let syntaxEmbed = new Discord.RichEmbed().setDescription(`${bot.prefix}  ${this.help.syntax}`);
            curChannel.send(`Не правильно задана команда. Смотрите как надо:`, syntaxEmbed);
        }
        
        if (actions.includes(action)) {
            switch (action) {
                //add reaction [word] [emoji]
                case 'добавить': {
                    let word = args[0].split(',').join(' '),
                        emoji = args[1];
                    
                    //no parameters specified
                    if (!word || !emoji) {
                        noSpecifiedParams();
                        return;
                    }

                    //parse custom guild's emoji
                    let guildEmoji = emoji.match(/<?(a:)?(\w{2,32}):(\d{17,19})?/);
                    
                    if (guildEmoji !== null) {
                        //find custom emoji
                        emoji = message.guild.emojis.find('identifier', guildEmoji[0]);
                        
                        if (!emoji) {
                            curChannel.send(`Я не нашла такой emoji 😥`);
                            return;
                        }
                    }
                    
                    //try add react -> throw error message on failure
                    //              -> add new bot reaction on success
                    await message.react(emoji)
                    .then((messageReaction) => {
                        // messageReaction.remove();
                        guild.botReactions.set(word, emoji);

                        return model({
                            emoji : guildEmoji ? guildEmoji[0] : emoji,
                            word : word,
                            isCustomEmoji : typeof emoji !== "string",
                            guild : message.guild.id
                        }).save();
                    })
                    .then(() => {
                        curChannel.send(`Добавлено новое слово : ${word}`);
                    })
                    .catch((e) => {
                        console.log(e);
                        curChannel.send(`Я не смогла добавить реакцию 😥 Может быть emoji задан неверно`);
                    });
                    break;
                }
                
                //delete reaction by [word]
                case 'удалить': {
                    let word = args.join(' ');

                    if(!word) {
                        noSpecifiedParams();
                        return;
                    }

                    if (guild.botReactions.has(word)) {
                        guild.botReactions.delete(word);

                        let found = await model.findOne({
                            word : word,
                            guild : message.guild.id
                        });
                        
                        if(!found) {
                            console.log(`${word} не найдено`);
                        } else {
                            await model.deleteOne({
                                _id : found.id
                            })
                        }

                        curChannel.send(`Реакция на "${word}" удалена`)
                    } else {
                        curChannel.send(`Прости, но я и так не реагирую на ${word} 😕`);
                    }

                    break;
                }

                //represend all bot reactions
                case 'показать': {
                    let embedReactions = new Discord.RichEmbed(),
                        reactionsStr = 'Мои реакции : \n\n';
                    
                    if(guild.botReactions.size === 0) {
                        curChannel.send(`Я еще ни на что не реагирую ☹`);
                        return;
                    }

                    guild.botReactions.forEach((emoji, word) => {
                        reactionsStr += `${emoji} => ${word}\n`;
                    });
                    embedReactions.setDescription(reactionsStr);

                    curChannel.send(embedReactions);
                    break;
                }
            }
        } else {
            curChannel.send(`${message.author} не правильно задано действие. Доступные действия : [${actions.join(', ')}]`);
        }
    
    } else {
        curChannel.send(`${message.author} Изменять реакции могут только администраторы 😉`);
    }
}

module.exports.help = {
    name: "reaction",
    syntax: "reaction (дальше одно из списка)\n\t\t[добавить] [слово | выражение через запятую] [emoji]\n\t\t[удалить] [слово]\n\t\t[показать]",
    description : "добавь слово, на которое я должна реагировать 😏",
    emoji : "♥",
    permission : "ADMINISTRATOR"
}