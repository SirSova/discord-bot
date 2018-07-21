const Discord = require('discord.js');
const subdayModel = require('../models/subday');
const wheelUrl = 'http://wheeldecide.com/';
const request = require('request');
const config = require('../config.json');
const { BitlyClient } = require('bitly');
const bitly = new BitlyClient(config.bitlyToken);

/** 
 * @param {Discord.Guild} guild 
 * @param {string} id 
 */
async function removeGame(guild, id) {
    await subdayModel.deleteOne({ guild : guild.id, user : id, number : guild.subdayNumber })

    guild.subday.delete(id);
}

/** 
 * Form the link with games
 * TODO return short url!
 * @param {Discord.Collection} collection 
 */
function createWheelLink(guild) {
    let link = wheelUrl;
    let i = 1;
    guild.subday.forEach((value, user) => {
        link += `${i === 1 ? '?' : '&' }c${i++}=` + encodeURIComponent(value.game + ` (${resolveUserName(guild, user)})`);
    });

    return link;
}

/**
 * @param {Discord.Guild} guild 
 * @param {Discord.User} user 
 */
function resolveUserName(guild, user) {
    let member = guild.members.find(`id`, user);
    return member ? member.displayName : user;
}

/**
 * @param {Discord.Guild} guild 
 * @param {Discord.User} user 
 * @param {string} game 
 */
async function saveGame(guild, user, game) {
    if (guild.subday.has(user)) {
        await subdayModel.updateOne(
            { guild : guild.id, user : user },
            { game: game }
        );
    } else {
        await subdayModel({
            guild : guild.id,
            user : user,
            game : game,
            number : guild.subdayNumber,
            current : true,
            win : false
        }).save();
    }

    guild.subday.set(user, {game : game, win : false}); 
}

/**
 * @param {Discord.Collection} subday 
 * @param {Discord.Guild} guild 
 */
function embedSubdayGames(subday, guild) {
    let embed = new Discord.RichEmbed();
    let gamesStr = '';
    let i = 0;

    subday.forEach((value, user) => {
        gamesStr += `${++i} . ${resolveUserName(guild, user)}  |  ${value.game} ${value.win ? `***(win${value.order ? `*** ${value.order} игра***` : ''})***` : ''}\n`;
    });

    embed.setDescription(gamesStr);
    return embed;
}

/**
 * @param {Discord.Client} bot 
 * @param {Discord.Message} message 
 * @param {string[]} args 
 */
