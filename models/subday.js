const mongoose = require('mongoose');

const SubdaysSchema = new mongoose.Schema({
    guild : {
        type : Number,
        required : true
    },
    game : {
        type : String,
        required : true,
        trim : true
    },
    user : {
        type : String,
        required : true,
        trim : true
    },
    number : {
        type : Number,
        required : true,
    },
    current : {
        type : Boolean,
        required : true,
        default : true
    },
    win : {
        type : Boolean,
        required : true,
        default : false
    }
}, {
    versionKey : false,
});

module.exports = mongoose.model('subday', SubdaysSchema);