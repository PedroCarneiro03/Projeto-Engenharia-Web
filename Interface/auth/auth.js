const axios = require('axios');

async function verificaAcesso(req, res, next) {
  if (req.cookies && req.cookies.token) {
    try {
      // Verify token with the authentication service
      const response = await axios.get('http://localhost:29052/auth/verify', {
        headers: { Authorization: `Bearer ${req.cookies.token}` }
      });
      req.body["user"]=response.data.user
      next();
    } catch (error) {
      res.redirect('/login');
    }
  } else {
    res.redirect('/login');
  }
}



module.exports = { verificaAcesso};