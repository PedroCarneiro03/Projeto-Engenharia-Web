var express = require('express');
var router = express.Router();
var Recurso = require('../controllers/recurso')

var multer = require('multer')
const upload = multer({ dest: 'uploads/' })
var fs = require('fs-extra')
const path = require('path');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const archiver = require('archiver');


async function calculateFileHash(filePath) {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filePath);
    for await (const chunk of input) {
      hash.update(chunk);
    }
    return hash.digest('hex');
  }

/* Listar os Recursos (R) */
router.get('/', function(req, res) {
    Recurso.list()
        .then(data => res.jsonp(data))
        .catch(erro => res.jsonp(erro))
});

//Download aos ficheiros todos
router.get("/download/:autor/:id",async function(req,res){
    
        //Dar zip a tudo o que esta no dirPath e enviar juntamente com os metadados
        const directoryPath = __dirname + "/../FileStore/Recursos/" + req.params.autor + "/" + req.params.id + "/";
        
        try{
            const files = await fs.readdir(directoryPath);
            const manifest = [];
            for (const file of files) {
                const filePath = path.join(directoryPath, file);
                const hash = await calculateFileHash(filePath);
                manifest.push({
                filename: file,
                hash: hash
            });
            }
            
            const manifestPath = path.join(directoryPath, 'manifest.txt');
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=${req.params.id}.zip`);
            //const outputPath = __dirname + "/../teste/" + req.params.id + ".zip";
            //const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            archive.pipe(res);
            //archive.pipe(output);
            // Adiciona os arquivos ao zip
            for (const file of files) {
                archive.file(path.join(directoryPath, file), { name: file });
            }
        
            // Adiciona o manifesto ao zip
            archive.file(manifestPath, { name: 'manifest.txt' });
        
            await archive.finalize();

            // Remove o arquivo manifest.txt
            await fs.remove(manifestPath);
        

        } catch (error) {
            console.error('Error creating zip:', error);
            res.status(500).send('Server error.');
        }
})

/* Consultar um Recurso (R) */
router.get('/:id',  function(req, res) {
    Recurso.findById(req.params.id)
        .then(recurso => {
            console.log('Recurso encontrado:', recurso);
            const dirPath = __dirname + "/../FileStore/Recursos/" + recurso["autor"] + "/" + recurso["_id"] + "/";

            console.log(dirPath)
            // Verificar se o diretório existe
            if (!fs.existsSync(dirPath)) {
            return res.status(404).json({ message: 'Diretório de ficheiros não encontrado' });
            }
            

            // Ler os ficheiros no diretório
            const files = fs.readdirSync(dirPath).map(filename => {
                const filePath = path.join(dirPath, filename);
                const stats = fs.statSync(filePath); // Obter estatísticas do ficheiro
                const content = fs.readFileSync(filePath); // Ler conteúdo do ficheir
                return {
                    filename,
                    mimetype: mime.lookup(filePath), // Obter o mimetype do ficheiro
                    size: stats.size, // Obter o tamanho do ficheiro em bytes
                    content // Conteúdo do ficheiro
                };
            });

            // Combinar metadados e ficheiros na resposta
            const response = {
            ...recurso.toObject(),
            files
            };
            console.log(files)
            res.jsonp(response);

            /*
            //Dar zip a tudo o que esta no dirPath e enviar juntamente com os metadados
            try{
                const files = await fs.readdir(directoryPath);
                const manifest = [];
                for (const file of files) {
                  const filePath = path.join(directoryPath, file);
                  const hash = await calculateFileHash(filePath);
                  manifest.push({
                    filename: file,
                    hash: hash
                });
                }
                
                const manifestPath = path.join(directoryPath, 'manifest.txt');
                await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
            
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename=${recurso["_id"]}.zip`);
            
                const archive = archiver('zip', { zlib: { level: 9 } });
                archive.pipe(res);
                // Adiciona os arquivos ao zip
                for (const file of files) {
                  archive.file(path.join(directoryPath, file), { name: file });
                }
            
                // Adiciona o manifesto ao zip
                archive.file(manifestPath, { name: 'manifest.txt' });
            
                await archive.finalize();
                console.log("tou aqui");
            

            } catch (error) {
                console.error('Error creating zip:', error);
                res.status(500).send('Server error.');
            }*/
        })
        .catch(erro => res.jsonp(erro))
    });



