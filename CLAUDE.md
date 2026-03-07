# Sage RH — Contexte Claude Code

Système de gestion RH pour une entreprise automotive (Sage).
Monorepo : `backend/` (Spring Boot) + `frontend/` (React + Vite).

> Architecture detaillee : @docs/ARCHITECTURE.md
> Workflows (dev, build, debug) : @docs/WORKFLOWS.md

---

## Structure des dossiers cles

```
rh/
├── backend/
│   ├── src/main/java/tn/sage/rh/
│   │   ├── attendance/       # Pointage (controller, dto, entity, mapper, service)
│   │   ├── auth/             # Login / JWT (access + refresh tokens)
│   │   ├── config/           # Security, JWT, WebConfig, CORS
│   │   ├── dashboard/        # Stats agregees (heures projet, meilleur superviseur)
│   │   ├── employee/         # CRUD employes, events batch
│   │   ├── exeption/         # Exceptions metier (typo voulue dans le projet)
│   │   ├── handlers/         # RestExceptionHandler global
│   │   ├── organization/     # ProductionLine, Department, JobTitle, Shift
│   │   ├── permutations/     # Permutations d'operateurs + FreeOperators scheduler
│   │   └── request/          # Demandes de documents
│   └── src/main/resources/application.properties
└── frontend/
    └── src/
        ├── App.tsx            # Routes React Router v7
        ├── components/        # Layout, Sidebar, Heading, modals/, ui/
        ├── context/           # AuthProvider (JWT en memoire + refresh localStorage)
        ├── hooks/             # useAuth, useLogout, useRefreshToken, useValidateToken
        ├── lib/
        │   ├── data/          # Hooks API legacy (employee, attendance, request...)
        │   └── query-provider.tsx
        ├── modules/           # Modules fonctionnels (voir ci-dessous)
        ├── pages/             # Pages = assemblage Layout + module client
        └── types.ts           # Types partages
```

### Modules frontend (`src/modules/<module>/`)
Chaque module suit le pattern : `types.ts` | `schema.ts` (Zod) | `hooks/` (React Query) | `components/` | `utils/`

| Module | Roles autorises |
|---|---|
| `attendance` | ADMIN, SUPERVISOR |
| `auth` | tous |
| `dashboard` | ADMIN, SUPERVISOR, OPERATIONAL_MANAGER |
| `employee` | ADMIN (CRUD), ADMIN+SUPERVISOR (lecture) |
| `permutation` | SUPERVISOR, OPERATIONAL_MANAGER |
| `request` | ADMIN, SUPERVISOR |
| `salary-advance` | ADMIN, SUPERVISOR |

---

## Stack technique

**Backend**
- Java 17, Spring Boot 3.5.7
- Spring Security + JWT (jjwt 0.11.5) — access token 24h, refresh 7j
- Spring Data JPA + PostgreSQL (port 5432, db `rh`, ddl-auto=update)
- MapStruct 1.6.3 + Lombok
- Batch JDBC (taille 100) active pour les inserts en masse

**Frontend**
- React 19, TypeScript ~5.9, Vite 7
- TailwindCSS 4 (via @tailwindcss/vite)
- TanStack Query v5 (cache serveur), TanStack Table v8
- React Router v7, React Hook Form v7 + Zod v4
- Axios (baseURL via `VITE_API_BASE_URL`)
- react-hot-toast (feedback), SweetAlert2 (confirmations)
- Export : exceljs + jspdf-autotable

**Alias TypeScript** : `@/` => `frontend/src/`

---

## Commandes essentielles

```bash
# Frontend (dans frontend/)
npm run dev          # Vite dev server (reseau, --host)
npm run build        # tsc -b && vite build
npm run lint         # ESLint

# Backend (dans backend/)
./mvnw spring-boot:run          # Dev local
./mvnw clean package -DskipTests
./mvnw clean package            # Avec tests
```

**Variables d'environnement frontend** (`frontend/.env.development`) :
```
VITE_API_BASE_URL=http://<IP>:9000/api/v1
```

**Backend** : port 9000, DB postgres sur localhost:5432

---

## Conventions de code

- **Hooks React Query** : `useFetch*` pour les queries, `useCreate/useUpdate/useDelete` pour les mutations. Toujours invalider le queryKey correspondant dans `onSuccess`.
- **Formulaires** : React Hook Form + Zod schema dans `schema.ts`. Le resolver est `@hookform/resolvers/zod`.
- **API calls** : Axios avec `Authorization: Bearer ${auth.accessToken}` dans le header. URL base via `import.meta.env.VITE_API_BASE_URL`.
- **Auth** : `accessToken` en memoire (state React), `refreshToken` + `user` dans localStorage.
- **Backend** : Pattern Controller -> Service interface -> ServiceImpl. DTOs separes des entites JPA. MapStruct pour les conversions.
- **Erreurs backend** : Lancer `InvalidEntityException` ou `EntityNotFoundException` du package `exeption/` (pas `exception`).
- **Roles** : `ADMIN` | `SUPERVISOR` | `OPERATIONAL_MANAGER`

---

## Decisions architecturales importantes

- Le scheduler `FreeOperatorsResetScheduler` remet tous les operateurs a `free=false` chaque nuit (configurable via `app.schedulers.free-operators-reset.enabled`).
- Les permutations ont deux types : `ENVOYER` (avec receiverId obligatoire, dates libres) et `RECEVOIR` (receiverId=null, startDate=endDate=aujourd'hui).
- `lib/data/` contient des hooks plus anciens. Les nouveaux hooks vont dans `modules/<module>/hooks/`.
- `ddl-auto=update` : ne jamais renommer une colonne JPA sans migration manuelle, Hibernate crée une nouvelle colonne.

---

## A NE PAS MODIFIER

- `backend/src/main/java/tn/sage/rh/config/PostgresDialect.java` — dialecte custom requis
- `backend/src/main/java/tn/sage/rh/exeption/` — le nom du package avec faute de frappe est utilise partout
- `frontend/src/context/AuthProvider.tsx` — logique de persistence accessToken/refreshToken fragile
