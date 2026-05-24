# MVM — Collecte des données prédicateurs

Application web de gestion des fiches prédicateurs MVM.

## Stack
- **Frontend** : React 18 (port 3000)
- **Backend** : Node.js + Express + SQLite (port 5000)

---

## Installation

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Le backend démarre sur **http://localhost:5000**  
La base de données `mvm.db` est créée automatiquement au premier démarrage.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Le frontend démarre sur **http://localhost:3000**

---

## Comptes par défaut

| Identifiant   | Mot de passe | Rôle        | Droits                          |
|---------------|--------------|-------------|---------------------------------|
| `superadmin`  | `admin123`   | Super Admin | Tout (valider, éditer, supprimer) |
| `secretaire`  | `sec123`     | Secrétaire  | Valider, éditer                 |
| `visiteur`    | `vis123`     | Visiteur    | Consulter uniquement            |

---

## URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000/inscription` | Formulaire public d'inscription |
| `http://localhost:3000/admin/login` | Connexion admin |
| `http://localhost:3000/admin/dashboard` | Tableau de bord |
| `http://localhost:3000/admin/predicateurs` | Liste des prédicateurs |

---

## Structure du projet

```
MVM/
├── backend/
│   ├── server.js          # Serveur Express
│   ├── database.js        # Initialisation SQLite
│   ├── middleware/
│   │   └── auth.js        # JWT middleware
│   ├── routes/
│   │   ├── auth.js        # Login
│   │   └── preachers.js   # CRUD prédicateurs
│   └── utils/
│       └── upload.js      # Multer + Sharp (recadrage 3:4)
├── frontend/
│   └── src/
│       ├── App.js
│       ├── api.js
│       ├── AuthContext.js
│       ├── components/
│       │   ├── AdminLayout.js
│       │   └── PhotoCropper.js
│       └── pages/
│           ├── InscriptionPage.js   # Formulaire public (4 étapes)
│           ├── LoginPage.js
│           ├── DashboardPage.js
│           ├── PreachersListPage.js
│           ├── PreacherDetailPage.js
│           └── PreacherEditPage.js
├── uploads/               # Photos des prédicateurs
└── README.md
```

---

## Notes
- Les photos sont recadrées en format portrait 3:4 (600×800px) via `sharp`
- L'export CSV inclut toutes les fiches avec encodage UTF-8 (BOM pour Excel)
- Les mots de passe sont hashés avec bcrypt
- Authentification par JWT (durée : 8h)
