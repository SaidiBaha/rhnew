# Sage RH — Contexte Claude Code

Système de gestion RH pour une entreprise automotive (Sage).
Monorepo : `backend/` (Spring Boot) + `frontend/` (React + Vite).

> Architecture detaillee : @docs/ARCHITECTURE.md
> Workflows (dev, build, debug) : @docs/WORKFLOWS.md
> Système de notifications : @docs/NOTIFICATIONS.md

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
│   │   ├── notifications/    # Notifications systeme (CRUD + mark-read)
│   │   ├── organization/     # ProductionLine, Department, JobTitle, Shift
│   │   ├── permutations/     # Permutations d'operateurs + FreeOperators scheduler
│   │   ├── presence/         # Presences/absences journalieres
│   │   ├── request/          # Demandes de documents
│   │   └── salary/           # Avances sur salaire + deadlines
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
| `auth` | tous (login, change-password pour NURSE aussi) |
| `dashboard` | ADMIN, SUPERVISOR, OPERATIONAL_MANAGER |
| `edi` | PLANIFICATEUR, SUPER_ADMIN |
| `employee` | ADMIN (CRUD), ADMIN+SUPERVISOR (lecture) |
| `history` | ADMIN, SUPERVISOR (historique présences) |
| `notifications` | tous — polling 30s, mark-read |
| `permutation` | SUPERVISOR, OPERATIONAL_MANAGER |
| `presence` | ADMIN, SUPERVISOR, NURSE |
| `request` | ADMIN, SUPERVISOR |
| `salary-advance` | ADMIN, SUPERVISOR |

**Composants de notification** : `NotificationCenter` (cloche générale) + `PermutationNotificationBell` (SUPERVISOR uniquement) — tous deux dans la user card de `Sidebar.tsx`. Voir `@docs/NOTIFICATIONS.md` pour la carte complète.

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
- **Roles** : `ADMIN` | `SUPERVISOR` | `OPERATIONAL_MANAGER` | `PLANIFICATEUR` | `SUPER_ADMIN` | `NURSE`

---

## Decisions architecturales importantes

