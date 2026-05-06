# AI Recruitment Assistant

Ce document ancre le projet `AI Recruitment Assistant` dans le monorepo Sage RH sans coupler directement la recherche IA au code applicatif.

## Positionnement

- Le module cible est une extension future de `Gestion de Carriere`.
- La phase actuelle couvre la recherche et l'industrialisation des notebooks Kaggle.
- Le pipeline est `CV -> extraction -> normalisation -> matching -> reranking -> score RH -> explication RH`.

## Arborescence ajoutee

- `research/ai-recruitment-assistant/README.md`
- `research/ai-recruitment-assistant/requirements-kaggle.txt`
- `research/ai-recruitment-assistant/config/dataset_registry.json`
- `research/ai-recruitment-assistant/config/notebook_dataset_map.json`
- `research/ai-recruitment-assistant/config/output_contracts.json`
- `research/ai-recruitment-assistant/notebooks/*.ipynb`

## Contrat d'integration

Les notebooks doivent produire des artefacts portables qui pourront ensuite etre consommes par le backend Spring Boot :

- `parsed_resume.json`
- `job_analysis.json`
- `candidate_ranking.json`
- `candidate_score_details.json`
- `candidate_explanations.json`

## Regles de travail

- Les notebooks restent independants du frontend et du backend.
- Les datasets externes sont references dans `dataset_registry.json`.
- Les schemas de sortie sont figes dans `output_contracts.json`.
- Toute evolution future du pipeline doit conserver les noms de sorties deja etablis.
