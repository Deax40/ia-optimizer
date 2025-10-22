# Optimiseur Perf + SEO - Guide d'utilisation

Système complet d'administration des connexions et d'optimisation automatique pour Next.js 14.

## 🚀 Installation

```bash
# Installer les dépendances
pnpm install

# ou npm install
npm install
```

### Dépendances requises

Ajouter à votre `package.json` :

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zod": "^3.22.0",
    "ssh2": "^1.15.0",
    "simple-git": "^3.22.0",
    "sharp": "^0.33.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/ssh2": "^1.15.0",
    "tailwindcss": "^3.4.0",
    "lighthouse": "^11.0.0",
    "source-map-explorer": "^2.5.3"
  }
}
```

## ⚙️ Configuration

1. **Copier le fichier d'exemple**
```bash
cp .env.example .env
```

2. **Configurer les variables d'environnement**

Éditez `.env` :

```env
SITE_URL=https://www.votre-site.com
ALLOWED_HOSTS=votre-site.com,autre-domaine.fr
OPTIMIZE_BRANCH=chore/optimize-auto
PREFER_PR=true

LIGHTHOUSE_MIN_PERFORMANCE=90
LIGHTHOUSE_MIN_SEO=95
LIGHTHOUSE_MIN_ACCESSIBILITY=90
LIGHTHOUSE_MIN_BEST_PRACTICES=95

PROJECT_CONSTRAINTS="Conserver le design; pas de breaking change"
```

## 📁 Structure du projet

```
.
├── app/
│   ├── admin/connections/         # Panel d'administration
│   │   └── page.tsx
│   └── api/
│       ├── connections/           # API CRUD connexions
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── test/route.ts
│       └── optimize/              # API optimisation
│           └── route.ts
├── lib/
│   ├── crypto.ts                  # Chiffrement AES-GCM
│   ├── store.ts                   # Stockage fichier/mémoire
│   └── optimizer/
│       ├── index.ts               # Orchestrateur principal
│       ├── perf.ts                # Optimisations performance
│       ├── seo.ts                 # Optimisations SEO
│       └── audit.ts               # Lighthouse + Bundle analysis
├── data/
│   └── connections.enc.json       # Connexions chiffrées
└── .reports/                      # Rapports d'audit
```

## 🔐 Sécurité

### Chiffrement

- **Algorithme** : AES-GCM 256 bits
- **Dérivation** : PBKDF2 (150 000 itérations, SHA-256)
- **Stockage** : Blobs chiffrés uniquement (le serveur ne connaît jamais la clé)
- **Transport** : HTTPS obligatoire en production

### Protection des secrets

1. Le mot de passe maître **ne quitte jamais le navigateur**
2. Chiffrement/déchiffrement **100% côté client**
3. Validation des hosts autorisés (liste blanche)
4. Timeout des tests de connexion (10s max)

## 🎯 Utilisation

### 1. Accéder au panel d'administration

```
http://localhost:3000/admin/connections
```

### 2. Déverrouiller le coffre

- Entrez votre **mot de passe maître**
- Les connexions seront déchiffrées localement

### 3. Créer une connexion

**Git :**
- Label : "Mon Projet GitHub"
- Type : Git
- Repo URL : `https://github.com/user/repo.git`
- Branche : `main`

**SSH/SFTP :**
- Label : "Serveur Production"
- Type : SSH ou SFTP
- Host : `exemple.com`
- Port : `22`
- Username : `deploy`
- Auth : Mot de passe ou Clé privée

### 4. Tester la connexion

Cliquez sur l'icône 🧪 pour tester :
- **Git** : `git ls-remote` (read-only)
- **SSH** : connexion + `echo ok`
- **SFTP** : connexion + `ls /`

### 5. Lancer l'optimisation

1. Sélectionnez une connexion
2. Cliquez sur **"Lancer l'optimisation"**
3. Entrez l'URL du site
4. Le pipeline se lance automatiquement

### 6. Résultat

