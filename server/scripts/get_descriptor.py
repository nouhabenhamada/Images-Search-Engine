import sys
import os
import numpy as np
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing import image
from PIL import Image
import json

# Désactiver les warnings TensorFlow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

class FeatureExtractor:
    def __init__(self):
        # Charger VGG16 avec le top (couche de classification) inclus
        base_model = VGG16(weights='imagenet')
        # Sélectionner la couche 'fc1' comme descripteur
        self.model = Model(inputs=base_model.input, outputs=base_model.get_layer('fc2').output)

    def extract(self, img):
        # Redimensionner l'image à 224x224 comme requis par VGG16
        img = img.resize((224, 224))
        img = img.convert('RGB')  # S'assurer que l'image est au format RGB
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)  # Prétraitement spécifique à VGG16
        feature = self.model.predict(x, verbose=0)[0]
        return feature / np.linalg.norm(feature)  # Normalisation du descripteur

def get_vgg_features(image_path):
    # Charger l'image
    img = Image.open(image_path)
    # Créer une instance de FeatureExtractor
    feature_extractor = FeatureExtractor()
    # Extraire le descripteur
    descriptor = feature_extractor.extract(img)
    return descriptor

if __name__ == "__main__":
    # Vérifier l'argument
    if len(sys.argv) != 2:
        print("Usage: python get_descriptor.py <image_path>")
        sys.exit(1)
        
    # Obtenir le chemin de l'image
    image_path = sys.argv[1]
    
    # Extraire les caractéristiques
    descriptor = get_vgg_features(image_path)
    
    # Imprimer le descripteur en format JSON
    print(json.dumps(descriptor.tolist()))  # Convertir le tableau numpy en liste pour JSON
