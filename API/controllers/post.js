const mongoose = require('mongoose')
var POST = require("../models/post")


module.exports.list = () => {
    return POST
        .find()
        .sort({likes : 1})
        .exec()
}

module.exports.findById = id => {
    return POST
        .findOne({_id : id})
        .exec()
}

module.exports.insert = post => {
    if((POST.find({_id : post._id}).exec()).length != 1){
        var newPOST = new POST(post)
        return newPOST.save()
    }
}

module.exports.update = (id, post) => {
    return POST
        .findByIdAndUpdate(id, post, {new : true})
        .exec()
}

module.exports.remove = id => {
    return POST
        .find({_id : id})
        .deleteOne()
        .exec()
}