Le système va :
1. ✅ Cloner le dépôt ou télécharger les sources
2. ✅ Créer la branche `chore/optimize-auto`
3. ✅ Installer les dépendances
4. ✅ Appliquer les optimisations de performance
5. ✅ Appliquer les optimisations SEO
6. ✅ Linter et formatter le code
7. ✅ Builder le projet
8. ✅ Lancer Lighthouse (desktop + mobile)
9. ✅ Analyser les bundles
10. ✅ Commiter les changements
11. ✅ Créer une Pull Request (si `PREFER_PR=true`)

## 📊 Rapports générés

### Lighthouse
`.reports/lh-desktop-{timestamp}.json`
`.reports/lh-mobile-{timestamp}.json`

### Bundles
`.reports/bundles-{timestamp}.md`

### Exemple de rapport

```markdown
# Analyse des Bundles

**Taille totale:** 2.45 MB

## Top 10 des fichiers les plus lourds

| Fichier | Taille |
|---------|--------|
| .next/static/chunks/main.js | 487 KB |
| .next/static/chunks/framework.js | 324 KB |
...
```

## 🔧 API Endpoints

### GET /api/connections
Liste toutes les connexions (chiffrées)

```bash
curl http://localhost:3000/api/connections
```

### POST /api/connections
Crée ou met à jour une connexion

```bash
curl -X POST http://localhost:3000/api/connections \
  -H "Content-Type: application/json" \
  -d '{"encrypted": {...}}'
```

### DELETE /api/connections/:id
Supprime une connexion

```bash
curl -X DELETE http://localhost:3000/api/connections/conn_123
```

### POST /api/connections/:id/test
Teste une connexion

```bash
curl -X POST http://localhost:3000/api/connections/conn_123/test \
  -H "Content-Type: application/json" \
  -d '{"decryptedData": {...}}'
```

### POST /api/optimize
Lance l'optimisation

```bash
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_123",
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
  }'
```

## 🎨 Optimisations appliquées

### Performance
- ✅ Compression et minification (SWC)
- ✅ Images : `loading="lazy"`, `decoding="async"`, formats AVIF/WebP
- ✅ Fonts : `font-display: swap`, preconnect
- ✅ Code splitting automatique
- ✅ Headers de cache immutables pour assets
- ✅ Bundle analysis et tree-shaking
- ✅ CSS Purge (Tailwind)

### SEO
- ✅ Meta tags complets (title, description, keywords)
- ✅ Open Graph + Twitter Cards
- ✅ Canonical URLs
- ✅ robots.txt
- ✅ sitemap.xml dynamique
- ✅ Schema.org (JSON-LD) : WebSite, Organization, Breadcrumb, Article
- ✅ Alt texts pour images
- ✅ Hreflang (si i18n détecté)

## 🐛 Dépannage

### Le build échoue
Vérifier les logs dans le terminal. Les erreurs courantes :
- Dépendances manquantes : `pnpm install`
- Erreurs TypeScript : `pnpm run build` localement

### Lighthouse timeout
- Le site doit être accessible publiquement
- Augmenter le timeout dans `lib/optimizer/audit.ts`

### Connexion SSH refuse
- Vérifier les hosts autorisés dans `.env`
- Tester manuellement : `ssh user@host`

### Mot de passe incorrect
- Le mot de passe maître est sensible à la casse
- Impossible de récupérer si oublié (chiffrement AES-GCM)

## 📝 Notes importantes

1. **Aucun secret en clair** : jamais loggués, jamais stockés côté serveur
2. **Hosts autorisés** : défense en profondeur, liste blanche obligatoire
3. **Timeout** : tous les tests sont limités à 10s
4. **Nettoyage** : les répertoires de travail sont dans `/tmp`
5. **Commits atomiques** : perf, seo, chore séparés
6. **PR automatique** : via GitHub CLI si disponible

## 🚦 Commandes rapides

```bash
# Démarrer le serveur de dev
pnpm dev

# Builder pour production
pnpm build

# Démarrer en production
pnpm start

# Lancer Lighthouse manuellement
npx lighthouse https://www.exemple.com --view

# Analyser les bundles
ANALYZE=true pnpm build
```

## 📞 Support

Créer une issue sur le dépôt GitHub avec :
- Version de Node.js : `node -v`
- Version de Next.js : voir `package.json`
- Logs complets (masquer les secrets)

---

🤖 Généré avec Claude Code
