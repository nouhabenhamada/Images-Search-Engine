import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
from skimage.feature import local_binary_pattern  
from keras.applications.vgg16 import VGG16, preprocess_input
from keras.models import Model
from skimage.feature import hog 

# ------------------------VGG16------------------
def load_image(filepath):
    image = cv2.imread(filepath)
    if image is None:
        raise ValueError(f"Image at {filepath} could not be loaded.")
    image = cv2.resize(image, (224, 224))  # Fixed resizing
    image = np.expand_dims(image, axis=0)  # Expand dims for model input
    image = preprocess_input(image)
    return image

def preprocess_image(image_path):
    img = load_image(image_path)
    return img

vgg_model = VGG16(weights='imagenet')
model = Model(inputs=vgg_model.input, outputs=vgg_model.get_layer('fc2').output)

def extract_vgg_descriptor(image_path):
    img = preprocess_image(image_path)
    features = model.predict(img)
    return features.flatten()
#--------------------------------------------------------------------------
# Fonction pour charger les images déjà traitées
def load_processed_images(processed_file):
    if os.path.exists(processed_file):
        with open(processed_file, 'r') as f:
            return set(line.strip() for line in f)
    return set()

# Fonction pour ajouter une image à la liste des images traitées
def append_processed_image(processed_file, image_file):
    with open(processed_file, 'a') as f:
        f.write(image_file + '\n')


#--------------------------Hog------------------
def extract_hog_descriptor(image_path):
    if not os.path.exists(image_path):
        print(f"Image non trouvée : {image_path}")
        return None
    
    # Charger l'image
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)  # Convertir en RGB
    
    # Redimensionner l'image à 128x128
    resized_img = cv2.resize(image, (128, 64))

    # Si l'image a plusieurs canaux (couleur), appliquer HOG sur chaque canal
    if len(resized_img.shape) == 3:  # Si l'image a 3 canaux (couleur)
        fd = []
        for channel in range(resized_img.shape[2]):
            fd_channel, hog_image = hog(resized_img[:, :, channel], orientations=9, pixels_per_cell=(8, 8),
                                        cells_per_block=(2, 2), visualize=True)
            fd.append(fd_channel)
        fd = np.ravel(fd)  # Aplatir la liste de descripteurs pour chaque canal
    else:  # Si l'image est en niveaux de gris
        fd, hog_image = hog(resized_img, orientations=9, pixels_per_cell=(8, 8),
                            cells_per_block=(2, 2), visualize=True)
    
    # Normaliser et retourner le descripteur aplati
    return cv2.normalize(fd, fd).flatten()

#--------------------------LBP----------------------
def extract_lbp_descriptor(image_path):
    if not os.path.exists(image_path):
        print(f"Image non trouvée : {image_path}")
        return None
    
    # Charger l'image
    print(f"Tentative de chargement de l'image : {image_path}")
    image = cv2.imread(image_path)

    # Vérifier si l'image a été chargée correctement
    if image is None:
        print(f"Erreur de chargement de l'image : {image_path}. Vérifiez le format et l'existence du fichier.")
        return None
    
    image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)  # Convertir en niveaux de gris

    # Redimensionner l'image à 128x128
    resized_img = cv2.resize(image, (128, 128))

    # Paramètres pour LBP
    radius = 2  # Rayon pour LBP
    n_points = 8 * radius  # Nombre de points
    lbp = local_binary_pattern(resized_img, n_points, radius, method="uniform")

    # Calculer l'histogramme LBP
    n_bins = int(lbp.max() + 1)
    hist, _ = np.histogram(lbp, bins=n_bins, range=(0, n_bins), density=True)

    # Normaliser l'histogramme
    hist /= hist.sum()

    return hist
