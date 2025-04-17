# backend/main.py
# Ce fichier sert de point d'entrée pour Uvicorn.
# Il importe l'instance 'app' configurée depuis backend/app/main.py

from app.main import app  # noqa: F401

# Uvicorn utilisera cette instance 'app' lorsqu'il sera lancé avec 'backend.main:app'
# La configuration, l'initialisation de la DB et l'inclusion des routeurs
# sont gérées dans app/main.py
