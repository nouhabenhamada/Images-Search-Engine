from elasticsearch import Elasticsearch


es = Elasticsearch(
    [{'host': 'localhost', 'port': 9200, 'scheme': 'http'}],
    http_auth=('elastic', 'q0K-+NHh_x+5*8FRTgBX')  # Remplacez par vos informations d'identification
)

# Définir le mapping pour l'index
index_name = 'image_descriptors'
mapping = {
    "mappings": {
        "properties": {
            "image_name": {
                "type": "text"
            },
            "vgg_descriptor": {
                "type": "dense_vector",
                "dims": 4096  # Dimension pour le descripteur VGG
            },
            "hog_descriptor": {
                "type": "dense_vector",
                "dims": 4096  # Dimension pour le descripteur HOG
            },
            "lbp_descriptor": {
                "type": "dense_vector",
                "dims": 18  # Dimension pour le descripteur LBP
            },
            "tags": {
                "type": "keyword"  # Utilisé pour les tags
            }
        }
    }
}

# Créer l'index avec le mapping
if not es.indices.exists(index=index_name):
    es.indices.create(index=index_name, body=mapping)
    print(f"L'index '{index_name}' a été créé.")
else:
    print(f"L'index '{index_name}' existe déjà.")
