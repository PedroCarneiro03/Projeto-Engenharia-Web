var express = require('express');
var axios = require('axios');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('paginaPrincipal',{title:"Plataforma de Gestão e Disponibilização de Recursos Educativos"});
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* GET pag registo. */
router.get('/registar', function(req, res, next) {
  res.render('paginaRegisto',{title:"Pagina Registo", failVazio:false, failRegisto:false});
});

/* POST pag registo. */
router.post('/registar', function(req, res, next) {
  // Obter os dados da pagina de registo
  const {username, password, name, email, filiacao } = req.body;

  // Validar
  if (!username || !password || !name || !email || !filiacao) {
    console.log("Dados inválidos!");
    return res.render('paginaRegisto', { title: "Pagina Registo", failVazio: true, failRegisto: false });
  } else {
    // Chamar a página de sucesso
    axios.post('http://localhost:29052/auth/register', req.body)
      .then(dados => {
        return res.render('registoCompleto', { title: "Registo Completo!", dados: req.body });
      })
      .catch(error => {
        console.error("Erro no registro:", error.message);
        return res.render('paginaRegisto', { title: "Pagina Registo", failVazio: false, failRegisto: true });
      });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* GET pag login */
router.get('/login', function(req, res, next) {
  res.render('paginaLogin',{title:"Pagina Login", failVazio: false, failLogin: false});
});

/* POST pag login */
router.post('/login', function(req, res, next) {
  // Obter os dados da pagina de registo
  const {username, password} = req.body;

  // Validar
  if (!username || !password) {
    console.log("Dados invalidos!");
    res.render('paginaLogin',{title:"Pagina Login", failVazio: true, failLogin: false});
  } else {
    // Chamar a página de sucesso
    axios.post('http://localhost:29052/auth/login', req.body)
      .then(dados => res.render('loginCompleto',{title:"Login Completo!", dados: req.body}))
      .catch(ados => res.render('paginaLogin',{title:"Login Errado!", failVazio: false, failLogin: true, dados: req.body}))
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
