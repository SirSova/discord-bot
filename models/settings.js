const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    guild : {
        type : Number,
        required : true
    },
    newsChannel : {
        type : String,
        required : false,
    },
    subscriberRole : {
        type : String,
        required : false,
    },
    streamerRole: {
        type : String,
        required : false,
    },
    subdayOrdersAvailable: {
        type: Boolean,
        required: false
    }
}, {
    versionKey : false,
});

module.exports = mongoose.model('settings', settingsSchema);