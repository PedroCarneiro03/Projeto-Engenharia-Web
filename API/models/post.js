var mongoose = require("mongoose")

var postSchema = new mongoose.Schema({
    _id: String,
    descricao:String,
    dataRegisto:String,
    comentarios:[String],
    likes:Number,
    recurso:String
}, { versionKey: false })

module.exports = mongoose.model('post', postSchema,"posts")