var jwt = require('jsonwebtoken')

module.exports.verificaAcesso = function (req, res, next){
    var myToken = req.query.token || req.body.token || req.headers['authorization']
    
    if(myToken){

      if (myToken.startsWith('Bearer ')) {
        myToken = myToken.slice(7, myToken.length);
      }

      jwt.verify(myToken, "EngWeb2024", function(e, payload){
        if(e){
          res.status(401).jsonp({error: e})
        }
        else{
          req.user = payload;
          next()
        }
      })
    }
    else{
      res.status(401).jsonp({error: "Token inexistente!"})
    }
  }

