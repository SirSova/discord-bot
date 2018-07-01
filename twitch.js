const Twitch = require('twitch-api-v5');
const config = require("./config.json");
Twitch.clientID = config.clientId;

//find stream by userName and create post
module.exports.twitchStreamFunc = (userName, channel, func) => {
    //find channel by name 
    Twitch.users.usersByName({users:userName}, (err,data) => {
        if(data.error || err) {
            console.log(data, err);
            return;
        }
        user = data.users.shift();
            
        //find channel by userId
         Twitch.streams.channel({channelID: user._id}, (err, data) => {
            if (data.error || err) {
                console.log(data, err);
                return;
            }
            stream = data.stream;

            func(stream, channel);
        })
        
    });
    
}