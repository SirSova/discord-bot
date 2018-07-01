const mongoose = require('mongoose')
const ReactionsSchema = new mongoose.Schema({
    guild : {
        type : Number,
        required : true
    },
    emoji : {
        type : String,
        required : true,
        trim : true
    },
    word : {
        type : String,
        required : true,
        trim : true
    },
    isCustomEmoji: {
        type : Boolean,
        required : true,
        default : false,
    }
}, {
    versionKey : false,
});

module.exports = mongoose.model('reactions', ReactionsSchema);