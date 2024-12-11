const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Client } = require('@elastic/elasticsearch');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const port = 5000;

// Fonction pour trouver une image dans les sous-dossiers
const findImageInSubfolders = (imageName) => {
  const baseDir = path.join(__dirname, 'images', 'images');
  const folders = fs.readdirSync(baseDir);
 
  for (const folder of folders) {
    const imagePath = path.join(baseDir, folder, imageName);
    if (fs.existsSync(imagePath)) {
      return `images/${folder}/${imageName}`;
    }
  }
  return null;
};

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
app.use('/images', express.static(path.join(__dirname, 'images', 'images')));

// Configuration Elasticsearch
const esClient = new Client({
  node: 'http://localhost:9200',  
  auth: {
    username: 'elastic',  
    password: 'q0K-+NHh_x+5*8FRTgBX'  
  }
});

// Vérification des données Elasticsearch
async function checkElasticsearchData() {
  try {
    const indices = await esClient.cat.indices({ format: 'json' });
    console.log('Indices disponibles:', indices.map(index => index.index));

    const sampleDoc = await esClient.search({
      index: 'image_descriptors',
      size: 1
    });
   
    if (sampleDoc.hits.hits.length > 0) {
      console.log('Structure d\'un document dans Elasticsearch:',
        JSON.stringify(sampleDoc.hits.hits[0]._source, null, 2));
    } else {
      console.log('Aucun document trouvé dans l\'index');
    }
  } catch (error) {
    console.error('Erreur lors de la vérification Elasticsearch:', error);
  }
}

// Vérifier les données au démarrage
(async () => {
  try {
    await checkElasticsearchData();
  } catch (error) {
    console.error('Erreur lors de la vérification initiale:', error);
  }
})();

// Configuration de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });



app.get('/api/search/keyword/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const result = await esClient.search({
      index: 'image_descriptors',
      body: {
        query: {
          fuzzy: {
            tags: {
              value: keyword,
              fuzziness: "AUTO",
              //operator: "or",
              //minimum_should_match: 1,       
              prefix_length: 1     // Garde la première lettre intacte
            }
          }
        }
      }
    });
   
    const enrichedResults = result.hits.hits.map(hit => {
      const imagePath = findImageInSubfolders(hit._source.image_name);
      return {
        ...hit,
        _source: {
          ...hit._source,
          fullPath: imagePath
        }
      };
    });
   
    res.json(enrichedResults);
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
  let errorData = '';

  pythonProcess.stdout.on('data', (data) => {
    descriptorData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorData += data.toString();
    console.error(`Python Error: ${data}`);
  });

  pythonProcess.on('close', async (code) => {
    try {
      // Nettoyage du fichier uploadé
      const cleanup = () => {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Erreur lors de la suppression du fichier:', err);
        });
      };

      if (code !== 0) {
        console.error('Python process error:', errorData);
        cleanup();
        return res.status(500).json({ error: 'Erreur de traitement de l\'image' });
      }

      const descriptor = JSON.parse(descriptorData);
      console.log('Descripteur de l\'image recherchée:', {
        taille: descriptor.length,
        premieresValeurs: descriptor.slice(0, 5)
      });

      if (!Array.isArray(descriptor) || descriptor.length !== 4096) {
        cleanup();
        return res.status(400).json({ error: 'Descripteur incorrect (4096 attendu)' });
      }

      // Récupérer tous les documents avec scroll API
      let allDocs = [];
      let response = await esClient.search({
        index: 'image_descriptors',
        scroll: '2m',
        size: 1000,
        body: {
          _source: ["image_name", "tags", "vgg_descriptor"],
          query: { match_all: {} }
        }
      });

      while (response.hits.hits.length > 0) {
        allDocs = allDocs.concat(response.hits.hits);
       
        if (response._scroll_id) {
          response = await esClient.scroll({
            scroll_id: response._scroll_id,
            scroll: '2m'
          });
        } else {
          break;
        }
      }

      console.log('Nombre total de documents récupérés:', allDocs.length);

      // Calcul de similarité avec tous les documents
      const similarityScores = allDocs.map(hit => {
        const storedDescriptor = hit._source.vgg_descriptor;

        if (!Array.isArray(storedDescriptor)) {
          console.log(`Image ${hit._source.image_name} - Type de descripteur:`, typeof storedDescriptor);
          return { hit, score: 0 };
        }

        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (let i = 0; i < descriptor.length; i++) {
          dotProduct += descriptor[i] * storedDescriptor[i];
          magnitude1 += descriptor[i] * descriptor[i];
          magnitude2 += storedDescriptor[i] * storedDescriptor[i];
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        const score = magnitude1 > 0 && magnitude2 > 0
          ? dotProduct / (magnitude1 * magnitude2)
          : 0;

        return { hit, score };
      });

      // Tri et sélection des meilleurs résultats
      const sortedResults = similarityScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map(item => ({
          ...item.hit,
          _score: item.score
        }));

      // Enrichissement avec les chemins complets
      const enrichedResults = sortedResults.map(hit => {
        const imagePath = findImageInSubfolders(hit._source.image_name);
        return {
          ...hit,
          _source: {
            ...hit._source,
            fullPath: imagePath
          }
        };
      });

      console.log('Résultats de la recherche:',
        enrichedResults.map(r => ({
          image: r._source.image_name,
          score: r._score
        }))
      );

      cleanup();
      res.json(enrichedResults);
    } catch (error) {
      console.error('Search error:', error);
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: error.message });
    }
  });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
  ensureDirectories();
});
