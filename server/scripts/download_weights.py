import os
import requests

def download_file(url, filename):
    try:
        # Créer le dossier model_weights s'il n'existe pas
        os.makedirs('./model_weights', exist_ok=True)
        
        # Chemin complet du fichier
        filepath = os.path.join('./model_weights', filename)
        
        # Télécharger seulement si le fichier n'existe pas
        if not os.path.exists(filepath):
            print(f"Downloading weights to {filepath}...")
            response = requests.get(url, stream=True)
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            print("Download completed!")
        else:
            print("Weights file already exists.")
        return filepath
    except Exception as e:
        print(f"Error downloading weights: {str(e)}")
        return None

if __name__ == "__main__":
    url = "https://storage.googleapis.com/tensorflow/keras-applications/vgg16/vgg16_weights_tf_dim_ordering_tf_kernels_notop.h5"
    weights_path = download_file(url, "vgg16_weights.h5")
    if weights_path:
        print(f"Weights file located at: {weights_path}")