var express = require('express');
var router = express.Router();
var axios= require("axios");
var multer = require('multer')
const upload = multer({ dest: 'uploads/' })

/* GET home page. */
router.get('/', function(req, res, next) {

  axios.get("http://localhost:29050/posts")
    .then(resposta=>{
      res.render('visualizarPosts', { title: 'Gestao de posts Home Page' ,lista:resposta.data});
    })
    .catch(erro=>{
      res.render("error",{error: erro, message:"Erro ao recuperar os posts"})
    })
  
});



router.get('/like/:id', function(req, res, next) {

    axios.get("http://localhost:29050/posts/" + req.params.id)
      .then(resposta=>{
        resposta.data["likes"]=resposta.data["likes"]+1
        axios.put("http://localhost:29050/posts/"+req.params.id,resposta.data)
        .then(response=>{
            res.render('post', { title: 'Post ' + req.params.id ,item:response.data});
        })
        .catch(erro=>{
            res.render("error",{error: erro, message:"Erro ao atualizar o post"})
        })
      })
      .catch(erro=>{
        res.render("error",{error: erro, message:"Erro ao recuperar o post"})
      })
    
  });

  router.get("/comentario/escrever/:id",function(req, res, next) {
    res.render('comentario', { title: 'Comentario para o post ' + req.params.id ,id:req.params.id});
  })

  

  router.get('/:id', function(req, res, next) {

    axios.get("http://localhost:29050/posts/" + req.params.id)
      .then(resposta=>{
        res.render('post', { title: 'Post ' + req.params.id ,item:resposta.data});
      })
      .catch(erro=>{
        res.render("error",{error: erro, message:"Erro ao recuperar o post"})
      })
    
  });


  router.post('/comentario/:id', upload.none(),function(req, res, next) {

    console.log(req.body)
    axios.get("http://localhost:29050/posts/" + req.params.id)
      .then(resposta=>{
        const currentDate = new Date();

        // Obter componentes da data atual
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Adiciona um zero à esquerda se for menor que 10
        const day = String(currentDate.getDate()).padStart(2, '0'); // Adiciona um zero à esquerda se for menor que 10

        // Obter componentes do tempo atual
        const hours = String(currentDate.getHours()).padStart(2, '0'); // Adiciona um zero à esquerda se for menor que 10
        const minutes = String(currentDate.getMinutes()).padStart(2, '0'); // Adiciona um zero à esquerda se for menor que 10
        const seconds = String(currentDate.getSeconds()).padStart(2, '0'); // Adiciona um zero à esquerda se for menor que 10

        // Formatar a data e o tempo como uma string no formato "DD-MM-YYYY HH:MM:SS"
        const dateTimeString = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        var comentario={
            autor:req.body["autor"],
            conteudo:req.body["conteudo"],
            data: dateTimeString
        } 
        resposta.data["comentarios"].push(comentario)
        axios.put("http://localhost:29050/posts/"+req.params.id,resposta.data)
        .then(response=>{
            res.render('post', { title: 'Post ' + req.params.id ,item:response.data});
        })
        .catch(erro=>{
            res.render("error",{error: erro, message:"Erro ao atualizar o post"})
        })

        
      })
      .catch(erro=>{
        res.render("error",{error: erro, message:"Erro ao recuperar o post"})
      })
    
  });
module.exports = router;