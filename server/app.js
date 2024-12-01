const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Client } = require('@elastic/elasticsearch');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const port = 5000;

// Créer les dossiers nécessaires
const ensureDirectories = () => {
  const dirs = ['uploads', 'images', 'scripts/model_weights'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Dossier créé : ${dirPath}`);
    }
  });
};

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

// Configuration Elasticsearch
const esClient = new Client({ node: 'http://localhost:9200' });

// Configuration de Multer pour le téléversement d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Route de recherche par mot-clé
app.get('/api/search/keyword/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const result = await esClient.search({
      index: 'imagesindex',
      body: { query: { match: { tags: keyword } } }
    });
    res.json(result.hits.hits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de recherche par image
app.post('/api/search/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucune image téléversée' });

  const imagePath = path.resolve(req.file.path);
  const pythonProcess = spawn('python', ['scripts/get_descriptor.py', imagePath]);

  let descriptorData = '';
  pythonProcess.stdout.on('data', (data) => (descriptorData += data.toString()));
  pythonProcess.stderr.on('data', (data) => console.error(`Python Error: ${data}`));

  pythonProcess.on('close', async (code) => {
    if (code !== 0) return res.status(500).json({ error: 'Erreur de traitement de l\'image' });

    try {
      const descriptor = JSON.parse(descriptorData);

      if (descriptor.length === 4096) {
        const result = await esClient.search({
          index: 'imagesindex',
          body: {
            query: {
              script_score: {
                query: { match_all: {} },
                script: {
                  source: "cosineSimilarity(params.query_vector, 'descriptor') + 1.0",
                  params: { query_vector: descriptor }
                }
              }
            },
            size: 5
          }
        });
        res.json(result.hits.hits);
      } else {
        res.status(400).json({ error: 'Descripteur incorrect (4096 attendu)' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      fs.unlink(req.file.path, (err) => err && console.error(err));
    }
  });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
  ensureDirectories();
});
