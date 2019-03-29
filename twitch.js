const Twitch = require('twitch-api-v5');
const config = require("./config.json");
Twitch.clientID = config.clientId;

//find stream by userName and create post
module.exports.twitchStreamFunc = (userName) => {
    //find channel by name 

    return new Promise((resolve, reject) => {
        Twitch.users.usersByName({users:userName}, (err,data) => {
            if(data.error || err) {
                return reject(err);
            }
            user = data.users.shift();

            //find channel by userId
             Twitch.streams.channel({channelID: user._id}, (err, data) => {
                if (data.error || err) {
                    return reject(err);
                }
                stream = data.stream;

                return resolve(stream);
            })
            
        });
    });
   
    
}