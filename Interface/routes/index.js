var express = require('express');
var axios = require('axios');
var router = express.Router();
var auth = require("../auth/auth")

/* GET home page. */
router.get('/', auth.verificaLogado ,function(req, res, next) {
  res.render('paginaPrincipal',{title:"Plataforma de Gestão e Disponibilização de Recursos Educativos", logado: req.body.logado});
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* GET pag registo. */
router.get('/registar', auth.verificaLogado, function(req, res, next) {
  res.render('paginaRegisto',{title:"Pagina Registo", failVazio:false, failRegisto:false, logado: req.body.logado});
});

/* POST pag registo. */
router.post('/registar', auth.verificaLogado, function(req, res, next) {
  // Obter os dados da pagina de registo
  const {username, password, name, email, filiacao } = req.body;

  // Validar
  if (!username || !password || !name || !email || !filiacao) {
    console.log("Dados inválidos!");
    return res.render('paginaRegisto', { title: "Pagina Registo", failVazio: true, failRegisto: false, failUser: false, logado: req.body.logado});
  } else {
    // Chamar a página de sucesso
    axios.post('http://container-authentication:29052/auth/register', req.body)
      .then(dados => {
        if (dados.data.error) {
          return res.render('paginaRegisto', { title: "Pagina Registo", failVazio: false, failRegisto: false, failUser: true, logado: req.body.logado});
        }
        else{
          return res.render('registoCompleto', { title: "Registo Completo!", dados: req.body , logado: req.body.logado});
        }
      })
      .catch(error => {
        console.error("Erro no registro:", error.message);
        return res.render('paginaRegisto', { title: "Pagina Registo", failVazio: false, failRegisto: true, failUser: false, logado: req.body.logado});
      });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* GET pag login */
router.get('/login', auth.verificaLogado, function(req, res, next) {
  res.render('paginaLogin',{title:"Pagina Login", failVazio: false, failLogin: false , logado: req.body.logado});
});

/* POST pag login */
router.post('/login', auth.verificaLogado, function(req, res, next) {
  // Obter os dados da pagina de registo
  const {username, password} = req.body;

  // Validar
  if (!username || !password) {
    console.log("Dados invalidos!");
    res.render('paginaLogin',{title:"Pagina Login", failVazio: true, failLogin: false , logado: req.body.logado});
  } else {
    // Chamar a página de sucesso
    axios.post('http://container-authentication:29052/auth/login', req.body)
      .then(dados => {
        res.cookie("token",dados.data.token)
        res.render('loginCompleto',{title:"Login Completo!", dados: req.body, logado: true})
    })
      .catch(ados => res.render('paginaLogin',{title:"Login Errado!", failVazio: false, failLogin: true, dados: req.body, logado: req.body.logado}))
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/* GET pag logout */
router.get('/logout', function(req, res, next) {
  res.clearCookie("token")

  res.redirect('/')
});

module.exports = router;
