var express = require('express');
var router = express.Router();
var Recurso = require('../controllers/recurso')
var multer = require('multer')
const upload = multer({ dest: 'uploads/' })
var fs = require('fs')
var unzipper = require('unzipper');

/* Listar os Recursos (R) */
router.get('/', function(req, res) {
    Recurso.list()
        .then(data => res.jsonp(data))
        .catch(erro => res.jsonp(erro))
});

/* Consultar um Recurso (R) */
router.get('/:id', function(req, res) {
    Recurso.findById(req.params.id)
        .then(data => res.jsonp(data))
        .catch(erro => res.jsonp(erro))
    });

/* Criar um Recurso (C) */
router.post('/', upload.single('zip'), function(req, res) {

    //Verificar integrade do zip com o manifesto

    var recurso = req.body
    recurso.zip = req.file.originalname 
    Recurso.insert(recurso)
    .then(data => {
        fs.mkdir( __dirname + "/../FileStore/Recursos/" + req.body.autor, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating folder:', err);
        } else {
            console.log('Folder created successfully: ' + req.body._id);
            let oldPath = __dirname + '/../' + req.file.path 
            let newPath = __dirname + '/../FileStore/Recursos/' + req.body.autor + '/' + req.file.originalname 

            fs.rename(oldPath, newPath, function(error){
                if (error) {
                    return res.status(500).jsonp({ error: 'Error moving file' });
                }

                // Extrair o arquivo ZIP para o diretório do autor
                fs.createReadStream(newPath)
                .pipe(unzipper.Extract({ path: newPath }))
                .on('close', () => {
                    console.log('Files extracted successfully');
                    res.status(201).jsonp(data);
                })
                .on('error', (err) => {
                    console.error('Error extracting files:', err);
                    res.status(500).jsonp({ error: 'Error extracting files' });
                });
            })
        }
        });
        res.status(201).jsonp(data)
    })
    .catch(erro => res.jsonp(erro))
});

/* Alterar um Recurso  (U) */
router.put('/:id', upload.single('enunciado'), function(req, res) {
    var proj = req.body
    proj.enunciado = req.file.originalname 
    fs.rmSync(__dirname + '/../FileStore/recursos/' + req.params.id, { recursive: true });
    fs.mkdir( __dirname + "/../FileStore/recursos/" + req.body._id, { recursive: true }, (err) => {
    if (err) {
        console.error('Error creating folder:', err);
    } else {
        console.log('Folder created successfully: ' + req.body._id);
        let oldPath = __dirname + '/../' + req.file.path 
        let newPath = __dirname + '/../FileStore/recursos/' + req.body._id + '/' + req.file.originalname 

        fs.rename(oldPath, newPath, function(error){
        if(error) throw error
        })
    }
    })
    Recurso.update(req.params.id, proj)
        .then(data => res.jsonp(data))
        .catch(erro => res.jsonp(erro))
    });

/* Remover um Recurso (D ) */
router.delete('/:id', function(req, res) {
    fs.rmSync(__dirname + '/../FileStore/recursos/' + req.params.id, { recursive: true });
    return Recurso.remove(req.params.id)
        .then(data => res.jsonp(data))
        .catch(erro => res.jsonp(erro))
    });

module.exports = router;