- Le scheduler `FreeOperatorsResetScheduler` remet tous les operateurs a `free=false` chaque nuit (configurable via `app.schedulers.free-operators-reset.enabled`).
- Les permutations ont deux types : `ENVOYER` (avec receiverId obligatoire, dates libres) et `RECEVOIR` (receiverId=null, startDate=endDate=aujourd'hui).
- `lib/data/` contient des hooks plus anciens. Les nouveaux hooks vont dans `modules/<module>/hooks/`.
- `ddl-auto=update` : ne jamais renommer une colonne JPA sans migration manuelle, Hibernate crée une nouvelle colonne.
- **Role NURSE** : si `JobTitle.title == "AIDE SOIGNANTE"` (insensible casse), le compte utilisateur est cree avec `NURSE` (acces uniquement changement mot de passe). Logique dans `EmployeeCreationListener` et `UserService.toUser()`. Backfill au demarrage via `DataInitializer`.

---

---

## UI Design System — Refonte (session 2026-03-09)

### Tokens CSS appliqués (`src/index.css`)

| Token | Valeur |
|---|---|
| `--bg` | `#f4f6fb` |
| `--white` | `#ffffff` |
| `--sidebar-bg` | `#1b2444` |
| `--sidebar-active` | `#2d3a5e` |
| `--sidebar-hover` | `#232f52` |
| `--accent` | `#2f6bff` |
| `--accent-light` | `#eef3ff` |
| `--accent2` | `#00c48c` |
| `--accent3` | `#ff8c00` |
| `--accent4` | `#f03e3e` |
| `--text` | `#1a2340` |
| `--text2` | `#4b5675` |
| `--muted` | `#9aa3b8` |
| `--border` | `#e4e8f0` |
| `--radius` | `14px` |
| `--header-h` | `64px` |
| Police UI | `Plus Jakarta Sans` |
| Police mono | `Fira Code` |

### Statut des composants

| Composant | Fichier | Statut |
|---|---|---|
| Global CSS / tokens | `src/index.css` | ✅ |
| Sidebar | `src/components/Sidebar.tsx` | ✅ |
| Layout | `src/components/Layout.tsx` | ⬜ |
| Navbar | `src/components/Navbar.tsx` | ⬜ |
| Button | `src/components/ui/Button.tsx` | ⬜ |
| Badge | `src/components/ui/Badge.tsx` | ⬜ |
| Input | `src/components/ui/Input.tsx` | ⬜ |
| Card | `src/components/ui/Card.tsx` | ⬜ |
| DataTable | `src/components/ui/DataTable.tsx` | ✅ (fix search padding) |
| FileUploadModal | `src/components/modals/FileUploadModal.tsx` | ✅ (fix dropzone layout) |

---

## Backend — Pagination Employés (session 2026-03-09)

### Endpoint modifié

`GET /api/v1/employees` accepte désormais deux paramètres optionnels :

| Param | Défaut | Description |
|---|---|---|
| `page` | `0` | Numéro de page (base 0) |
| `size` | `25` | Taille de page |

### Réponse (PageResponse\<EmployeeDto\>)

```json
{
  "content":       [...],
  "pageNumber":    0,
  "pageSize":      25,
  "totalElements": 150,
  "totalPages":    6,
  "first":         true,
  "last":          false
}
```

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `employee/dto/PageResponse.java` | **NOUVEAU** — wrapper générique paginé |
| `employee/EmployeeRepository.java` | `findAllPaged(Pageable)` + `findAllBySupervisorPaged(matricule, Pageable)` |
| `employee/EmployeeService.java` | `findAll(Principal, Pageable)` → `Page<Employee>` |
| `employee/EmployeeController.java` | Params `page`/`size`, retour `PageResponse<EmployeeDto>` |

### Frontend mis à jour (session 2026-03-09)

| Fichier | Changement |
|---|---|
| `modules/employee/types.ts` | `PageResponse<T>` ajouté |
| `modules/employee/hooks/useFetchEmployeesPaged.ts` | **NOUVEAU** — hook paginé (`page`, `size`) avec `placeholderData` |
| `modules/employee/components/EmployeesClient.tsx` | Data fetching interne, état `page`, contrôles prev/next/numéros |
| `pages/EmployeesPage.tsx` | Réduit à `<EmployeesClient />` |
| `components/ui/DataTable.tsx` | Props `pageSize` et `hidePagination` ajoutées |

---

---

## Email + Filtres Employés (session 2026-03-16)

### Champ `email` ajouté

- Nullable/optionnel dans l'entité, le DTO et le RequestDto
- Import Excel : colonne `Email` ou `E-mail` (case-insensitive) → mappée vers `email`
- Affiché dans la table et exporté Excel (colonne `EMAIL`)

### Filtres serveur sur `/pagination`

L'endpoint `GET /api/v1/employees/pagination` accepte désormais des paramètres de filtre optionnels combinables :

| Param | Type | Description |
|---|---|---|
| `productionLine` | `string` | Filtre exact sur le nom de la ligne (insensible à la casse) |
| `shift` | `string` | Filtre exact sur le nom du poste |
| `employmentType` | `string` | Filtre exact sur le type de travail |
| `hireDateFrom` | `date` (ISO 8601) | Date d'embauche ≥ |
| `hireDateTo` | `date` (ISO 8601) | Date d'embauche ≤ |

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `employee/Employee.java` | Champ `email` (nullable) |
| `employee/dto/EmployeeDto.java` | Champ `email` |
| `employee/dto/EmployeeRequestDto.java` | Champ `email` (sans validation) |
| `employee/EmployeeRepository.java` | `findPagedWithFilters(...)` — nouvelle query JPQL avec 5 filtres optionnels |
| `employee/EmployeeService.java` | `findAllByPagination` étendu + `setEmployeeFromRequestDTO` mappe `email` |
| `employee/EmployeeController.java` | 5 nouveaux `@RequestParam` optionnels |
| `modules/employee/types.ts` | `email?: string` dans `Employee` et `EmployeeRequest` |
| `modules/employee/schema.ts` | `email` optionnel |
| `modules/employee/components/columns.tsx` | Colonne `Email` ajoutée |
| `modules/employee/utils.ts` | `formatEmployee` + `COLUMN_MAP` mis à jour pour email |
| `modules/employee/hooks/useFetchEmployeesPaged.ts` | Accepte `filters` (productionLine, shift, employmentType, hireDateFrom, hireDateTo) |
| `modules/employee/hooks/useFetchEmployeesForFilters.ts` | **NOUVEAU** — charge tous les employés pour peupler les dropdowns des filtres |
| `modules/employee/components/EmployeesClient.tsx` | Barre de filtres UI + export Excel email + filtres transmis à l'API |

### Règles UI (NE PAS TOUCHER)
- Logique métier, hooks, services, utils
- Appels API / Axios
- Routes et navigation
- Types TypeScript
- Fichiers de config (vite, tailwind, .env)

---

## Role NURSE — session 2026-04-09

### Regle d'attribution

Lors de la creation d'un employe (unitaire ou batch), si `employee.getJobTitle().getTitle()` vaut `"AIDE SOIGNANTE"` (insensible a la casse), le compte utilisateur est cree avec le role `NURSE`. Sinon le role par defaut reste `SUPERVISOR`.

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `user/UserRole.java` | Valeur `NURSE` ajoutee (permissions vides) |
| `employee/event/EmployeeCreationListener.java` | Appelle `determineRole(employee)` a la place de SUPERVISOR fixe |
| `user/UserService.java` | `toUser()` utilise `determineRole(employee)` |
| `config/DataInitializer.java` | Backfill : met a jour SUPERVISOR → NURSE pour les employes "AIDE SOIGNANTE" existants |
| `config/SecurityConfiguration.java` | NURSE ajouté dans `hasAnyRole` de `/api/v1/users/**` |
| `modules/auth/types.ts` | `"NURSE"` ajoute a l'union `UserRole` |
| `App.tsx` | Route `/change-password` inclut `"NURSE"` dans `allowedRoles` |
| `components/Sidebar.tsx` | `roleLabelMap` + bouton "Changer mot de passe" incluent `NURSE` |

---

## A NE PAS MODIFIER

- `backend/src/main/java/tn/sage/rh/config/PostgresDialect.java` — dialecte custom requis
- `backend/src/main/java/tn/sage/rh/exeption/` — le nom du package avec faute de frappe est utilise partout
- `frontend/src/context/AuthProvider.tsx` — logique de persistence accessToken/refreshToken fragile