/* Criar um Recurso (C) */
router.post('/', upload.single('zip'), async function(req, res) {

    
    const tempDir = path.join(__dirname, '../tmp');
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);
    let oldPath = __dirname + '/../' + req.file.path 
    let newPath = tempDir + '/' + req.file.originalname 

    await fs.promises.rename(oldPath, newPath, function(error){
    if(error) throw error
    })
    const zipFilePath = newPath;
    
  try {
    // Ler o arquivo ZIP
    //console.log(zipFilePath)
    const zip =  new AdmZip(zipFilePath);

    // Ler o arquivo de manifesto, se existir
    const manifestEntry = zip.getEntry('manifest.txt');
    if (!manifestEntry) {
      throw new Error('Arquivo de manifesto não encontrado no arquivo ZIP.');
    }

    const manifestContent = zip.readAsText(manifestEntry);
    const manifest = JSON.parse(manifestContent);
    //console.log(manifest)
    // Verificar os arquivos presentes no ZIP em relação aos dados do manifesto
    const zipEntries = zip.getEntries();
    const filesInZip = zipEntries.filter(entry => !entry.isDirectory);
    const filesInManifest = manifest.map(entry => entry.filename);

    const missingFiles = filesInManifest.filter(filename => !filesInZip.some(entry => entry.entryName === filename));
    if (missingFiles.length > 0) {
      throw new Error(`Arquivos ausentes no arquivo ZIP: ${missingFiles.join(', ')}`);
    }
    const extraFiles = filesInZip.filter(entry => entry.entryName !== 'manifest.txt' && !filesInManifest.includes(entry.entryName) );
    if (extraFiles.length > 0) {
    throw new Error(`Arquivos extras no arquivo ZIP: ${extraFiles.map(entry => entry.entryName).join(', ')}`);
    }

    // Extrair todos os arquivos do ZIP para uma pasta temporária
    const extractDir = __dirname +  "/../FileStore/Recursos/" + req.body.autor + "/" + req.body["_id"] +"/"
    await fs.ensureDir(extractDir);
    zip.extractAllTo(extractDir, true);
    fs.remove(extractDir + "manifest.txt")

    // Calcular as hashes dos arquivos extraídos e compará-las com as hashes do manifesto
    for (const fileEntry of filesInZip) {
        const filename = fileEntry.entryName;
        if( filename!="manifest.txt"){
            const filePath = path.join(extractDir, filename);

            const fileContent = await fs.readFile(filePath);
            const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

            const manifestEntry = manifest.find(entry => entry.filename === filename);
            if (!manifestEntry) {
                throw new Error(`Hash para ${filename} não encontrada no manifesto.`);
            }

            if (fileHash !== manifestEntry.hash) {
                throw new Error(`Hash para ${filename} no manifesto não corresponde.`);
            }
        }
    }
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

    var recurso={
        _id:req.body["_id"],
        tipo:req.body["tipo"],
        titulo:req.body["titulo"],
        subtitulo:req.body["tipo"],
        dataCriacao:req.body["dataCriacao"],
        dataRegisto:dateTimeString,
        visibilidade:req.body["visibilidade"],
        autor:req.body["autor"],
        ficheiro:[]
    }
    //Inserir na base de dados
    for (const entrada of manifest){
        
        recurso["ficheiro"].push(entrada["filename"])
    }
    Recurso.insert(recurso).then(resposta=>res.jsonp('Ficheiros inseridos com sucesso')).catch(erro=>res.status(409).jsonp(erro))
    
  } catch (error) {
    console.error(error);
    res.status(500).jsonp('Erro ao verificar arquivos e hashes.');
  } 


  
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