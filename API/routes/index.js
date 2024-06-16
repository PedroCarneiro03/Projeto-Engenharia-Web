var express = require('express');
var router = express.Router();
const archiver = require('archiver');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const unzipper = require('unzipper');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


const mongoUri="mongodb://127.0.0.1:27017/projetoEW";
const mongoContainer="mongoEW"
const uploadPath = './uploads';


// Função para exportar o banco de dados MongoDB
function exportMongoDB(callback) {
  const dumpCommand = `docker exec ${mongoContainer} mongodump --uri=${mongoUri} --out /backup/mongo`;
  exec(dumpCommand, (err, stdout, stderr) => {
    if (err) {
      console.error(`Erro ao exportar MongoDB: ${stderr}`);
      return callback(err);
    }
    console.log('Exportação do MongoDB concluída.');
    // Copiar os dados do contêiner para o host
    const copyCommand = `docker cp ${mongoContainer}:/backup/mongo ./backup/mongo`;
    exec(copyCommand, (err, stdout, stderr) => {
      if (err) {
        console.error(`Erro ao copiar dados do contêiner: ${stderr}`);
        return callback(err);
      }
      console.log('Dados copiados do contêiner.');
      callback(null);
    });
  });
}

// Função para compactar a pasta FileStore e a exportação do MongoDB em um único arquivo ZIP
function zipBackup(outputPath, callback) {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', () => {
    console.log(`${archive.pointer()} bytes total foram escritos no arquivo ZIP.`);
    callback(null);
  });

  archive.on('error', (err) => {
    console.error(`Erro ao criar arquivo ZIP: ${err}`);
    callback(err);
  });

  archive.pipe(output);
  archive.directory('FileStore', 'FileStore');
  archive.directory('backup/mongo', 'mongo');
  archive.finalize();
}



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


// Rota para exportar dados
router.get('/export', (req, res) => {
  // Criar diretório de backup se não existir
  if (!fs.existsSync('./backup')) {
    fs.mkdirSync('./backup');
  }

  // Exportar MongoDB e compactar FileStore
  exportMongoDB((err) => {
    if (err) {
      return res.status(500).send('Erro ao exportar banco de dados');
    }

    const zipPath = './backup/full_backup.zip';
    zipBackup(zipPath, (err) => {
      if (err) {
        return res.status(500).send('Erro ao criar arquivo ZIP');
      }

      // Enviar o arquivo ZIP para download
      res.download(zipPath, 'full_backup.zip', (err) => {
        if (err) {
          console.error(`Erro ao enviar arquivo ZIP: ${err}`);
        }
        // Limpar diretórios de backup após o download
        fs.rmSync('./backup', { recursive: true, force: true });
      });
    });
  });
});



// Função para compactar a pasta FileStore e a exportação do MongoDB em um único arquivo ZIP
function zipBackup(outputPath, callback) {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', () => {
    console.log(`${archive.pointer()} bytes total foram escritos no arquivo ZIP.`);
    callback(null);
  });

  archive.on('error', (err) => {
    console.error(`Erro ao criar arquivo ZIP: ${err}`);
    callback(err);
  });

  archive.pipe(output);
  archive.directory('FileStore', 'FileStore');
  archive.directory('backup/mongo', 'mongo');
  archive.finalize();
}


// Rota para importar dados
router.post('/import', upload.single('zip'),async (req, res) => {
  // Criar diretório de uploads se não existir
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
  }
  try {
    // Verificar se há arquivo enviado
    if (!req.files === 0) {
      return res.status(400).send('Nenhum arquivo enviado.');
    }
    fs.rmSync("./FileStore", { recursive: true, force: true });
    // Salvar o arquivo no diretório de uploads
    const zipFilePath = __dirname + "/../uploads/"+ req.file.filename //path.join(uploadPath, uploadedFile.filename);
    //console.log("aqui")
    //await uploadedFile.mv(zipFilePath);

    // Extrair o conteúdo do arquivo ZIP
    await fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: './uploads/extracted' }))
      .promise();
    // Copiar a pasta FileStore para o destino desejado na API
    
    fs.renameSync('./uploads/extracted/FileStore', __dirname + "/../FileStore");

    // Caminho completo para o diretório 'mongo' dentro do ZIP extraído
    const mongoBackupPath = __dirname +"/../uploads/extracted/mongo";

    const removeCommand = `docker exec ${mongoContainer} rm -rf /backup`;
    // Comando para copiar o diretório 'mongo' para dentro do container Docker MongoDB
    const copyCommand = `docker cp ${mongoBackupPath} ${mongoContainer}:/backup`;

    exec(removeCommand, (removeErr, removeStdout, removeStderr) => {
      if (removeErr) {
        console.error(`Erro ao remover diretório antigo no container Docker: ${removeStderr}`);
        return res.status(500).send('Erro ao remover diretório antigo no container Docker');
      }
      console.log('Remoção do diretório antigo no container Docker concluída.')
    
      // Executar o comando de cópia para dentro do container Docker
      exec(copyCommand, (copyErr, copyStdout, copyStderr) => {
        if (copyErr) {
          console.error(`Erro ao copiar para o container Docker: ${copyStderr}`);
          return res.status(500).send('Erro ao copiar para o container Docker');
        }
        console.log('Cópia para o container Docker concluída.');

        // Comando para restaurar os dados do MongoDB dentro do container Docker

        const restoreCommand = `docker exec -i ${mongoContainer} mongorestore --uri=${mongoUri} --drop /backup/projetoEW`;

        // Executar o comando de restauração dentro do container Docker
        exec(restoreCommand, (restoreErr, restoreStdout, restoreStderr) => {
          if (restoreErr) {
            console.error(`Erro ao restaurar MongoDB: ${restoreStderr}`);
            return res.status(500).send('Erro ao restaurar MongoDB');
          }
          console.log('Restauração do MongoDB concluída.');

          // Remover o arquivo ZIP e diretório temporário de uploads
          fs.unlinkSync(zipFilePath);
          fs.rmSync("./uploads/extracted", { recursive: true, force: true });

          res.send('Importação concluída com sucesso!');
        });
      });
    })
    
  } catch (err) {
    console.error(`Erro durante a importação: ${err}`);
    res.status(500).send('Erro durante a importação');
  }
});

module.exports = router;
