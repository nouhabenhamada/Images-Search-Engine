import os
import cv2
import numpy as np
from elasticsearch import Elasticsearch
import os
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from features_extraction import (
    extract_vgg_descriptor, 
    load_processed_images, 
    append_processed_image
)

def extract_and_store(images_directory, tags_directory, processed_file):
    processed_images = load_processed_images(processed_file)
    count = 0  # Compteur pour le nombre d'images traitées

    for folder in os.listdir(images_directory):
        folder_path = os.path.join(images_directory, folder)

        if os.path.isdir(folder_path):
            for image_file in os.listdir(folder_path):
                if image_file.endswith('.jpg') and image_file not in processed_images:
                    image_path = os.path.join(folder_path, image_file)

                    tag_file = image_file.replace('.jpg', '.txt')  
                    tag_folder_path = os.path.join(tags_directory, folder)
                    tag_path = os.path.join(tag_folder_path, tag_file)

                    try:
                        image = cv2.imread(image_path)
                        if image is None:
                            print(f"Erreur de chargement de l'image: {image_path}")
                            continue

                        vgg_descriptor = extract_vgg_descriptor(image_path)
                        print(f"VGG Descriptor pour {image_file}: {vgg_descriptor}")

                        if os.path.exists(tag_path):
                            with open(tag_path, 'r', encoding='utf-8') as file:
                                tags = file.read().strip().split('\n')
                        else:
                            print(f"Le fichier de tag {tag_path} n'existe pas.")
                            tags = []

                        doc = {
                            'image_name': image_file,
                            'vgg_descriptor': vgg_descriptor.tolist(),
                            'tags': tags,
                        }

                        es.index(index='image_descriptors', body=doc)
                        print(f"Données stockées pour {image_file}")

                        append_processed_image(processed_file, image_file)
                        count += 1  # Incrémenter le compteur

                    except Exception as e:
                        print(f"Erreur avec l'image {image_path}: {e}")

    return count  # Retourner le nombre total d'images traitées
es_user = os.getenv('ES_USER', 'elastic')  # Valeur par défaut 'elastic'
es_password = os.getenv('ES_PASSWORD')  # Assurez-vous de toujours définir cette variable dans votre .env
# Exemple d'utilisation
es = Elasticsearch(
    [{'host': 'localhost', 'port': 9200, 'scheme': 'http'}],
    basic_auth=(es_user, es_password)  # Remplacez par vos informations d'identification
)

images_directory = r"D:\images\images"  
tags_directory = r"C:\Users\YODA\Desktop\vgg\tags"  
processed_file = r"C:\Users\YODA\Desktop\vgg\processed_images.txt"  
number_of_images = extract_and_store(images_directory, tags_directory, processed_file)
print(f"Nombre total d'images traitées: {number_of_images}")


try:
    es.ping()
    print("Connexion à Elasticsearch réussie.")
except Exception as e:
    print(f"Erreur de connexion à Elasticsearch: {e}")
