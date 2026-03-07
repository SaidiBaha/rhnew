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
- `LogoutService` : invalide le token cote serveur (token blacklist ou similaire)
- `ApplicationAuditAware` : fournit le `currentAuditor` pour `@CreatedBy`/`@LastModifiedBy`

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

---

## Frontend — React + Vite

### Routing (`App.tsx`)
React Router v7 avec protection par roles :

| Path | Roles |
|---|---|
| `/` | ADMIN, SUPERVISOR, OPERATIONAL_MANAGER |
| `/employees` | ADMIN, SUPERVISOR, OPERATIONAL_MANAGER |
| `/salary-advances` | ADMIN, SUPERVISOR |
| `/attendances` | ADMIN, SUPERVISOR |
| `/requests` | ADMIN, SUPERVISOR |
| `/permutations` | SUPERVISOR, OPERATIONAL_MANAGER |
| `/free-operators` | SUPERVISOR, OPERATIONAL_MANAGER |
| `/change-password` | tous |

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
- Variables CSS custom : `--accent` (orange), `--navy`, `--surface`, `--border`, `--text-2`, `--text-3`, `--steel-light`, `--accent-soft`, `--red`, `--red-soft`
- Classe utilitaire `font-mono-data` pour les matricules et donnees numeriques

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