module.exports.run = async (bot, message, args) => {
    let guild = message.guild;
    if (!guild.subscriberRole) return;

    let curChannel = message.channel;

    //turn on/off comand
    if (args[0] === "off" && message.member.hasPermission("ADMINISTRATOR")) {
        guild.commands.set(this.help.name, false);
        curChannel.send(`Я выключила команду ${this.help.name}`);
        return;
    } else if (args[0] === "on" && message.member.hasPermission("ADMINISTRATOR")) {
        guild.commands.set(this.help.name, true);
        curChannel.send(`Возвращаем в действие команду ${this.help.name}!`);
        return;
    }

    //turned off -> go out
    if (!guild.commands.get(this.help.name)) return;

    if (message.member.hasPermission(this.help.permission)) {
        if (message.member.roles.has(guild.subscriberRole.id)) {
            let user = message.author.id;
            const userPrefix = '-user:';

            switch(args[0]) {
                /**
                 * ALL GAMES
                 */
                case '-all':
                case '-show':
                case '-показать':
                    if (guild.subday.size <= 0 ) {
                        curChannel.send(`Список игр на Subday пуст`);
                        return;
                    }

                    let embed = embedSubdayGames(guild.subday, guild);
                    curChannel.send(embed);

                    break;

                /**
                 * NEW SUBDAY
                 */
                case '-new': 
                    if (guild.subday) {
                        //set previous games status current : false;
                        await subdayModel.updateMany(
                            { current : true },
                            { current : false } 
                        );
                    }

                    guild.subday = new Discord.Collection();
                    guild.subdayNumber = guild.subdayNumber ? guild.subdayNumber + 1 : 1;
                    break;

                /**
                 * WHEEL
                 */
                case '-wheel':
                case '-колесо':
                case '-w':
                    let link = createWheelLink(guild);
                    await bitly.shorten(link)
                        .then((res) => {
                            curChannel.send(`Крутите колесо : <${res.url}>`);
                        })
                        .catch((err) => console.log(err));
                    break;

                /**
                 * REMOVE GAME
                 */
                case '-rm':
                case '-delete':
                case '-удалить':
                    if (args[1] && args[1].startsWith(userPrefix)) {
                        if (message.member.hasPermission('ADMINISTRATOR')) {
                            user = args[1].slice(userPrefix.length);
                            let match = user.match(/<@(\d{17,19})?/);
                            let member = match ? guild.members.find(`id`, match[1]) : null;
                            if (member) {
                                user = member.id;
                            }
                        } else {
                            curChanne.send(`${message.author} удалить чужие игры может только администратор 🙃`);
                            return;
                        }
                    }

                    if (guild.subday.has(user)) {
                        let game = guild.subday.get(user);

                        await removeGame(guild, user);

                        curChannel.send(`${message.author}, **${game.game}** удалена!`);
                        message.react('➖');
                    } else {
                        curChannel.send(`${message.author}, не нашла в списке игр такого пользователя`)
                    }

                    break;

                /**
                 * ADD GAME
                 */
                case '-add':
                case '-добавить':
                default:
                    if (args[0] === '-add' || args[0] === '-добавить') args.shift();
                    let errorMessage = () => curChannel.send(`${message.author} Вы не ввели игру или не указали действие 😕 Посмотрите как надо : ${this.help.syntax}`);

                    //check on exist arguments
                    if(!args[0] || (args[0].startsWith('-') && !args[0].startsWith(userPrefix))) {
                        errorMessage();
                        return;
                    }

                    //add the game for another user
                    if (args[0].startsWith(userPrefix)) {
                        if (message.member.hasPermission('ADMINISTRATOR')) {
                            user = args.shift().slice(userPrefix.length);
                            let match = user.match(/<@(\d{17,19})?/)
                            let member = match ? guild.members.find(`id`, match[1]) : guild.members.find(`displayName`, user);
                            if (member) {
                                user = member.id;
                            }
                        } else {
                            curChannel(`${message.author} добавлять игру за других может только администратор 🙃`);
                            return;
                        }
                    }

                    //check on exist game
                    let game = args.join(' ');
                    if (!game) {
                        errorMessage();
                        return;
                    }

                    saveGame(guild, user, game);

                    curChannel.send(`${message.author} , игра **${game}** добавлена`);
                    message.react('➕');
                    break;

                /**
                 * WIN GAME
                 */
                case '-win':
                case '-победитель':
                    args.shift();
                    if (message.member.hasPermission('ADMINISTRATOR')) {
                        let notFound = [];
                        let notOrder = [];
                        let winners = [];
                        
                        if (args.length <= 0) {
                            curChannel.send(`${message.author}, вы забыли заполнить победителей 😕`);
                            return;
                        }
                        
                        args.forEach(async (value, index) => {  
                            let order = value.match(/(.*?)\./);

                            if (order === null) {
                                notOrder.push(value);
                                return;
                            }

                            value = value.slice(order[0].length);
                            let guildMember = guild.members.find('displayName', value);
                            let user = guildMember ? guildMember.id : value;
                            let winner = guild.subday.get(user);

                            if (winner) {
                                winners.push(value);
                                winner.win = true;
                                winner.order = order[1];

                                await subdayModel.updateOne(
                                    {guild : guild.id, user : user , number : guild.subdayNumber},
                                    {win : true, order : order[1]}
                                )
                            } else {
                                notFound.push(value);
                            }
                        })

                        curChannel.send((winners.length > 0 ? `Поздравляем ${winners.join(', ')} с победой!🎉` : '') + 
                                        (notOrder.length > 0 ? `Вы не указали порядок для : ${notOrder.join(', ')}` : '') +
                                        (notFound.length > 0 ? `Не смогла найти : ${notFound.join(', ')} 😥` : ''));
                    } else {
                        curChannel.send(`${message.author}, выбирать победные игры могут только администраторы`)
                    }
                    break;

                /**
                 * UNWIN (LOSE), REMOVE WIN STATUS
                 */
                case '-unwin':
                case '-lose':
                    args.shift();
                    if (message.member.hasPermission('ADMINISTRATOR')) {
                        let notFound = [],
                            losers = [],
                            notLosers = [];
                        
                        if (args.length <= 0) {
                            curChannel.send(`${message.author}, вы забыли заполнить лузеров 😅`);
                            return;
                        }

                        args.forEach(async (value, index) => {
                            let guildMember = guild.members.find('displayName', value);
                            let user = guildMember ? guildMember.id : value;
                            let loser = guild.subday.get(user);

                            if (loser) {
                                if (loser.win) {
                                    losers.push(value);
                                    loser.win = false;
                                    loser.order = null;

                                    await subdayModel.updateOne(
                                        {guild : guild.id, user : user, number : guild.subdayNumber},
                                        {win : false, order : null}
                                    )
                                } else {
                                    notLosers.push(value);
                                }
                            } else {
                                notFound.push(value);
                            }
                        });

                        curChannel.send((losers.length > 0 ?`К сожалению придется забрать победу у ${losers.join(', ')} 😔.` : '') + 
                                        (notLosers.length > 0 ? `А вот они и не виигрывали : ${notLosers.join(', ')}!` : '') + 
                                        (notFound.length > 0 ? `Не смогла найти : ${notFound.join(', ')} 😥` : '')
                        );
                    } else {
                        curChannel.send(`${message.author}, убирать статус победителя могут только администраторы`);
                    }
                    break;

                /**
                 * PREVIOUS SUBDAY
                 */
                case '-previous':
                case '-предыдущий':
                    let previousSubday = await subdayModel.find(
                        {guild : guild.id, number : guild.subdayNumber - 1}
                    );
                    
                    if (previousSubday) {
                        let subdayCollection = new Discord.Collection();
                        
                        previousSubday.forEach((value, id) => {
                            subdayCollection.set(value.user, {game : value.game, win : value.win});
                        })
                        let embed = embedSubdayGames(subdayCollection, guild);

                        curChannel.send(embed);
                    } else {
                        curChannel.send(`Я не нашла предыдущий subday 😧`);
                    }
                    break;

                /**
                 * WINNERS ONLY
                 */
                case '-winners':
                case '-победители':
                    let winners = guild.subday.filter((value, user) => {
                        return value.win === true;
                    }).sort((a, b) => {
                        if (a.order && b.order) {
                            return a.order > b.order ? 1 : -1;
                        }
                        return 1;
                    });
                    if (winners.size > 0) {
                        let embedWinners = embedSubdayGames(winners, guild);
                        curChannel.send(embedWinners);
                    } else {
                        curChannel.send(`Пока нет победителей 😕`);
                    }

                    break;
            };
        } else {
            curChannel.send(`${message.author} Для заказа игр на сабдей подпишись канал 😉`)
        }
    } else {
        curChannel.send(`${message.author} У вас недостаточно прав для этой команды`);
    }
}

module.exports.help = {
    name : "subday",
    syntax: "subday [Game] Заказать игру\n\t" + 
                    "[-all, -показать] Список заказанных игр\n\t" + 
                    "[-new] Обновить сабдей (admin only)\n\t" + 
                    "[-wheel, -колесо] Ссылка на колесо \n\t" + 
                    "[-rm, -удалить] Удалить вашу игру\n\t" + 
                    "[-win, -победитель] [name1 name2] Выбрать победителей (admin)\n\t" +
                    "[-unwin, -lose] [name1 name2] Убрать статус победителя (admin)\n\t" +
                    "[-previous, -предыдущий] Посмотреть список игр прошлого сабдея",
    description : "заказывать игры на сабдей",
    emoji : "🎮",
    permission: "VIEW_CHANNEL",
    shortPrefix : true
}
