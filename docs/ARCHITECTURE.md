# Architecture technique — Sage RH

## Vue d'ensemble

Application RH full-stack pour la gestion du personnel dans une usine automotive.

```
Client (navigateur)
       |
       | HTTP/REST (JSON)
       |
  [Frontend Vite/React]  :5173 (dev)
       |
       | VITE_API_BASE_URL → http://<IP>:9000/api/v1
       |
  [Backend Spring Boot]  :9000
       |
  [PostgreSQL]           :5432  db=rh
```

---

## Backend — Spring Boot

### Package racine : `tn.sage.rh`

#### Securite (`config/`)
- `SecurityConfiguration` : filtre JWT avant UsernamePasswordAuthenticationFilter, CORS configure via `WebConfig`
- `JwtAuthenticationFilter` : extrait le Bearer token, valide via `JwtService`, injecte le `SecurityContext`
- `JwtService` : signe avec HMAC-SHA256, secret dans `application.properties`
- `LogoutService` : invalide le token cote serveur (token blacklist via table `token`)
- `ApplicationAuditAware` : fournit le `currentAuditor` pour `@CreatedBy`/`@LastModifiedBy`
- `DataInitializer` : `ApplicationRunner` qui cree les comptes SUPER_ADMIN et PLANIFICATEUR au demarrage, et backfille le role NURSE pour les employes "AIDE SOIGNANTE" existants

#### Gestion des erreurs
- `RestExceptionHandler` (handlers/) : `@ControllerAdvice` global, retourne `ErrorDto`
- `GlobalExceptionHandler` (config/) : complementaire
- Exceptions metier dans `exeption/` (typo maintenue intentionnellement) :
  - `InvalidEntityException` — validation metier echouee
  - `EntityNotFoundException` — entite absente en base
  - `InvalidOperationException` — operation interdite dans le contexte actuel
  - `ErrorCodes` — enum des codes d'erreur

#### Modules metier

**`employee/`**
- Entite principale `Employee` avec `Civility` enum
- `EmployeeValidator` : validations metier avant persistance
- Events Spring : `EmployeeCreationEvent`/`EmployeeBatchSaveEvent` pour les effets de bord asynchrones
- Batch insert JDBC optimise (taille 100, inserts ordonnes)
- Attribution automatique du role : si `JobTitle.title == "AIDE SOIGNANTE"` → `NURSE`, sinon → `SUPERVISOR`

**`attendance/`**
- Entite `Attendance` avec `AbsenceReason`
- `AttendanceValidator` : verifie les regles (pas de doublon date/employe)
- Input DTO separe (`SaveAttendanceInputDto`) pour la creation

**`permutations/`**
- Entites : `Permutation`, `FreeOperators`, `FreePermutation`
- Enums : `PermutationStatus` (EN_ATTENTE, ACCEPTEE, REFUSEE), `TypePermutation` (ENVOYER, RECEVOIR)
- `FreeOperatorsResetScheduler` : tache planifiee (activable/desactivable) qui remet tous les operateurs a `free=false`
- Deux controllers : `PermutationController` + `FreeOperatorsController`
- Services via interface + impl : `PermutationService`/`PermutationServiceImpl`, `FreeOperatorsService`/`FreeOperatorsServiceImpl`

**`organization/`**
- Referentiels : `Department`, `EmploymentType`, `JobTitle`, `ProductionLine`, `Shift`
- Chaque entite a son mapper MapStruct, repository JPA, service

**`dashboard/`**
- `DashboardService` : agregats SQL natifs (heures par projet, meilleur superviseur)
- `ProjectBestSupervisorRow` : projection JPA pour les requetes natives

**`auth/`**
- `AuthenticationController` : login, register, refresh-token, validate-token
- Retourne `AuthenticationResponseDto` contenant `accessToken` + `refreshToken` + infos user
- Reset mot de passe via OTP email (Gmail SMTP, expiration 15 min)

**`salary/`**
- `SalaryAdvance` + `SalaryAdvanceDeadline`
- Creation automatique d'un enregistrement `SalaryAdvance` a chaque creation d'employe (via event)

**`request/`**
- `Request` avec `RequestType` et `RequestStatus`

**`edi/`**
- Parsing, validation et conversion de fichiers EDI DELFOR → CSV
- Historique des conversions

**`presence/`**
- Gestion des présences/absences journalières
- Import de fichiers de pointage, saisie manuelle, toggle "appelé"
- `AttendanceRecord` avec statut (présent, absent, congé…)

**`notifications/`**
- `Notification` avec `titre`, `message`, `lien` (optionnel), `lu`, `createdAt`
- Endpoints : `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/mark-read`, `PATCH /notifications/mark-all-read`
- Polling côté frontend toutes les 30s via TanStack Query

**`user/`**
- `User` (lie a `Employee` via `@OneToOne`)
- `UserRole` : ADMIN | SUPERVISOR | OPERATIONAL_MANAGER | PLANIFICATEUR | SUPER_ADMIN | **NURSE**
- Mot de passe = matricule (par defaut), hashé bcrypt

---

## Frontend — React + Vite

### Routing (`App.tsx`)
React Router v7 avec protection par roles :

