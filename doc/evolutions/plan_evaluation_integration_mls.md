# Plan d'Évaluation et d'Intégration Potentielle de MLS

Ce document décrit les étapes proposées pour évaluer la faisabilité et potentiellement intégrer le protocole Messaging Layer Security (MLS) dans l'application de messagerie chiffrée, en remplacement du protocole cryptographique actuel. L'objectif principal est d'améliorer la sécurité en ajoutant Forward Secrecy (FS) et Post-Compromise Security (PCS).

## Vue d'Ensemble du Plan

```mermaid
graph TD
    subgraph Phase 1: Recherche & Évaluation
        A[Identifier Libs MLS JS/WASM] --> B(Évaluer Maturité<br>- Conformité RFC 9420<br>- Activité Projet<br>- Docs/Exemples<br>- Sécurité/Audits<br>- Performance<br>- Intégration);
        B --> C{Rapport Comparatif};
    end

    subgraph Phase 2: Preuve de Concept (PoC)
        C --> D[Choisir Lib(s) Prometteuse(s)];
        D --> E[Implémenter Scénario Base<br>- Création Groupe<br>- Ajout/Retrait Membres<br>- Envoi/Réception Msgs<br>- Gestion État Client];
        E --> F[Analyser Défis & Perf];
        F --> G{Code PoC & Rapport Analyse};
    end

    subgraph Phase 3: Conception Architecture Cible
        G -- Si PoC Concluant --> H[Définir Rôle Serveur (DS)<br>- API/WS<br>- Stockage État Public Groupe];
        H --> I[Lier Identité Actuelle & MLS Credential];
        I --> J[Gérer Clé Privée MLS Client];
        J --> K[Adapter Flux Utilisateur];
        K --> L[Concevoir Structures Données];
        L --> L_FS[**Concevoir Vue "Système Fichiers"<br>& Sécurisation via MLS**];
        L_FS --> M[MàJ Diagramme Architecture];
        M --> N{Document Conception Détaillé};
    end

    subgraph Phase 4: Planification Implémentation
        N -- Si Conception Validée --> O[Découper en Étapes];
        O --> P[Estimer Efforts];
        P --> Q[Identifier Risques];
        Q --> R[Définir Stratégie Tests];
        R --> S{Plan Implémentation Détaillé};
    end

    subgraph Phase 5: Implémentation
        S -- Si Plan Approuvé --> T[Passer en Mode Code];
        T --> U[Implémenter MLS];
    end

    style Phase 1 fill:#ECECFF,stroke:#999,stroke-width:2px
    style Phase 2 fill:#E0FFE0,stroke:#999,stroke-width:2px
    style Phase 3 fill:#FFF2CC,stroke:#999,stroke-width:2px
    style Phase 4 fill:#FFE6CC,stroke:#999,stroke-width:2px
    style Phase 5 fill:#FFD6CC,stroke:#999,stroke-width:2px
```

## Détail des Phases

### Phase 1 : Recherche et Évaluation des Bibliothèques MLS JS/WASM

*   **Objectif :** Identifier et comparer les options disponibles pour implémenter MLS côté client.
*   **Actions Réalisées :**
    *   Identification des principaux candidats : `openmls-wasm` (bindings WASM pour `openmls` en Rust) et `mls-js` (implémentation native JS/TS).
    *   Analyse préliminaire des forces et faiblesses de chaque candidat basée sur les critères d'évaluation (Conformité RFC, Maturité, Sécurité, Performance, Intégration).
*   **Livrable (Synthèse de l'évaluation) :**

    | Critère             | `openmls-wasm` (Potentiel)                     | `mls-js` (Potentiel)                             |
    | :------------------ | :--------------------------------------------- | :----------------------------------------------- |
    | **Conformité RFC**  | Élevée (via `openmls` Rust)                    | À vérifier attentivement                         |
    | **Maturité/Activité** | Élevée (Rust), Moyenne/Inconnue (WASM Bind) | Inconnue/À vérifier                              |
    | **Sécurité**        | Bonne (Rust), WASM à vérifier                  | **Risque potentiellement plus élevé (JS natif)** |
    | **Performance**     | Probablement Élevée (WASM)                     | Probablement Moyenne (JS natif)                  |
    | **Intégration**     | Potentiellement plus complexe (WASM API)       | Potentiellement plus simple (JS API)             |
    | **Taille Bundle**   | Potentiellement plus grand (WASM)              | Potentiellement plus petit (JS)                  |

*   **Conclusion Phase 1 :** `openmls-wasm` est recommandé comme candidat principal pour la Phase 2 (PoC) en raison de sa base Rust sécurisée et conforme au standard, sous réserve de la maturité de ses bindings WASM. `mls-js` est une alternative si `openmls-wasm` présente des difficultés majeures.

### Phase 2 : Preuve de Concept (PoC)

*   **Objectif :** Valider la faisabilité technique de l'utilisation d'une bibliothèque MLS (priorité : `openmls-wasm`) pour les opérations de base et identifier les principaux défis.
*   **Actions :** Sélectionner la bibliothèque (`openmls-wasm` en priorité). Créer un petit projet test (ou une branche isolée) pour implémenter la création de groupe, la gestion des membres et l'échange de messages simples via MLS. Mesurer l'impact sur la taille du bundle et les performances.
*   **Livrable :** Le code source du PoC et un rapport détaillant les succès, les difficultés rencontrées, et les premières estimations de performance.

### Phase 3 : Conception de l'Architecture Cible

*   **Objectif :** Définir précisément comment MLS s'intégrerait dans votre architecture client-serveur existante et comment sécuriser des fonctionnalités avancées comme la vue "système de fichiers".
*   **Actions :**
    *   Réfléchir aux modifications nécessaires côté backend (FastAPI) pour agir comme Service de Livraison MLS.
    *   Définir la gestion des identités et des clés MLS côté client.
    *   Adapter les flux fonctionnels (API, WebSocket, UI) pour la messagerie de base.
    *   **Spécifier comment la structure de données et les messages de synchronisation pour la vue "système de fichiers" seraient conçus et sécurisés par les messages MLS.**
    *   Mettre à jour les schémas de données et le diagramme d'architecture global.
*   **Livrable :** Un document de spécifications techniques détaillant la nouvelle architecture, les modifications API/WebSocket, les schémas de données (y compris pour la vue fichiers), et un diagramme d'architecture mis à jour.

### Phase 4 : Planification de l'Implémentation

*   **Objectif :** Préparer le travail d'implémentation si les phases précédentes sont concluantes.
*   **Actions :** Décomposer le travail en tâches spécifiques, estimer la charge, identifier les dépendances et les risques potentiels (ex: bugs dans la bibliothèque MLS choisie), et définir comment tester l'implémentation.
*   **Livrable :** Un plan d'implémentation détaillé avec un découpage en lots, des estimations et une stratégie de test.

### Phase 5 : Implémentation

*   **Objectif :** Réaliser les modifications techniques pour intégrer MLS.
*   **Actions :** Écriture du code côté client et serveur, tests unitaires et d'intégration.
*   **Livrable :** Le code fonctionnel intégrant MLS.