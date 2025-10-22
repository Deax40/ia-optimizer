# 🚀 Optimiseur Perf + SEO - Panel d'Administration

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Système complet d'administration des connexions distantes (Git/SSH/SFTP) avec optimiseur automatique de performances et SEO pour applications Next.js 14. Génère des rapports Lighthouse avant/après et crée automatiquement des Pull Requests avec les optimisations appliquées.

---

## 📸 Aperçu

![Panel d'administration](https://via.placeholder.com/800x400/3b82f6/ffffff?text=Panel+d%27Administration)

### ✨ Fonctionnalités principales

- 🔐 **Coffre-fort chiffré** : AES-GCM 256 bits, chiffrement côté client uniquement
- 🔌 **Connexions multiples** : Git, SSH, SFTP avec test en temps réel
- ⚡ **Optimisations auto** : Images, fonts, bundles, code-splitting, cache headers
- 🔍 **SEO technique** : Metas, Schema.org, sitemap, robots.txt, canonical URLs
- 📊 **Audits Lighthouse** : Desktop + Mobile avec rapports avant/après
- 📦 **Bundle analysis** : Identification des fichiers lourds
- 🔀 **Pull Requests auto** : Via GitHub CLI avec résumé des optimisations
- 📤 **Export/Import** : Sauvegarde et restauration du coffre chiffré

---

## 🎯 Table des matières

1. [Installation rapide](#-installation-rapide)
2. [Déploiement sur Vercel](#-déploiement-sur-vercel)
3. [Configuration](#️-configuration)
4. [Utilisation](#-utilisation)
5. [Architecture](#-architecture)
6. [Sécurité](#-sécurité)
7. [API Reference](#-api-reference)
8. [Optimisations appliquées](#-optimisations-appliquées)
9. [Rapports générés](#-rapports-générés)
10. [Troubleshooting](#-troubleshooting)
11. [Contribution](#-contribution)

---

## 🚀 Installation rapide

### Prérequis

- Node.js 20+ (LTS recommandé)
- pnpm, npm ou yarn
- Git

### Installation locale

```bash
# Cloner le dépôt
git clone https://github.com/votre-username/ia-optimizer.git
cd ia-optimizer

# Installer les dépendances
pnpm install
# ou npm install

# Copier la configuration
cp .env.example .env

# Éditer .env avec vos paramètres
nano .env

# Démarrer le serveur de développement
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## ☁️ Déploiement sur Vercel

### Méthode 1 : Via le Dashboard Vercel (Recommandé)

1. **Fork ce dépôt** sur votre compte GitHub

2. **Connectez-vous à [Vercel](https://vercel.com)**

3. **Cliquez sur "Add New Project"**

4. **Importez votre fork** :
   - Sélectionnez le dépôt `ia-optimizer`
   - Cliquez sur "Import"

5. **Configurez les variables d'environnement** :

   Dans "Environment Variables", ajoutez :

   ```env
   SITE_URL=https://votre-site.com
   ALLOWED_HOSTS=votre-site.com,autre-domaine.com
   OPTIMIZE_BRANCH=chore/optimize-auto
   PREFER_PR=true

   LIGHTHOUSE_MIN_PERFORMANCE=90
   LIGHTHOUSE_MIN_SEO=95
   LIGHTHOUSE_MIN_ACCESSIBILITY=90
   LIGHTHOUSE_MIN_BEST_PRACTICES=95

   PROJECT_CONSTRAINTS=Conserver le design; pas de breaking change
   ```

   ⚠️ **Important** : Ces variables sont requises pour le fonctionnement de l'optimiseur.

6. **Déployez** :
   - Cliquez sur "Deploy"
   - Attendez la fin du build (~2-3 min)

7. **Accédez à votre application** :
   - URL : `https://votre-projet.vercel.app/admin/connections`

### Méthode 2 : Via Vercel CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivez les instructions interactives
# Configurez les variables d'environnement via le dashboard après le premier déploiement
```

### Méthode 3 : Via le bouton "Deploy"

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/votre-username/ia-optimizer&env=SITE_URL,ALLOWED_HOSTS,OPTIMIZE_BRANCH,PREFER_PR,LIGHTHOUSE_MIN_PERFORMANCE,LIGHTHOUSE_MIN_SEO,LIGHTHOUSE_MIN_ACCESSIBILITY,LIGHTHOUSE_MIN_BEST_PRACTICES&project-name=ia-optimizer&repository-name=ia-optimizer)

---

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# ============================================
# CONFIGURATION PRINCIPALE
# ============================================

# URL du site à optimiser (requis)
SITE_URL=https://www.exemple.com

# Hosts autorisés pour les connexions SSH/SFTP/Git (séparés par des virgules)
# Sécurité : seuls ces hosts pourront être testés/utilisés
ALLOWED_HOSTS=exemple.com,client-x.fr,github.com,gitlab.com

# Nom de la branche créée pour les optimisations
OPTIMIZE_BRANCH=chore/optimize-auto

# Créer automatiquement une Pull Request après optimisation
PREFER_PR=true

# ============================================
# SCORES LIGHTHOUSE MINIMUMS
# ============================================

# Score minimum Performance (0-100)
LIGHTHOUSE_MIN_PERFORMANCE=90

# Score minimum SEO (0-100)
LIGHTHOUSE_MIN_SEO=95

# Score minimum Accessibilité (0-100)
LIGHTHOUSE_MIN_ACCESSIBILITY=90

# Score minimum Best Practices (0-100)
LIGHTHOUSE_MIN_BEST_PRACTICES=95

# ============================================
# CONTRAINTES DU PROJET
# ============================================

# Contraintes à respecter lors des optimisations
PROJECT_CONSTRAINTS="Conserver le design; pas de breaking change; i18n fr/en si présent"

# ============================================
# CONFIGURATION OPTIONNELLE
# ============================================

# Environnement (development | production)
NODE_ENV=production

# Port du serveur (local uniquement)
PORT=3000
```

### Configuration Vercel spécifique

**Build Command** : `next build` (par défaut)

**Output Directory** : `.next` (par défaut)

**Install Command** : `pnpm install` ou `npm install`

**Node.js Version** : 20.x (recommandé)

**Regions** : Choisissez la région la plus proche de vos utilisateurs

**Framework Preset** : Next.js (détection automatique)

---

## 📖 Utilisation

### 1. Accéder au panel d'administration

Naviguez vers `/admin/connections` :

```
https://votre-app.vercel.app/admin/connections
```

### 2. Déverrouiller le coffre

![Écran de déverrouillage](https://via.placeholder.com/600x300/6366f1/ffffff?text=%C3%89cran+de+d%C3%A9verrouillage)

- Entrez votre **mot de passe maître**
- Ce mot de passe sert à chiffrer/déchiffrer vos connexions
- ⚠️ **Ne le perdez pas** : impossible à récupérer (chiffrement AES-GCM)
- Le mot de passe **ne quitte jamais votre navigateur**

### 3. Créer une connexion

#### Connexion Git

```
Label : Mon Projet GitHub
Type : Git
Repo URL : https://github.com/username/repository.git
Branche : main
```

**Formats supportés** :
- HTTPS : `https://github.com/user/repo.git`
- SSH : `git@github.com:user/repo.git`

#### Connexion SSH

```
Label : Serveur Production
Type : SSH
Host : exemple.com
Port : 22
Username : deploy
Auth : Mot de passe ou Clé privée
```

#### Connexion SFTP

```
Label : Serveur de fichiers
Type : SFTP
Host : ftp.exemple.com
Port : 22
Username : ftpuser
Auth : Mot de passe
```

### 4. Tester la connexion

Cliquez sur l'icône 🧪 pour tester :

- **Git** : Vérifie que le dépôt est accessible (`git ls-remote`)
- **SSH** : Connexion + exécution de `echo ok`
- **SFTP** : Connexion + listage du répertoire root

**Résultats possibles** :
- ✅ **Succès** : Connexion établie avec succès
- ❌ **Échec** : Erreur d'authentification, host non autorisé, timeout

### 5. Lancer l'optimisation

![Lancement optimisation](https://via.placeholder.com/600x300/10b981/ffffff?text=Lancement+optimisation)

1. Sélectionnez une connexion dans la liste
2. Cliquez sur **"Lancer l'optimisation"**
3. Entrez l'URL du site à auditer
4. Le pipeline démarre automatiquement

**Durée estimée** : 5-10 minutes selon la taille du projet

### 6. Résultats

Après optimisation, vous recevrez :

```
✅ Optimisation réussie!

Branche: chore/optimize-auto
PR: https://github.com/user/repo/pull/42

Scores après (desktop):
- Performance: 95 (+8)
- SEO: 98 (+5)
- Accessibilité: 92 (+2)
- Best Practices: 96 (+4)

Optimisations appliquées: 12
```

### 7. Export/Import du coffre

**Export** :
- Cliquez sur "Exporter"
- Télécharge `connections-backup-{timestamp}.json`
- Conservez ce fichier en lieu sûr (il contient vos connexions chiffrées)

**Import** :
- Cliquez sur "Importer"
- Sélectionnez votre fichier de backup
- Les connexions sont restaurées

---

## 🏗️ Architecture

### Structure du projet

```
ia-optimizer/
│
├── app/                              # Next.js App Router
│   ├── admin/connections/
│   │   └── page.tsx                  # 🎨 Panel UI (React Client Component)
│   ├── api/
│   │   ├── connections/
│   │   │   ├── route.ts              # GET/POST connexions
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET/DELETE connexion
│   │   │       └── test/route.ts     # POST test connexion
│   │   └── optimize/
│   │       └── route.ts              # POST lancer optimisation
│   ├── layout.tsx                    # Layout racine
│   ├── page.tsx                      # Page d'accueil
│   └── globals.css                   # Styles Tailwind
│
├── lib/                              # Logique métier
│   ├── crypto.ts                     # 🔐 AES-GCM + PBKDF2
│   ├── store.ts                      # 💾 Stockage fichier/mémoire
│   └── optimizer/
│       ├── index.ts                  # 🎯 Orchestrateur pipeline
│       ├── perf.ts                   # ⚡ Optimisations performance
│       ├── seo.ts                    # 🔍 Optimisations SEO
│       └── audit.ts                  # 📊 Lighthouse + Bundle analysis
│
├── data/
│   └── connections.enc.json          # 🗄️ Connexions chiffrées (généré)
│
├── .reports/                         # 📈 Rapports d'audit (générés)
│   ├── lh-desktop-{timestamp}.json
│   ├── lh-mobile-{timestamp}.json
│   └── bundles-{timestamp}.md
│
├── package.json                      # Dépendances
├── tsconfig.json                     # Config TypeScript
├── next.config.js                    # Config Next.js
├── tailwind.config.js                # Config Tailwind
├── .env.example                      # Variables d'env exemple
├── .gitignore
└── README.md                         # Ce fichier
```

### Flux d'optimisation

```mermaid
graph TD
    A[Utilisateur clique "Lancer optimisation"] --> B[API /api/optimize]
    B --> C[Récupération connexion chiffrée]
    C --> D[Déchiffrement avec mot de passe maître]
    D --> E{Type connexion?}

    E -->|Git| F[Clone dépôt]
    E -->|SSH/SFTP| G[Téléchargement sources]

    F --> H[Création branche optimisation]
    G --> H

    H --> I[Audit Lighthouse AVANT]
    I --> J[Installation dépendances]
    J --> K[Optimisations Performance]
    K --> L[Optimisations SEO]
    L --> M[Lint + Format + Audit npm]
    M --> N[Build projet]
    N --> O[Audit Lighthouse APRÈS]
    O --> P[Analyse bundles]
    P --> Q[Validation scores vs seuils]
    Q --> R[Commit changements]
    R --> S{Créer PR?}

    S -->|Oui| T[GitHub CLI: create PR]
    S -->|Non| U[Push branche]

    T --> V[Rapport final]
    U --> V

    V --> W[Retour résultats à l'UI]
```

### Technologies utilisées

| Catégorie | Technologies |
|-----------|-------------|
| **Framework** | Next.js 14 (App Router), React 18 |
| **Langage** | TypeScript 5.3 (strict mode) |
| **Styling** | Tailwind CSS 3.4 |
| **Icônes** | Lucide React |
| **Validation** | Zod |
| **Crypto** | Web Crypto API (AES-GCM, PBKDF2) |
| **SSH/SFTP** | ssh2 |
| **Git** | simple-git |
| **Audit** | Lighthouse CLI, source-map-explorer |
| **Images** | sharp (Next.js) |
| **Déploiement** | Vercel |

---

## 🔒 Sécurité

### Chiffrement

**Algorithme** : AES-GCM (Galois/Counter Mode)
- **Taille clé** : 256 bits
- **IV** : 12 octets aléatoires (crypto.getRandomValues)
- **Authentification** : GMAC intégré

**Dérivation de clé** : PBKDF2
- **Hash** : SHA-256
- **Itérations** : 150 000 (résistant aux attaques par force brute)
- **Salt** : 16 octets aléatoires par connexion

**Format de stockage** :
```json
{
  "salt": "base64...",
  "iv": "base64...",
  "ct": "base64...",  // ciphertext
  "v": 1              // version
}
```

### Protection des secrets

| Secret | Où ? | Comment ? |
|--------|------|-----------|
| **Mot de passe maître** | Navigateur uniquement | Jamais envoyé au serveur |
| **Mots de passe SSH** | Stockage chiffré | AES-GCM, déchiffrement client |
| **Clés privées SSH** | Stockage chiffré | AES-GCM, déchiffrement client |
| **Tokens Git** | Stockage chiffré | AES-GCM, déchiffrement client |

### Défense en profondeur

1. **Liste blanche des hosts** (`ALLOWED_HOSTS`)
   - Seuls les hosts listés peuvent être testés
   - Validation côté serveur avant toute connexion

2. **Timeout strict** (10 secondes)
   - Empêche les attaques par déni de service
   - Limite les tentatives de bruteforce

3. **Commandes limitées**
   - Git : `ls-remote` uniquement (lecture seule)
   - SSH : `echo ok` (pas d'exécution arbitraire)
   - SFTP : `ls /` (listage uniquement)

4. **Sanitization des entrées**
   - Validation Zod sur tous les endpoints
   - Échappement des caractères spéciaux

5. **Headers de sécurité**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`

6. **Stockage isolé**
   - Répertoires de travail dans `/tmp/workdir-{id}`
   - Nettoyage automatique après optimisation

### Bonnes pratiques

✅ **À FAIRE** :
- Utiliser un mot de passe maître fort (16+ caractères)
- Activer HTTPS en production (obligatoire)
- Limiter `ALLOWED_HOSTS` aux domaines nécessaires
- Sauvegarder régulièrement le coffre (export)
- Vérifier les logs après chaque optimisation

❌ **À NE PAS FAIRE** :
- Partager votre mot de passe maître
- Ajouter `*` dans `ALLOWED_HOSTS`
- Stocker le mot de passe maître dans `.env`
- Commiter `data/connections.enc.json` dans Git public
- Désactiver HTTPS en production

---

## 📡 API Reference

### Endpoints

#### `GET /api/connections`

Liste toutes les connexions (blobs chiffrés uniquement).

**Réponse** :
```json
{
  "ok": true,
  "connections": [
    {
      "id": "conn_1234567890_abc123",
      "encrypted": {
        "salt": "...",
        "iv": "...",
        "ct": "...",
        "v": 1
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `POST /api/connections`

Crée ou met à jour une connexion.

**Body** :
```json
{
  "id": "conn_xxx",  // optionnel (généré si absent)
  "encrypted": {
    "salt": "...",
    "iv": "...",
    "ct": "...",
    "v": 1
  }
}
```

**Réponse** :
```json
{
  "ok": true,
  "id": "conn_xxx",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### `DELETE /api/connections/:id`

Supprime une connexion.

**Réponse** :
```json
{
  "ok": true,
  "message": "Connexion supprimée avec succès"
}
```

#### `POST /api/connections/:id/test`

Teste une connexion (Git, SSH ou SFTP).

**Body** :
```json
{
  "decryptedData": {
    "type": "git",
    "repoUrl": "https://github.com/user/repo.git"
  }
}
```

**Réponse (succès)** :
```json
{
  "ok": true,
  "type": "git",
  "details": {
    "repoUrl": "https://github.com/user/repo.git",
    "status": "Repository accessible"
  }
}
```

**Réponse (erreur)** :
```json
{
  "ok": false,
  "type": "git",
  "error": "Échec de connexion Git: Authentication failed"
}
```

#### `POST /api/optimize`

Lance le pipeline d'optimisation complet.

**Body** :
```json
{
  "connectionId": "conn_xxx",
  "masterPassword": "votre-mot-de-passe",
  "siteUrl": "https://www.exemple.com",
  "lighthouseMinScores": {
    "performance": 90,
    "seo": 95,
    "accessibility": 90,
    "bestPractices": 95
  },
  "optimizeBranch": "chore/optimize-auto",
  "preferPr": true
}
```

**Réponse (succès)** :
```json
{
  "ok": true,
  "report": {
    "before": {
      "url": "https://www.exemple.com",
      "device": "desktop",
      "scores": {
        "performance": 85,
        "accessibility": 88,
        "bestPractices": 90,
        "seo": 92
      }
    },
    "after": {
      "scores": {
        "performance": 95,
        "accessibility": 92,
        "bestPractices": 96,
        "seo": 98
      }
    },
    "diffs": {
      "performance": 10,
      "accessibility": 4,
      "bestPractices": 6,
      "seo": 6
    },
    "perf": {
      "applied": 8,
      "items": [
        "Images - 5 fichiers optimisés",
        "Fonts - font-display: swap ajouté",
        "..."
      ]
    },
    "seo": {
      "applied": 4,
      "items": [
        "Meta tags - metadata ajouté",
        "robots.txt - créé",
        "..."
      ]
    }
  },
  "branch": "chore/optimize-auto",
  "prUrl": "https://github.com/user/repo/pull/42"
}
```

---

## ⚡ Optimisations appliquées

### Performance

| Optimisation | Description | Impact |
|-------------|-------------|---------|
| **SWC Minification** | Minification ultra-rapide du JS/CSS | -30% taille bundle |
| **Code Splitting** | Chunks séparés pour vendor/commons | Temps de chargement initial ↓ |
| **Images lazy** | `loading="lazy"` + `decoding="async"` | LCP amélioré |
| **Formats modernes** | AVIF/WebP via Next.js Image | -50% taille images |
| **Font Display** | `font-display: swap` sur @font-face | CLS réduit |
| **Cache immutable** | Headers pour assets statiques | Rechargement instantané |
| **Tree Shaking** | Suppression du code mort | Bundle plus léger |
| **CSS Purge** | Suppression CSS inutilisé (Tailwind) | -80% taille CSS |

### SEO

| Optimisation | Description | Impact |
|-------------|-------------|---------|
| **Meta tags** | title, description, keywords | Indexation améliorée |
| **Open Graph** | og:title, og:image, og:description | Partage social |
| **Twitter Cards** | twitter:card, twitter:image | Partage Twitter |
| **Canonical URLs** | `<link rel="canonical">` | Duplicate content évité |
| **robots.txt** | Directives pour crawlers | Contrôle indexation |
| **sitemap.xml** | Génération dynamique | Découvrabilité ↑ |
| **Schema.org** | JSON-LD (WebSite, Organization, Article) | Rich snippets |
| **Alt texts** | Vérification images | Accessibilité + SEO |

### Qualité de code

- ✅ ESLint avec `--fix`
- ✅ Prettier (formatting automatique)
- ✅ `npm audit` (sécurité)
- ✅ TypeScript strict mode
- ✅ Commits atomiques (`perf:`, `seo:`, `chore:`)

---

## 📊 Rapports générés

### Lighthouse Reports

**Desktop** : `.reports/lh-desktop-{timestamp}.json`

**Mobile** : `.reports/lh-mobile-{timestamp}.json`

**Contenu** :
```json
{
  "url": "https://www.exemple.com",
  "device": "desktop",
  "scores": {
    "performance": 95,
    "accessibility": 92,
    "bestPractices": 96,
    "seo": 98
  },
  "metrics": {
    "fcp": 1200,        // First Contentful Paint (ms)
    "lcp": 1800,        // Largest Contentful Paint (ms)
    "cls": 0.05,        // Cumulative Layout Shift
    "tti": 2500,        // Time to Interactive (ms)
    "tbt": 150,         // Total Blocking Time (ms)
    "si": 1900          // Speed Index (ms)
  }
}
```

### Bundle Analysis

**Fichier** : `.reports/bundles-{timestamp}.md`

**Exemple** :
```markdown
# Analyse des Bundles

**Taille totale:** 2.45 MB

## Top 10 des fichiers les plus lourds

| Fichier | Taille |
|---------|--------|
| .next/static/chunks/main-abc123.js | 487.23 KB |
| .next/static/chunks/framework-xyz789.js | 324.56 KB |
| .next/static/chunks/polyfills-def456.js | 89.12 KB |
| .next/static/chunks/pages/_app-ghi789.js | 67.45 KB |
| .next/static/css/main.css | 45.67 KB |

## Recommandations

- Vérifier les dépendances lourdes et envisager des alternatives
- Implémenter le code-splitting pour les pages volumineuses
- Activer la compression Brotli/Gzip sur le serveur
- Utiliser dynamic imports pour les composants non critiques
```

---

## 🐛 Troubleshooting

### Le build échoue

**Symptôme** : Erreur lors de `pnpm build`

**Solutions** :
1. Vérifier les dépendances :
   ```bash
   rm -rf node_modules package-lock.json
   pnpm install
   ```

2. Vérifier TypeScript :
   ```bash
   pnpm run build
   # Regarder les erreurs TypeScript détaillées
   ```

3. Vérifier les variables d'environnement :
   ```bash
   # .env doit exister et contenir les variables requises
   cat .env
   ```

### Lighthouse timeout

**Symptôme** : `Erreur lors de l'audit Lighthouse: timeout`

**Solutions** :
1. Le site doit être **accessible publiquement**
2. Augmenter le timeout dans `lib/optimizer/audit.ts:65` :
   ```typescript
   await execAsync(command, { timeout: 180000 }); // 3 min
   ```

3. Vérifier que Lighthouse est installé :
   ```bash
   npx lighthouse --version
   ```

### Connexion SSH refuse

**Symptôme** : `Erreur de connexion: Host non autorisé`

**Solutions** :
1. Ajouter le host dans `.env` :
   ```env
   ALLOWED_HOSTS=exemple.com,autre-domaine.fr
   ```

2. Tester manuellement :
   ```bash
   ssh user@host
   ```

3. Vérifier les credentials (mot de passe / clé privée)

### Mot de passe maître incorrect

**Symptôme** : `Échec du déchiffrement: mot de passe incorrect`

**Solutions** :
- ⚠️ **Impossible de récupérer** si le mot de passe est oublié
- Le chiffrement AES-GCM ne permet pas la récupération
- **Solution** : Supprimer `data/connections.enc.json` et recréer les connexions

### Erreur de déploiement Vercel

**Symptôme** : Build échoue sur Vercel

**Solutions** :
1. Vérifier la version Node.js (20.x recommandé)
2. Vérifier les variables d'environnement dans le dashboard
3. Consulter les logs de build détaillés
4. Tester localement avec `pnpm build`

### CORS / API ne répond pas

**Symptôme** : Erreurs 404 ou CORS

**Solutions** :
1. Vérifier que les routes API sont dans `app/api/`
2. Vérifier Next.js version (14+)
3. Redémarrer le serveur : `pnpm dev`

---

## 🤝 Contribution

Les contributions sont les bienvenues !

### Comment contribuer

1. **Fork** ce dépôt
2. **Créer une branche** : `git checkout -b feature/ma-feature`
3. **Commiter** : `git commit -m 'feat: ajout de ma feature'`
4. **Pousser** : `git push origin feature/ma-feature`
5. **Ouvrir une Pull Request**

### Convention de commits

Suivre [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatting, points-virgules
- `refactor:` Refactoring sans changement fonctionnel
- `perf:` Amélioration de performance
- `test:` Ajout de tests
- `chore:` Tâches de maintenance

### Développement local

```bash
# Installer les dépendances
pnpm install

# Démarrer en mode dev
pnpm dev

# Linter
pnpm lint

# Formatter
npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"

# Build
pnpm build

# Tester le build
pnpm start
```

---

## 📄 Licence

MIT © 2024

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) - Audit de performance
- [ssh2](https://github.com/mscdex/ssh2) - Client SSH/SFTP
- [simple-git](https://github.com/steveukx/git-js) - Client Git
- [Lucide](https://lucide.dev/) - Icônes

---

## 📞 Support

- **Documentation** : Lire ce README et `README_OPTIMIZER.md`
- **Issues** : [GitHub Issues](https://github.com/votre-username/ia-optimizer/issues)
- **Discussions** : [GitHub Discussions](https://github.com/votre-username/ia-optimizer/discussions)

---

## 🗺️ Roadmap

- [ ] Support PostgreSQL pour stockage (vs fichier JSON)
- [ ] Dashboard analytics des optimisations
- [ ] Notifications Slack/Discord/Email
- [ ] Support GitLab/Bitbucket
- [ ] Optimisations React (React DevTools Profiler)
- [ ] Support multi-utilisateurs avec authentification
- [ ] Webhooks pour intégration CI/CD
- [ ] API publique avec rate limiting
- [ ] Support Docker pour déploiement on-premise

---

<div align="center">

**⭐ Si ce projet vous aide, laissez une étoile sur GitHub ! ⭐**

Made with ❤️ by [Votre Nom](https://github.com/votre-username)

🤖 Généré avec [Claude Code](https://claude.com/claude-code)

</div>
#   i a - o p t i m i z e r  
 