| Path | Roles autorises |
|---|---|
| `/` | ADMIN, SUPERVISOR, OPERATIONAL_MANAGER, SUPER_ADMIN |
| `/employees` | ADMIN, SUPER_ADMIN |
| `/salary-advances` | ADMIN, SUPERVISOR, SUPER_ADMIN |
| `/salary-advances/history` | ADMIN |
| `/salary-advances/suivi-superviseurs` | ADMIN, SUPER_ADMIN |
| `/attendances` | ADMIN, SUPERVISOR, SUPER_ADMIN |
| `/requests` | ADMIN, SUPERVISOR, SUPER_ADMIN |
| `/presence-absences` | ADMIN, SUPERVISOR, SUPER_ADMIN, NURSE |
| `/historique-presence` | ADMIN, SUPERVISOR, SUPER_ADMIN |
| `/permutations` | SUPERVISOR, OPERATIONAL_MANAGER, SUPER_ADMIN |
| `/free-operators` | SUPERVISOR, OPERATIONAL_MANAGER, SUPER_ADMIN |
| `/edi` | PLANIFICATEUR, SUPER_ADMIN |
| `/change-password` | ADMIN, SUPERVISOR, OPERATIONAL_MANAGER, PLANIFICATEUR, SUPER_ADMIN, NURSE |

`PersistLogin` : rehydrate la session via refresh token au rechargement de page.
`ProtectedRoute` : redirige vers `/login` si non authentifie ou role insuffisant.

### Gestion de l'etat

**Auth** (`context/AuthProvider.tsx`)
- `accessToken` en memoire uniquement (state React)
- `user` + `refreshToken` persistes dans `localStorage`
- `useRefreshToken` : appelle `/auth/refresh-token`, met a jour le state

**Serveur** (TanStack Query v5)
- Query keys par resource : `["employees"]`, `["permutations"]`, `["attendances"]`, etc.
- Invalidation systematique apres mutation dans `onSuccess`
- Provider dans `lib/query-provider.tsx`

### Composants UI reutilisables (`components/ui/`)
Bases Radix UI wrappees avec Tailwind : `Button`, `Dialog`, `Select`, `Popover`, `Calendar`, `DataTable`, `Combobox`, `MultiSelect`, `Input`, `Form`, `Label`, `Badge`, `Spinner`, `Toggle`, `FileUpload`

`DataTable` : TanStack Table v8 avec tri, filtrage colonne, pagination.

### Pattern par module (`modules/<module>/`)

```
modules/employee/
├── types.ts          # Types TypeScript (Employee, EmployeeRequest...)
├── schema.ts         # Schema Zod pour validation formulaire
├── constants.ts      # Constantes (listes de valeurs, labels)
├── hooks/
│   ├── useFetchEmployees.ts
│   ├── useFetchEmployeesPaged.ts
│   ├── useFetchEmployeesForFilters.ts
│   ├── useCreateEmployee.ts
│   ├── useUpdateEmployee.ts
│   └── useDeleteEmployee.ts
├── components/
│   ├── columns.tsx   # Definition colonnes TanStack Table
│   └── EmployeesClient.tsx  # Composant principal de la page
└── utils.ts
```

### Exports de donnees
- Excel : `exceljs` (export avance) + `xlsx` (import/lecture)
- PDF : `jspdf` + `jspdf-autotable`
- Fichiers : `file-saver`

### CSS / Design system
- TailwindCSS 4 via plugin Vite
- Variables CSS custom dans `src/index.css` :

| Token | Valeur |
|---|---|
| `--bg` | `#f4f6fb` |
| `--white` | `#ffffff` |
| `--sidebar-bg` | `#1b2444` |
| `--accent` | `#2f6bff` |
| `--accent2` | `#00c48c` |
| `--accent3` | `#ff8c00` |
| `--accent4` | `#f03e3e` |
| `--text` | `#1a2340` |
| `--border` | `#e4e8f0` |
| `--radius` | `14px` |
| Police UI | `Plus Jakarta Sans` |
| Police mono | `Fira Code` |

---

## Roles utilisateurs

| Role | Description | Acces |
|---|---|---|
| `ADMIN` | Administration RH | Employes CRUD, avances, pointage, demandes |
| `SUPERVISOR` | Chef d'equipe | Ses operateurs, avances, pointage, demandes, permutations |
| `OPERATIONAL_MANAGER` | Responsable operations | Dashboard, permutations, operateurs disponibles |
| `PLANIFICATEUR` | Planification | Module EDI uniquement |
| `SUPER_ADMIN` | Acces total | Toutes les fonctionnalites |
| `NURSE` | Infirmier/aide soignante | Changement de mot de passe uniquement |

**Regle d'attribution automatique** : lors de la creation (unitaire ou batch) d'un employe dont le `Poste Occupe` (JobTitle) vaut `"AIDE SOIGNANTE"`, le compte utilisateur est cree avec le role `NURSE` plutot que `SUPERVISOR`.

---

## Flux d'authentification

```
1. POST /auth/login → { accessToken, refreshToken, user }
2. Frontend stocke refreshToken + user en localStorage
3. Chaque requete : Authorization: Bearer <accessToken>
4. accessToken expire (24h) → useRefreshToken appelle POST /auth/refresh-token
5. Nouveau accessToken en memoire, refreshToken reste valide 7j
6. Logout : DELETE /auth/logout → efface localStorage
```

---

## Base de donnees

- PostgreSQL avec `ddl-auto=update` (schema evolue automatiquement)
- Custom dialect `PostgresDialect` pour compatibilite requetes natives
- Audit automatique via `@EnableJpaAuditing` + `ApplicationAuditAware`
- Batch inserts actives pour les operations en masse sur les employes

## Pagination employes

`GET /api/v1/employees/pagination` accepte : `page`, `size`, `search`, `productionLine`, `shift`, `employmentType`, `hireDateFrom`, `hireDateTo`, `leftCompanyFilter`.
Retourne `PageResponse<EmployeeDto>` avec `content`, `pageNumber`, `pageSize`, `totalElements`, `totalPages`, `first`, `last`.
