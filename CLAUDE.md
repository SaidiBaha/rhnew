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
│   │   ├── hse/              # Module HSE : checklist/ (template+instance) + audit/
│   │   ├── organization/     # ProductionLine, Department, JobTitle, Shift
│   │   ├── permutations/     # Permutations d'operateurs + FreeOperators scheduler
│   │   ├── presence/         # Presences/absences journalieres
│   │   ├── request/          # Demandes de documents
│   │   ├── salary/           # Avances sur salaire + deadlines
│   │   └── user/             # User entity, UserService, UserAdminController, UserActivityLog
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
| `audit` | INGENIEUR_HSE (lecture+écriture), ADMIN, SUPER_ADMIN (lecture) |
| `auth` | tous (login, change-password pour NURSE aussi) |
| `checklist` | INGENIEUR_HSE (lecture+écriture), ADMIN, SUPER_ADMIN (lecture) |
| `dashboard` | ADMIN, SUPERVISOR, OPERATIONAL_MANAGER |
| `department` | ADMIN, SUPER_ADMIN — CRUD départements |
| `edi` | PLANIFICATEUR, SUPER_ADMIN |
| `employee` | ADMIN (CRUD), ADMIN+SUPERVISOR (lecture) |
| `history` | ADMIN, SUPERVISOR (historique présences) |
| `job-title` | ADMIN, SUPER_ADMIN — CRUD postes occupés |
| `notifications` | tous — polling 30s, mark-read |
| `permutation` | SUPERVISOR, OPERATIONAL_MANAGER |
| `presence` | ADMIN, SUPERVISOR, NURSE |
| `production-line` | ADMIN, SUPER_ADMIN — CRUD complet ; INGENIEUR_HSE — lecture + création uniquement (pas de modification ni suppression) |
| `request` | ADMIN, SUPERVISOR |
| `salary-advance` | ADMIN, SUPERVISOR |
| `user-management` | SUPER_ADMIN — tableau de bord, blocage, rôles, historique activité |

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
- **Roles** : `ADMIN` | `SUPERVISOR` | `OPERATIONAL_MANAGER` | `PLANIFICATEUR` | `SUPER_ADMIN` | `NURSE` | `INGENIEUR_HSE`

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

### Règle de préservation de l'email lors de l'import (session 2026-04-18)

Dans `setEmployeeFromRequestDTO`, si l'employé possède déjà un email en base **et** que le champ email du fichier importé est vide, l'email en base est conservé (non écrasé). Tableau de décision :

| Email en base | Email dans le fichier | Action |
|---|---|---|
| Présent | Présent | Écrase avec la valeur du fichier |
| Présent | Vide | **Conserve l'email en base** |
| Vide | Présent | Écrase avec la valeur du fichier |
| Vide | Vide | Laisse vide |

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

## Suivi-superviseurs — Calcul du statut (session 2026-04-17)

### Problème corrigé

Le statut `PARTIEL` / `COMPLETE` dans le module suivi-superviseurs était calculé en comparant `nbSaisies` (avances avec `amount > 0`) contre `nbEmployees` (TOUS les employés). Les employés non éligibles (domiciliation bancaire, absence MALADIE L-D/MATERNITÉ, < 40h) étaient incorrectement inclus dans le dénominateur, rendant le statut `COMPLETE` impossible à atteindre.

### Nouvelle règle

| Condition | Statut |
|---|---|
| `nbSaisies == 0` | `EN_ATTENTE` |
| `nbSaisies > 0` et `nbSaisies < nbEligibles` | `PARTIEL` |
| `nbSaisies >= nbEligibles` | `COMPLETE` |

`nbEligibles` = nombre d'employés dont le champ "Montant à payer" est **non disabled** (même critères que `SalaryAdvanceValidator.checkEmployeeEligibility` et `EditableCell.isEligible`).

### Implémentation

- **`SalaryAdvanceService.batchUpdate`** : dans la boucle de traitement, comptage des employés éligibles (`nbEligibles++` lorsque `isEligible == true`). Le compteur est passé à `onAdvancesSaved`.
- **`SupervisorAdvanceTrackingService.onAdvancesSaved`** : signature enrichie avec `int nbEligibles`. Le calcul du statut utilise `nbEligibles` au lieu de `nbEmployees`.

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `salary/service/SalaryAdvanceService.java` | Comptage `nbEligibles` dans la boucle batch, passage à `onAdvancesSaved` |
| `salary/service/SupervisorAdvanceTrackingService.java` | Signature `onAdvancesSaved(supervisorId, nbEligibles)`, calcul statut sur `nbEligibles` |

---

## Avances — Saisie globale par défaut (session 2026-04-17)

### Fonctionnalité ajoutée

Un champ **"Montant par défaut"** + bouton **"Appliquer à tous"** a été ajouté en haut de la liste des avances, entre le séparateur de titre et le tableau.

### Comportement

1. Le superviseur saisit un montant dans le champ "Montant par défaut".
2. Il clique "Appliquer à tous" → le montant est appliqué à tous les employés **éligibles et non verrouillés**.
3. Les cellules `disabled` (employé non éligible, deadline dépassée, ou deadline en cours de chargement) **ne sont pas affectées**.
4. Le superviseur peut ensuite corriger individuellement n'importe quelle cellule éligible.

### Critères d'éligibilité répliqués (identiques à `EditableCell.isEligible`)

- `hasBankDomiciliation !== "oui"`
- Pas de motif `MALADIE L-D` ou `MATERNITÉ`
- Heures travaillées ≥ 40

### Fichier modifié

| Fichier | Changement |
|---|---|
| `modules/salary-advance/components/SalaryAdvancesClient.tsx` | Ajout `isRowEligible()`, état `defaultAmount`, `handleApplyDefault()`, et UI "Montant par défaut" |

---

## Suivi-superviseurs — source de données (session 2026-04-17)

### Problème corrigé

La liste des superviseurs dans `/salary-advances/suivi-superviseurs` provenait uniquement de l'endpoint `/supervisor-advance-tracking`, qui ne retourne que les superviseurs ayant un enregistrement de tracking. La liste était donc incomplète par rapport à la liste canonique.

### Source de vérité

La liste canonique des superviseurs est celle utilisée dans le formulaire **Nouvelle permutation** (champ "Destinataire (superviseur)") : `GET /employees/supervisors` via `useFetchSupervisors` de `modules/employee/hooks/useFetchSupervisors`.

### Logique de fusion (SupervisorTrackingClient)

1. Fetch de la liste canonique via `useFetchSupervisors()`
2. Fetch des données de tracking via `useFetchSupervisorTracking()`
3. Merge : pour chaque superviseur de la liste canonique, on recherche sa ligne de tracking par `supervisorId`. Si trouvée, on utilise la ligne existante. Sinon, on génère une ligne par défaut (`statut: "EN_ATTENTE"`, montants à 0).
4. La logique d'affichage (filtres, tableau, badges) reste inchangée.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `modules/salary-advance/components/SupervisorTrackingClient.tsx` | Import `useFetchSupervisors`, merge canonique + tracking via `useMemo`; `nbCompleted`/`nbMissing`/`totalAmount` recalculés depuis `rows` |

### Calcul des statistiques (session 2026-04-17 — fix complémentaire)

Les cartes **"Avances complétées"**, **"Avances manquantes"** et **"Total avances"** utilisaient auparavant `data?.nbCompleted`, `data?.nbMissing`, `data?.totalAmount` issus de l'API de tracking (ancienne liste). Elles sont désormais calculées directement depuis le tableau `rows` (liste corrigée) :

```ts
const nbCompleted = rows.filter((r) => r.statut === "COMPLETE").length;
const nbMissing   = rows.filter((r) => r.statut !== "COMPLETE").length;
const totalAmount = rows.reduce((sum, r) => sum + (r.montantTotal ?? 0), 0);
```

---

## Notifications email — Avances superviseurs (session 2026-04-18)

### Fonctionnalité

En parallèle des notifications IN-APP existantes, un email est envoyé à chaque superviseur possédant un email renseigné dans la table `employees`, pour les 3 déclencheurs suivants :

| Déclencheur | Méthode | Email envoyé |
|---|---|---|
| Import du fichier de pointage | `onAttendanceImported` | `sendSalaryAdvanceImportEmail` |
| Relance manuelle admin | `sendManualReminder` | `sendSalaryAdvanceReminderEmail` |
| Rappel automatique (cron 24h) | `sendAutomaticReminders` | `sendSalaryAdvanceReminderEmail` |

### Règles

- Envoi **uniquement si** `employee.email` est non vide.
- Envoi **non bloquant** via `CompletableFuture.runAsync()` — une erreur d'email n'impacte pas la notification IN-APP ni la transaction.
- Erreurs loggées silencieusement (`log.error`), aucune exception propagée.
- La logique des 3 déclencheurs existants est **inchangée**.

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `auth/EmailService.java` | `sendSalaryAdvanceImportEmail` + `sendSalaryAdvanceReminderEmail` + templates HTML |
| `salary/service/SupervisorAdvanceTrackingService.java` | Injection `EmailService`, envoi async aux 3 points de déclenchement |

---

## Présences — Améliorations formulaires superviseur (session 2026-04-20)

### Modification 1 — Shift Après-midi

Le shift **"Après-midi"** (14:00 → 22:00) a été ajouté dans le formulaire "Ajouter présences / absences".

Règle de pré-sélection automatique à l'ouverture :

| Heure courante (Tunis) | Shift sélectionné | Debut | Fin |
|---|---|---|---|
| 05h–13h | Shift matin | 06:00 | 14:00 |
| 14h–21h | Après-midi | 14:00 | 22:00 |
| 22h–04h | Shift nuit | 22:00 | 06:00 |

Le shift ADM n'est jamais sélectionné automatiquement — il est disponible pour sélection manuelle uniquement.

### Modification 2 — Motif par employé (formulaire Manuel)

Lorsqu'un employé est **décoché** (absent), un select **Motif** apparaît inline sous sa ligne.

- Valeur par défaut : `ABSENCE-SAISIE-SUPERVISEUR`
- Re-cocher l'employé masque et réinitialise le motif
- Le motif est transmis dans `ManualPresenceEntry.absenceReason` lors de la soumission

Liste des motifs disponibles (partagée avec EditAttendanceModal) :
`CONGE PAYE`, `CONGE NON PAYE`, `ABSENCE-SAISIE-SUPERVISEUR`, `AUTORISATION AF-PER`, `CHÔMAGE TECHNIQUE`, `MALADIE CD`, `MALADIE L-D`

### Modification 3 — Motif select dans "Éditer le pointage"

Le champ **Motif** dans `EditAttendanceModal` est désormais un `<select>` avec la même liste de motifs. Une option `— Aucun motif —` (valeur vide) est disponible. La valeur existante est pré-sélectionnée à l'ouverture.

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/presence/types.ts` | `absenceReason?: string \| null` ajouté à `ManualPresenceEntry` |
| `modules/presence/components/ManualPresenceModal.tsx` | Shift Après-midi, détection automatique, motif par employé absent |
| `modules/presence/components/EditAttendanceModal.tsx` | Champ Motif : `<input text>` → `<select>` avec liste fixe |

### Bug fix — Motif ignoré à la soumission (session 2026-04-20)

**Cause racine (backend)** : `ManualPresenceEntryDto` n'avait pas de champ `absenceReason`, donc le backend ignorait la sélection du superviseur et appliquait systématiquement `"ABSENCE-SAISIE-SUPERVISEUR"` pour tous les absents (ligne `AbsenceReason absentReason = absenceReasonService.findOrSave("ABSENCE-SAISIE-SUPERVISEUR")` hors de la boucle).

**Correction** :
- `ManualPresenceEntryDto.java` : ajout du champ `absenceReason` (String, nullable)
- `AttendanceService.java` : dans la boucle des absents, résolution du motif depuis `entry.getAbsenceReason()` — fallback `"ABSENCE-SAISIE-SUPERVISEUR"` uniquement si null/vide

| Fichier | Changement |
|---|---|
| `attendance/dto/ManualPresenceEntryDto.java` | Champ `absenceReason` (String, nullable) ajouté |
| `attendance/service/AttendanceService.java` | Motif résolu depuis `entry.getAbsenceReason()` par employé, fallback sur la valeur par défaut |

### Bug fix — Statut "EN ATTENTE" pour les absents avec motif spécifique (session 2026-04-20)

**Cause** : `computeStatus` dans `status.ts` ne retournait "ABSENT" que si le motif contenait le mot "ABSENCE" (via `.includes("ABSENCE")`). Les motifs "CONGE PAYE", "MALADIE CD", etc. ne passaient pas cette condition → statut "EN ATTENTE".

**Correction** : La condition est désormais `!!absenceReason && absenceReason.trim() !== ""` — tout motif non vide implique le statut **ABSENT**.

| Fichier | Changement |
|---|---|
| `modules/presence/utils/status.ts` | `hasAbsenceMotif` (includes "ABSENCE") → `hasAbsenceReason` (any non-empty value) |

### Bug fix — Suppression de "ABSENCE-SAISIE-SUPERVISEUR" des listes de motifs (session 2026-04-20)

L'option `"ABSENCE-SAISIE-SUPERVISEUR"` a été retirée des dropdowns Motif. Le nouveau `DEFAULT_MOTIF` dans `ManualPresenceModal` est `"CONGE PAYE"`. Les enregistrements existants en base avec cette valeur sont conservés tels quels.

Liste finale des motifs disponibles : `CONGE PAYE`, `CONGE NON PAYE`, `AUTORISATION AF-PER`, `CHÔMAGE TECHNIQUE`, `MALADIE CD`, `MALADIE L-D`

| Fichier | Changement |
|---|---|
| `modules/presence/components/ManualPresenceModal.tsx` | "ABSENCE-SAISIE-SUPERVISEUR" retiré de `ABSENCE_MOTIFS`, `DEFAULT_MOTIF` → "CONGE PAYE" |
| `modules/presence/components/EditAttendanceModal.tsx` | "ABSENCE-SAISIE-SUPERVISEUR" retiré de `ABSENCE_MOTIFS` |

---

## Présences — Motifs filtrés par rôle (session 2026-04-27)

### Fonctionnalité ajoutée

La liste des motifs d'absence dans les deux formulaires est désormais **filtrée dynamiquement selon le rôle de l'utilisateur connecté** (via `useAuth`).

### Règle de visibilité

| Motif | SUPERVISOR | ADMIN | SUPER_ADMIN | NURSE |
|---|:---:|:---:|:---:|:---:|
| CONGE PAYE | ✅ | ✅ | ✅ | ✅ |
| CONGE NON PAYE | ✅ | ✅ | ✅ | ✅ |
| AUTORISATION AF-PER | ✅ | ✅ | ✅ | ✅ |
| CHÔMAGE TECHNIQUE | ✅ | ✅ | ✅ | ✅ |
| MALADIE CD | ✅ | ✅ | ✅ | ✅ |
| MALADIE L-D | ✅ | ✅ | ✅ | ✅ |
| ABSENCE-Non-Justifiée | ✅ | ✅ | ✅ | ✅ |
| INJOIGNABLE-TÉLÉPHONE | ❌ | ❌ | ❌ | ✅ |
| NON-RÉPONSE-APPEL | ❌ | ❌ | ❌ | ✅ |

### Comportement

- Les constantes `COMMON_MOTIFS` et `NURSE_MOTIFS` remplacent l'ancien `ABSENCE_MOTIFS`.
- Dans `ManualPresenceModal` : `absenceMotifs` calculé au rendu du composant (`isNurse ? [...COMMON_MOTIFS, ...NURSE_MOTIFS] : COMMON_MOTIFS`). Si un employé absent a un motif existant hors de la liste (ex. motif NURSE vu par un SUPERVISOR en mode édition), ce motif est ajouté dynamiquement à ses options.
- Dans `EditAttendanceModal` : `absenceMotifs` calculé via `useMemo`. Si `record.absenceReason` contient un motif absent de la liste filtrée, il est ajouté dynamiquement — garantit l'absence d'option manquante.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `modules/presence/components/ManualPresenceModal.tsx` | `ABSENCE_MOTIFS` → `COMMON_MOTIFS` + `NURSE_MOTIFS` ; `isNurse` depuis `useAuth` ; options dynamiques par employé |
| `modules/presence/components/EditAttendanceModal.tsx` | `ABSENCE_MOTIFS` → `COMMON_MOTIFS` + `NURSE_MOTIFS` ; `absenceMotifs` via `useMemo` + ajout conditionnel du motif existant |

### Recherche temps réel dans la liste des employés (session 2026-04-20)

Une barre de recherche a été ajoutée dans le formulaire "Ajouter présences / absences", entre le bandeau "Sélectionner tous" et la liste des employés.

- Filtre côté client en temps réel sur `fullName` et `matricule`
- Un bouton ✕ efface la recherche instantanément
- Les employés masqués conservent leur état coché/décoché et leur motif
- Message "Aucun résultat pour « … »" si aucun employé ne correspond
- La recherche est réinitialisée à chaque ouverture du formulaire

| Fichier | Changement |
|---|---|
| `modules/presence/components/ManualPresenceModal.tsx` | État `search`, `filteredEmployees` (useMemo), barre de recherche avec icône + bouton effacer |

---

## Employés — Création et modification individuelles (session 2026-04-20)

### Fonctionnalités ajoutées

1. **Bouton "Nouvel employé"** — visible uniquement aux rôles ADMIN et SUPER_ADMIN. Ouvre un formulaire de création individuelle.
2. **Bouton "Modifier"** (icône crayon) sur chaque ligne du tableau — visible uniquement aux rôles ADMIN et SUPER_ADMIN. Ouvre le même formulaire pré-rempli avec les données actuelles.

### Logique réutilisée

Les endpoints `POST /api/v1/employees` (création) et `PUT /api/v1/employees/{id}` (modification) existaient déjà et appellent `EmployeeService.save()` / `EmployeeService.update()` — la même logique que le batch import. Aucune duplication de logique serveur.

### Règles de sécurité (côté serveur)

`SecurityConfiguration` mis à jour : POST, PUT et DELETE `/api/v1/employees/**` sont désormais réservés aux rôles **ADMIN** et **SUPER_ADMIN** uniquement (SUPERVISOR retiré).

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `config/SecurityConfiguration.java` | POST/PUT/DELETE employees → ADMIN + SUPER_ADMIN uniquement (retiré SUPERVISOR) |
| `modules/employee/components/EmployeeFormModal.tsx` | **NOUVEAU** — formulaire create/edit avec tous les champs, superviseur select, validation Zod |
| `modules/employee/components/columns.tsx` | Ajout `getColumnsWithActions(onEdit)` — exporte aussi `columns` (inchangé) pour compat. |
| `modules/employee/components/EmployeesClient.tsx` | Bouton "Nouvel employé", modal wiring, `tableColumns` conditionnel (ADMIN/SUPER_ADMIN) |
| `modules/employee/hooks/useCreateEmployee.ts` | Fix URL (`/api/v1/employees` → `/employees` car VITE_API_BASE_URL inclut déjà `/api/v1`) |
| `modules/employee/hooks/useUpdateEmployee.ts` | Fix URL idem |

### Comportement

- Le formulaire est un `Dialog` scrollable (max 90vh)
- Pré-remplissage automatique à l'ouverture en mode édition
- Uppercasing automatique de `fullName`, `department`, `jobTitle`, `productionLine`, `shift`, `employmentType` (cohérence avec le batch)
- Champ "Date de Départ" visible uniquement si "A quitté la société" est coché
- Le superviseur est sélectionnable via un `<select>` peuplé par `useFetchSupervisors`
- Erreurs backend affichées via `react-hot-toast` (liste si `errors[]` présent)

---

## Employés — Champs dynamiques du formulaire (session 2026-04-20)

### Champs convertis en `<select>`

| Champ | Source | Options | Obligatoire |
|---|---|---|---|
| **Poste Occupé** | `GET /api/v1/job-titles` (table `job_title`) | Toutes les entrées disponibles | ✅ Oui |
| **Département** | `GET /api/v1/departments` (table `department`) | Toutes les entrées + "— Aucun —" | ✅ Oui |
| **Ligne de Production** | `GET /api/v1/production-lines` (table `production_line`) | Toutes les lignes + "— Aucune —" | Non |
| **Type de Travail** | Liste fixe | `CADRE`, `INDIRECTS`, `DIRECTS` | ✅ Oui |
| **Poste (Shift)** | Liste fixe | `A`, `B` + "— Aucun —" | Non |

### Backend

- **`JobTitleService`** : méthode `findAll()` ajoutée — retourne `List<JobTitleMinimalDto>` (id + title)
- **`JobTitleController`** (NOUVEAU) : `GET /api/v1/job-titles` → liste des postes occupés
- **`DepartmentService`** : méthode `findAll()` ajoutée — retourne `List<DepartmentMinimalDto>` (id + name)
- **`DepartmentController`** (NOUVEAU) : `GET /api/v1/departments` → liste des départements
- **`SecurityConfiguration`** : `GET /api/v1/job-titles/**` + `GET /api/v1/departments/**` → `.authenticated()`

### Frontend

- **`useFetchJobTitles`** (NOUVEAU dans `modules/employee/hooks/`) — query key `["job-titles"]`, retourne `JobTitleOption[]`
- **`useFetchDepartments`** (NOUVEAU dans `modules/employee/hooks/`) — query key `["departments"]`, retourne `DepartmentOption[]`
- **`EmployeeFormModal`** — redesigné en 3 sections (Identité / Rattachement professionnel / Contrat / Options), grille 2 colonnes, labels avec astérisques obligatoires, champs département en `<select>` dynamique

### Sections du formulaire

| Section | Champs |
|---|---|
| **Identité** | Matricule, Civilité, Nom et Prénom, Email |
| **Rattachement professionnel** | Département, Poste Occupé, Type de Travail, Ligne de Production, Poste (Shift) |
| **Contrat** | Date d'Embauche, Superviseur |
| **Options** | Domiciliation Bancaire (checkbox), A quitté la société (checkbox), Est superviseur (checkbox), Date de Départ (conditionnel) |

---

## Employés — Désignation explicite superviseur (session 2026-04-21)

### Problème résolu

Un superviseur créé individuellement via "Nouvel employé" n'apparaissait pas dans le dropdown "Superviseur" car `findAllSupervisors()` requiert qu'au moins un employé référence cet employé via `supervisor_id`. Un nouveau superviseur sans opérateurs rattachés était invisible.

### Solution

Ajout d'un flag `supervisorRole` sur l'entité `Employee`. `findAllSupervisors()` retourne désormais les employés où `supervisorRole = true` **OU** qui ont des opérateurs actifs. L'admin coche "Est superviseur" dans le formulaire pour lever ce flag explicitement.

### Règles

- La création du compte utilisateur avec `UserRole.SUPERVISOR` était déjà correcte (comportement inchangé).
- Le flag `supervisorRole` n'affecte que la visibilité dans le dropdown superviseur — pas le rôle utilisateur.
- La logique d'import Excel est inchangée (les superviseurs y sont détectés implicitement par leur `operators`).
- Si un superviseur existant reçoit des opérateurs via import, il apparaîtra dans le dropdown même si `supervisorRole = false`.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `employee/Employee.java` | Champ `boolean supervisorRole` (default false) |
| `employee/dto/EmployeeRequestDto.java` | Champ `boolean supervisorRole` |
| `employee/EmployeeRepository.java` | `findAllSupervisors()` : `OR e.supervisorRole = true` |
| `employee/EmployeeService.java` | `setEmployeeFromRequestDTO` : `employee.setSupervisorRole(...)` |
| `modules/employee/types.ts` | `supervisorRole?: boolean` dans `Employee` et `EmployeeRequest` |
| `modules/employee/components/EmployeeFormModal.tsx` | Checkbox "Est superviseur" dans la section Options |

---

## Référentiels Organisation — CRUD complet (session 2026-04-20)

### Fonctionnalités ajoutées

CRUD complet (liste, créer, modifier, supprimer) pour les trois référentiels :
- **Département** (`/departments`) — table `department`
- **Poste Occupé** (`/job-titles`) — table `job_title`
- **Ligne de Production** (`/production-lines`) — table `production_line`

Accès limité aux rôles **ADMIN** et **SUPER_ADMIN** pour les opérations d'écriture.

### Contrôles métier

| Contrôle | Comportement |
|---|---|
| Champ vide | Exception `InvalidEntityException` — message explicite |
| Doublon (même nom, insensible à la casse) | Exception `InvalidEntityException` |
| Suppression si utilisé dans `employee` | Exception `InvalidOperationException` avec comptage |
| Suppression si utilisé dans `permutation` (ProductionLine) | Exception `InvalidOperationException` avec comptage |

### Endpoints ajoutés

| Méthode | URL | Rôles |
|---|---|---|
| `GET` | `/api/v1/departments` | Authentifié |
| `POST` | `/api/v1/departments` | ADMIN, SUPER_ADMIN |
| `PUT` | `/api/v1/departments/{id}` | ADMIN, SUPER_ADMIN |
| `DELETE` | `/api/v1/departments/{id}` | ADMIN, SUPER_ADMIN |
| `GET` | `/api/v1/job-titles` | Authentifié |
| `POST` | `/api/v1/job-titles` | ADMIN, SUPER_ADMIN |
| `PUT` | `/api/v1/job-titles/{id}` | ADMIN, SUPER_ADMIN |
| `DELETE` | `/api/v1/job-titles/{id}` | ADMIN, SUPER_ADMIN |
| `GET` | `/api/v1/production-lines` | Authentifié (exclut FORMATRICE, MAINTENANCE, FORMATION) |
| `GET` | `/api/v1/production-lines/admin` | Authentifié (toutes les lignes, pour le CRUD admin) |
| `POST` | `/api/v1/production-lines` | ADMIN, SUPER_ADMIN, **INGENIEUR_HSE** |
| `PUT` | `/api/v1/production-lines/{id}` | ADMIN, SUPER_ADMIN |
| `DELETE` | `/api/v1/production-lines/{id}` | ADMIN, SUPER_ADMIN |

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `organization/dto/DepartmentMinimalDto.java` | `@NoArgsConstructor` + `@AllArgsConstructor` ajoutés |
| `organization/dto/JobTitleMinimalDto.java` | `@NoArgsConstructor` + `@AllArgsConstructor` ajoutés |
| `organization/dto/ProductionLineMinimalDto.java` | `@NoArgsConstructor` + `@AllArgsConstructor` ajoutés |
| `organization/repository/DepartmentRepository.java` | `findByNameIgnoreCase`, `findByNameIgnoreCaseAndIdNot`, `countEmployeesByDepartmentId` |
| `organization/repository/JobTitleRepository.java` | `findByTitleIgnoreCase`, `findByTitleIgnoreCaseAndIdNot`, `countEmployeesByJobTitleId` |
| `organization/repository/ProductionLineRepository.java` | `findByNameIgnoreCase`, `findByNameIgnoreCaseAndIdNot`, `countEmployees...`, `countPermutations...` |
| `organization/service/DepartmentService.java` | Méthodes `create`, `update`, `delete` + toDto avec createdAt/updatedAt |
| `organization/service/JobTitleService.java` | Méthodes `create`, `update`, `delete` + toDto avec createdAt/updatedAt |
| `organization/service/ProductionLineService.java` | Méthodes `create`, `update`, `delete`, `findAllForAdmin` + toDto avec createdAt/updatedAt |
| `organization/controller/DepartmentController.java` | `POST`, `PUT /{id}`, `DELETE /{id}` |
| `organization/controller/JobTitleController.java` | `POST`, `PUT /{id}`, `DELETE /{id}` |
| `organization/controller/ProductionLineController.java` | `GET /admin`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| `config/SecurityConfiguration.java` | POST/PUT/DELETE org endpoints → ADMIN + SUPER_ADMIN uniquement |

### Fichiers créés (frontend)

| Fichier | Description |
|---|---|
| `modules/department/types.ts` | Types `Department`, `DepartmentRequest` |
| `modules/department/hooks/useFetchDepartments.ts` | Query `["departments"]` |
| `modules/department/hooks/useCreateDepartment.ts` | POST /departments |
| `modules/department/hooks/useUpdateDepartment.ts` | PUT /departments/{id} |
| `modules/department/hooks/useDeleteDepartment.ts` | DELETE /departments/{id} |
| `modules/department/components/DepartmentClient.tsx` | Page CRUD avec tableau + modale inline |
| `modules/job-title/types.ts` | Types `JobTitle`, `JobTitleRequest` |
| `modules/job-title/hooks/useFetchJobTitles.ts` | Query `["job-titles"]` |
| `modules/job-title/hooks/useCreateJobTitle.ts` | POST /job-titles |
| `modules/job-title/hooks/useUpdateJobTitle.ts` | PUT /job-titles/{id} |
| `modules/job-title/hooks/useDeleteJobTitle.ts` | DELETE /job-titles/{id} |
| `modules/job-title/components/JobTitleClient.tsx` | Page CRUD avec tableau + modale inline |
| `modules/production-line/types.ts` | Types `ProductionLine`, `ProductionLineRequest` |
| `modules/production-line/hooks/useFetchProductionLinesAdmin.ts` | Query `["production-lines-admin"]` — GET /production-lines/admin |
| `modules/production-line/hooks/useCreateProductionLine.ts` | POST /production-lines |
| `modules/production-line/hooks/useUpdateProductionLine.ts` | PUT /production-lines/{id} |
| `modules/production-line/hooks/useDeleteProductionLine.ts` | DELETE /production-lines/{id} |
| `modules/production-line/components/ProductionLineClient.tsx` | Page CRUD avec tableau + modale inline |
| `pages/DepartmentPage.tsx` | Page wrapper |
| `pages/JobTitlePage.tsx` | Page wrapper |
| `pages/ProductionLinePage.tsx` | Page wrapper |

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `App.tsx` | 3 nouvelles routes `/departments`, `/job-titles` (ADMIN + SUPER_ADMIN) ; `/production-lines` (ADMIN + SUPER_ADMIN + INGENIEUR_HSE) |
| `components/Sidebar.tsx` | Réorganisation en 5 groupes : Accueil / Gestion RH / Présences & Absences / Avances / Gestion. Les 3 nouveaux modules apparaissent dans "Gestion RH". |

### Structure Sidebar (nouvelle organisation)

```
Accueil
  └── Accueil

Gestion RH
  ├── Employés
  ├── Départements         ← NOUVEAU
  ├── Postes Occupés       ← NOUVEAU
  └── Lignes de Production ← NOUVEAU

Présences & Absences
  ├── Pointage
  ├── Présences / Absences
  └── Historique Présences

Avances
  ├── Avances
  └── Suivi avances

Gestion
  ├── Demandes Documents
  ├── Permutations
  ├── Opérateurs Disponibles
  └── EDI DELFOR → CSV
```

---

## Employés — Correctifs affichage superviseur (session 2026-04-22)

### Bug 1 — Superviseur sans superviseur affecté absent du tableau

**Cause** : `findPagedWithFilters` dans `EmployeeRepository` contenait `e.supervisor.matricule` dans le WHERE, ce qui provoque une **jointure INNER implicite** sur la table `employee` (auto-référence). Même quand `supervisorMatricule is null` (ADMIN), Hibernate générait un `INNER JOIN` qui filtrait les employés avec `supervisor_id IS NULL`.

**Correctif** : Ajout d'un `left join e.supervisor s` explicite dans la query et la countQuery. Remplacement de `e.supervisor.matricule` par `s.matricule` dans le WHERE.

| Fichier | Changement |
|---|---|
| `employee/EmployeeRepository.java` | `findPagedWithFilters` : `left join e.supervisor s`, `s.matricule` au lieu de `e.supervisor.matricule` |

### Bug 2 & 3 — supervisorRole réinitialisé à false lors de l'édition

**Cause** : `EmployeeDto` ne contenait pas le champ `supervisorRole`. À chaque ouverture du formulaire d'édition, le champ était pré-rempli à `false` (`undefined ?? false`). Soumettre le formulaire sans toucher la case écrasait la valeur `true` en base, faisant disparaître l'employé de `findAllSupervisors()`.

**Correctif** : Ajout de `private boolean supervisorRole;` dans `EmployeeDto`. MapStruct mappe automatiquement le champ depuis l'entité `Employee`.

| Fichier | Changement |
|---|---|
| `employee/dto/EmployeeDto.java` | Champ `supervisorRole` ajouté |

### Règle invariante

- `findAllSupervisors()` retourne les employés dont `supervisorRole = true` **OU** qui ont des opérateurs actifs rattachés — comportement inchangé.
- `supervisorRole` est le flag qui détermine la visibilité dans le dropdown superviseur, pas le `UserRole` de l'utilisateur associé.

---

## Gestion des utilisateurs — Module SUPER_ADMIN (session 2026-04-22)

### Fonctionnalités

Module accessible uniquement aux **SUPER_ADMIN** via `/user-management`. Il centralise :
- Tableau de bord statistiques (total, actifs, bloqués, connectés aujourd'hui, répartition par rôle)
- Liste paginée des comptes avec recherche temps réel
- Actions par ligne : Modifier (rôle + email), Bloquer/Débloquer, Voir l'historique
- Journal d'activité par utilisateur (paginé, filtrable par type d'événement et plage de dates)

### Traçage d'activité

Une table `user_activity_logs` enregistre les événements suivants :

| Type d'événement | Déclencheur |
|---|---|
| `LOGIN` | Connexion réussie (`AuthenticationService.login`) |
| `LOGIN_FAILED` | Tentative échouée (`AuthenticationService.login`) |
| `LOGOUT` | Déconnexion (`LogoutService`) |
| `PASSWORD_CHANGE` | Changement de mot de passe (`UserService.changePassword`) |
| `ACCOUNT_BLOCKED` | Blocage par un admin (`UserService.blockUser`) |
| `ACCOUNT_UNBLOCKED` | Déblocage par un admin (`UserService.blockUser`) |
| `ROLE_CHANGED` | Changement de rôle (`UserService.updateUser`) |

Le filtre JWT (`JwtAuthenticationFilter`) met à jour `lastActivityAt` + `lastActivityIp` sur l'entité `User` de manière **non bloquante** via `@Async` à chaque requête authentifiée.

### Blocage de compte

`User.isAccountNonLocked()` retourne `!blocked`. Un compte bloqué reçoit une erreur `423 Locked` au moment du login (géré automatiquement par Spring Security).

### Nouvelles colonnes sur `_user`

| Colonne | Type | Description |
|---|---|---|
| `blocked` | `boolean` (default false) | Compte bloqué |
| `last_login_at` | `timestamp` | Horodatage dernière connexion |
| `last_activity_at` | `timestamp` | Horodatage dernière requête authentifiée |
| `last_activity_ip` | `varchar` | IP dernière requête authentifiée |

### Endpoints ajoutés

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/api/v1/admin/users` | Liste tous les utilisateurs |
| `GET` | `/api/v1/admin/users/stats` | Statistiques tableau de bord |
| `PATCH` | `/api/v1/admin/users/{id}/block?blocked=true\|false` | Bloquer/débloquer |
| `PUT` | `/api/v1/admin/users/{id}` | Modifier rôle et/ou email |
| `GET` | `/api/v1/admin/users/{id}/activity` | Journal paginé (filtres: eventType, from, to) |

### Fichiers créés/modifiés (backend)

| Fichier | Changement |
|---|---|
| `user/User.java` | Champs `blocked`, `lastLoginAt`, `lastActivityAt`, `lastActivityIp` + `isAccountNonLocked()` |
| `user/UserActivityLog.java` | **NOUVEAU** — entité `user_activity_logs` |
| `user/UserActivityLogRepository.java` | **NOUVEAU** — queries filtrées + comptage connectés du jour |
| `user/UserActivityLogService.java` | **NOUVEAU** — logging async (`@Async`) |
| `user/dto/UserAdminDto.java` | **NOUVEAU** |
| `user/dto/UserStatsDto.java` | **NOUVEAU** |
| `user/dto/UserActivityLogDto.java` | **NOUVEAU** |
| `user/dto/UpdateUserRequest.java` | **NOUVEAU** |
| `user/UserService.java` | Méthodes admin : `findAllForAdmin`, `getStats`, `blockUser`, `updateUser`, `getActivity` |
| `user/UserAdminController.java` | **NOUVEAU** — `/api/v1/admin/users` |
| `auth/AuthenticationService.java` | `login()` accepte `HttpServletRequest`, log LOGIN/LOGIN_FAILED, met à jour `lastLoginAt` |
| `auth/AuthenticationController.java` | Passe `HttpServletRequest` à `login()` |
| `config/LogoutService.java` | Log LOGOUT async |
| `config/JwtAuthenticationFilter.java` | Met à jour `lastActivityAt` + IP async |
| `config/SecurityConfiguration.java` | `/api/v1/admin/**` → `SUPER_ADMIN` uniquement |
| `RhApplication.java` | `@EnableAsync` ajouté |

### Fichiers créés/modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/user-management/types.ts` | `UserAdmin`, `UserStats`, `UserActivityLog`, `UpdateUserRequest` |
| `modules/user-management/hooks/useFetchUsers.ts` | GET /admin/users |
| `modules/user-management/hooks/useFetchUserStats.ts` | GET /admin/users/stats |
| `modules/user-management/hooks/useFetchUserActivity.ts` | GET /admin/users/{id}/activity |
| `modules/user-management/hooks/useBlockUser.ts` | PATCH /admin/users/{id}/block |
| `modules/user-management/hooks/useUpdateUser.ts` | PUT /admin/users/{id} |
| `modules/user-management/components/UserManagementClient.tsx` | Page principale (stats + tableau + modales) |
| `modules/user-management/components/UserActivityModal.tsx` | Journal d'activité paginé avec filtres |
| `pages/UserManagementPage.tsx` | Page wrapper |
| `App.tsx` | Route `/user-management` (SUPER_ADMIN) |
| `components/Sidebar.tsx` | Groupe "Administration" avec "Gestion Utilisateurs" (SUPER_ADMIN) |

### Structure Sidebar (mise à jour)

```
Accueil / Gestion RH / Présences & Absences / Avances / Gestion (inchangés)

Administration          ← NOUVEAU (SUPER_ADMIN uniquement)
  └── Gestion Utilisateurs
```

---

## Correctif PostgreSQL — Requête filtrée UserActivityLog (session 2026-04-22)

### Problème

`GET /api/v1/admin/users/{id}/activity` levait une `PSQLException: could not determine data type of parameter` (SQLState 42P18) lorsque les filtres `from`, `to` ou `eventType` étaient `null`.

**Cause** : la requête JPQL utilisait le pattern `(:param IS NULL OR col >= :param)`. PostgreSQL ne peut pas inférer le type d'un paramètre `?` isolé dans une expression `? IS NULL` sans cast explicite.

### Correctif appliqué

Remplacement de la `@Query` JPQL par une requête **native PostgreSQL** avec `CAST(... AS <type>)` explicite sur chaque paramètre nullable. La `countQuery` correspondante a aussi été mise à jour.

| Fichier | Changement |
|---|---|
| `user/UserActivityLogRepository.java` | `@Query` JPQL → native SQL avec `CAST(:eventType AS varchar)`, `CAST(:from AS timestamp)`, `CAST(:to AS timestamp)` |

### Règle générale à retenir

Ne jamais utiliser `(:param IS NULL OR ...)` dans une `@Query` JPQL Spring Data avec PostgreSQL quand le paramètre est un type temporel ou enum. Utiliser soit des Specifications (if-null côté Java), soit une requête native avec `CAST(... AS type)`.

---

## Référentiels Organisation — Recherche et pagination (session 2026-04-24)

### Fonctionnalité ajoutée

Barre de recherche + pagination côté client (10 entrées/page) sur les trois modules de référentiels :
- **Départements** (`DepartmentClient.tsx`) — recherche sur `name`
- **Postes Occupés** (`JobTitleClient.tsx`) — recherche sur `title`
- **Lignes de Production** (`ProductionLineClient.tsx`) — recherche sur `name`

### Comportement

- Recherche insensible à la casse, filtre en temps réel via `useMemo`
- Bouton ✕ pour effacer la recherche instantanément
- Message `Aucun résultat pour « … »` si aucune entrée ne correspond
- La pagination se réinitialise à la page 1 lors de tout changement de recherche (`useEffect`)
- La pagination porte sur les résultats filtrés (pas sur la liste brute)
- Affichage `X–Y sur N résultat(s)` + contrôles prev/page numbers/next (fenêtre ±2)
- `PAGE_SIZE = 10` (constante locale dans chaque fichier)

### Pattern réutilisé

Identique aux patterns existants dans l'application :
- Barre de recherche : même style que `UserManagementClient.tsx`
- Contrôles de pagination : même style que `EmployeesClient.tsx`

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `modules/department/components/DepartmentClient.tsx` | Barre de recherche + pagination client-side |
| `modules/job-title/components/JobTitleClient.tsx` | Barre de recherche + pagination client-side |
| `modules/production-line/components/ProductionLineClient.tsx` | Barre de recherche + pagination client-side |

---

## Module Requests — Actions rapides et bulk update (session 2026-04-24)

### Fonctionnalités ajoutées

Réservées aux rôles **ADMIN** et **SUPER_ADMIN** uniquement. Les SUPERVISOR continuent à voir le tableau sans ces fonctionnalités.

#### Modification 1 — Actions rapides par ligne
Deux icônes d'action ajoutées dans la colonne Actions de chaque ligne :

| Icône | Action | Statut cible |
|---|---|---|
| ✅ `CheckCircle` | Marquer comme traité | **TRAITÉ** |
| ❌ `XCircle` | Marquer comme annulé | **ANNULÉ** |

- Confirmation Swal avant application
- Désactivées (opacity 30%) si le statut est déjà **TRAITÉ** ou **ANNULÉ**
- Endpoint : `PATCH /api/v1/requests/{id}/status` avec body `{ status }`

#### Modification 2 — Traitement en masse (bulk)
- Case à cocher en début de chaque ligne (ADMIN/SUPER_ADMIN uniquement)
- Case à cocher globale en en-tête (sélectionne/désélectionne toutes les lignes de `data`)
- Barre d'actions contextuelle apparaît dès qu'au moins une ligne est sélectionnée :
  - Affiche le nombre sélectionné
  - Bouton "Marquer traité" (vert)
  - Bouton "Marquer annulé" (rouge)
  - Bouton "Désélectionner"
- Confirmation Swal avant application
- Résumé post-mutation : `N mise(s) à jour réussie(s), M ignorée(s)` si certaines étaient déjà finalisées
- Endpoint : `PATCH /api/v1/requests/bulk-status` avec body `{ ids: string[], status }`

### Nouveaux endpoints backend

| Méthode | URL | Rôles | Description |
|---|---|---|---|
| `PATCH` | `/api/v1/requests/{id}/status` | ADMIN, SUPER_ADMIN | Mise à jour individuelle du statut |
| `PATCH` | `/api/v1/requests/bulk-status` | ADMIN, SUPER_ADMIN | Mise à jour en masse du statut |

### Fichiers créés/modifiés (backend)

| Fichier | Changement |
|---|---|
| `request/dto/PatchStatusDto.java` | **NOUVEAU** — `{ status: RequestStatus }` |
| `request/dto/BulkStatusUpdateDto.java` | **NOUVEAU** — `{ ids: List<Long>, status: RequestStatus }` |
| `request/dto/BulkStatusResultDto.java` | **NOUVEAU** — `{ updated: int, skipped: int }` |
| `request/RequestService.java` | `patchStatus` + `bulkPatchStatus` — ADMIN/SUPER_ADMIN uniquement, skip si déjà dans le statut cible |
| `request/RequestController.java` | `PATCH /{id}/status` + `PATCH /bulk-status` |
| `config/SecurityConfiguration.java` | `PATCH /api/v1/requests/**` → ADMIN + SUPER_ADMIN uniquement |

### Fichiers créés/modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/request/hooks/useUpdateRequestStatus.ts` | **NOUVEAU** — `PATCH /requests/{id}/status` |
| `modules/request/hooks/useBulkUpdateRequestStatus.ts` | **NOUVEAU** — `PATCH /requests/bulk-status`, retourne `BulkStatusResult` |
| `modules/request/components/columns.tsx` | Remplacé `columns` par `getColumns(opts)` — ajoute colonne checkbox + icônes statut dans actions |
| `modules/request/components/RequestsClient.tsx` | État `selectedIds: Set<string>`, barre bulk, passage de `getColumns` via `useMemo` |

### Architecture — Sélection externe au DataTable

La sélection est gérée **en dehors** de TanStack Table (via `useState<Set<string>>`). Les colonnes sont recalculées via `useMemo` dès que `selectedIds` change. TanStack Table v8 ne réinitialise pas son état interne (filtres, tri) lors d'un changement de définition de colonnes — le comportement est donc préservé.

---

## Traçabilité présences — Audit log (session 2026-04-24)

### Fonctionnalité

Enregistrement et affichage d'un historique complet de toutes les créations et modifications effectuées dans les modules **présences-absences** et **historique-présences**.

### Événements tracés

| Module | Opération | Déclencheur |
|---|---|---|
| PRESENCE_ABSENCE | CREATION | `POST /attendances/manual-entry` — saisie manuelle par superviseur (une ligne par employé) |
| PRESENCE_ABSENCE | CREATION | `POST /attendances/batch-save` — import XLSX (une ligne agrégée, employee=null) |
| PRESENCE_ABSENCE | MODIFICATION | Ré-soumission de la saisie manuelle sur un enregistrement existant |
| PRESENCE_ABSENCE | MODIFICATION | `PUT /attendances/{id}` depuis le module présences |
| HISTORIQUE_PRESENCE | MODIFICATION | `PUT /attendances/{id}?module=HISTORIQUE_PRESENCE` depuis le module historique |

Pour `updateAttendance`, une ligne de log est créée **par champ modifié** (heure d'entrée, heure de sortie, motif) en comparant l'état avant et après.

### Table de base de données

```
presence_audit_logs
  - id (BIGSERIAL PK)
  - action_type       VARCHAR(30) — CREATION / MODIFICATION / SUPPRESSION
  - module            VARCHAR(40) — PRESENCE_ABSENCE / HISTORIQUE_PRESENCE
  - performed_by_id   BIGINT FK → _user
  - performed_at      TIMESTAMP
  - employee_id       BIGINT FK → employee (nullable — null pour les imports batch)
  - field_changed     VARCHAR(60) nullable
  - old_value         VARCHAR(500) nullable
  - new_value         VARCHAR(500) nullable
  - ip_address        VARCHAR(50)
  - detail            VARCHAR(1000)
```

### Endpoint

`GET /api/v1/presence-audit-logs` — paginé, paramètres optionnels :

| Param | Description |
|---|---|
| `module` | PRESENCE_ABSENCE ou HISTORIQUE_PRESENCE |
| `actionType` | CREATION, MODIFICATION, SUPPRESSION |
| `performedByMatricule` | Matricule de l'utilisateur (ADMIN uniquement — forcé pour SUPERVISOR/NURSE) |
| `employeeMatricule` | Matricule de l'employé concerné |
| `from` / `to` | Plage de dates ISO DateTime |
| `page` / `size` | Pagination (défaut : 0 / 20) |

**Contrôle d'accès** : ADMIN et SUPER_ADMIN voient tous les logs. SUPERVISOR et NURSE voient uniquement leurs propres actions (filtre `performedByMatricule` forcé côté serveur).

### Architecture — isolation par transaction séparée

Le logging utilise `@Transactional(propagation = Propagation.REQUIRES_NEW)` — chaque appel d'audit s'exécute dans une transaction indépendante et committée séparément. Les callers dans `AttendanceService` entourent les appels d'audit d'un `try-catch` : une erreur d'audit n'impacte pas l'opération principale.

### Fichiers créés/modifiés (backend)

| Fichier | Changement |
|---|---|
| `attendance/audit/PresenceAuditLog.java` | **NOUVEAU** — entité `presence_audit_logs` |
| `attendance/audit/PresenceAuditLogRepository.java` | **NOUVEAU** — requête native filtrée (pattern CAST pour PostgreSQL) |
| `attendance/audit/PresenceAuditLogService.java` | **NOUVEAU** — `@Async` logCreation / logModification / logDeletion + toDto |
| `attendance/audit/PresenceAuditLogDto.java` | **NOUVEAU** — DTO réponse |
| `attendance/controller/PresenceAuditLogController.java` | **NOUVEAU** — `GET /api/v1/presence-audit-logs` |
| `attendance/service/AttendanceService.java` | Injection `PresenceAuditLogService`, audit dans `saveManualEntry`, `updateAttendance`, `saveAll` — passe des IDs (pas d'entités) |
| `attendance/controller/AttendanceController.java` | `HttpServletRequest` pour capturer l'IP via `IpUtils` ; `Principal` + `module` param sur `PUT /{id}` |
| `config/SecurityConfiguration.java` | `GET /api/v1/presence-audit-logs/**` → ADMIN, SUPER_ADMIN, SUPERVISOR, NURSE |

### Fichiers créés/modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/presence/types.ts` | Types `PresenceAuditLog` et `PresenceAuditLogsPage` ajoutés |
| `modules/presence/hooks/useFetchPresenceAuditLogs.ts` | **NOUVEAU** — query `["presence-audit-logs", filters]` |
| `modules/presence/components/PresenceAuditLogPanel.tsx` | **NOUVEAU** — tableau de logs avec filtres + pagination |
| `modules/presence/components/PresenceClient.tsx` | Tab switcher "Présences du jour" / "Historique des modifications" |
| `modules/presence/hooks/useUpdateAttendance.ts` | Invalide `["presence-audit-logs"]` après mutation |
| `modules/presence/hooks/useManualPresenceSave.ts` | Invalide `["presence-audit-logs"]` après mutation |
| `modules/history/components/HistoryClient.tsx` | Tab switcher + onglet "Historique des modifications" avec `module=HISTORIQUE_PRESENCE` |
| `modules/history/hooks/useUpdateHistoryAttendance.ts` | Passe `?module=HISTORIQUE_PRESENCE` + invalide `["presence-audit-logs"]` |

---

## Correctifs Traçabilité Présences (session 2026-04-25)

### Bug 1 — Logs HISTORIQUE_PRESENCE vides

**Cause racine** : `PresenceAuditLogService` recevait des entités JPA (`User`, `Employee`) issues du contexte de persistance du thread principal. Dans le thread `@Async` (contexte JPA différent), Hibernate 6 levait silencieusement une `DetachedObjectException` lors du `repository.save(entry)`, empêchant la création de tout log issu de `updateAttendance` — donc tous les logs `HISTORIQUE_PRESENCE` (seule source : édition depuis le module Historique).

**Correctif** : Les méthodes `logCreation`, `logModification`, `logDeletion` acceptent désormais des IDs (`Long performedById`, `Long employeeId`) au lieu d'entités. Les entités sont rechargées via `userRepository` et `employeeRepository` dans la propre transaction `@Transactional` du thread async (pattern identique à `UserActivityLogService`).

| Fichier | Changement |
|---|---|
| `attendance/audit/PresenceAuditLogService.java` | Signatures → IDs ; injection `UserRepository` + `EmployeeRepository` ; `@Transactional` sur chaque méthode async |
| `attendance/service/AttendanceService.java` | Appels audit mis à jour (`user.getId()`, `employee.getId()`) ; import `UserRepository` retiré |

### Bug 2 — Adresse IP = `0:0:0:0:0:0:0:1` (loopback IPv6)

**Cause** : Chaque service avait sa propre méthode `resolveClientIp` qui ne lisait que `X-Forwarded-For`, sans lire `X-Real-IP` ni le header `Forwarded` standard.

**Correctif** : Création de `IpUtils.resolveClientIp(request)` (méthode statique utilitaire). Priorité : `X-Forwarded-For` → `X-Real-IP` → `Forwarded` → `request.getRemoteAddr()`.

| Fichier | Changement |
|---|---|
| `config/IpUtils.java` | **NOUVEAU** — utilitaire centralisé de résolution d'IP client |
| `attendance/controller/AttendanceController.java` | `resolveIp` délègue à `IpUtils.resolveClientIp` |
| `config/JwtAuthenticationFilter.java` | `resolveClientIp` délègue à `IpUtils.resolveClientIp` |
| `auth/AuthenticationService.java` | `resolveClientIp` délègue à `IpUtils.resolveClientIp` |

### Règle générale

Ne jamais passer d'entités JPA à des méthodes `@Async` : elles deviennent détachées dans le nouveau thread et Hibernate 6 lève une exception lors du `persist`. Toujours passer des IDs et recharger dans la transaction du thread async.

---

## Correctifs Traçabilité Présences — Investigation approfondie (session 2026-04-25)

### Contexte

Les corrections de la session précédente (passer des IDs au lieu d'entités) n'avaient produit **aucun changement observable** : le panneau HISTORIQUE_PRESENCE restait vide et les IPs restaient à `0:0:0:0:0:0:0:1`. Une investigation complète du flux a été menée.

---

### Bug 1 — Cause racine réelle : `@Async` + `@Transactional` — ordre du proxy indéterminé

**Le correctif précédent (IDs au lieu d'entités) était nécessaire mais insuffisant.**

Lorsque `@Async` et `@Transactional` sont tous deux à `Ordered.LOWEST_PRECEDENCE` (valeur par défaut), Spring ne garantit pas quel proxy s'applique en premier. Si `@Transactional` s'applique dans le thread appelant et que `@Async` soumet la tâche à un executor, le thread executor reçoit une `Runnable` qui s'exécute **en dehors de toute transaction active**. Le `repository.save()` échoue alors silencieusement (capturé par le `try-catch` dans `persist()`), sans qu'aucune exception ne remonte.

**Correctif appliqué :**

- `@Async` supprimé de toutes les méthodes de `PresenceAuditLogService`
- `@Transactional` → `@Transactional(propagation = Propagation.REQUIRES_NEW)` sur `logCreation`, `logModification`, `logDeletion`
- `try-catch` retiré de `persist()` (les exceptions propagent jusqu'à la limite `REQUIRES_NEW`)
- `try-catch` ajouté dans **tous les callers** dans `AttendanceService` (`updateAttendance`, `saveManualEntry`, `saveAll`) pour protéger l'opération principale

| Fichier | Changement |
|---|---|
| `attendance/audit/PresenceAuditLogService.java` | Suppression `@Async` ; `@Transactional(REQUIRES_NEW)` ; `try-catch` retiré de `persist()` ; `@Slf4j` Lombok |
| `attendance/service/AttendanceService.java` | `try-catch` autour de chaque appel `auditLogService.log*()` dans les 3 méthodes d'écriture |

---

### Bug 2 — Cause racine réelle : `LogoutService` non corrigé + `::1` = config développeur

**Correctif manqué** : `LogoutService` possédait sa propre implémentation locale de `resolveClientIp` qui lisait uniquement `X-Forwarded-For` puis tombait sur `remoteAddr` — sans déléguer à `IpUtils`. La session 2026-04-25 initiale avait documenté le fix mais ne l'avait pas appliqué à ce fichier.

**`::1` n'est pas un bug d'application** : `::1` est le loopback IPv6. Il n'apparaît que lorsque le navigateur se connecte via `localhost`. Si `VITE_API_BASE_URL=http://localhost:9000/api/v1`, le serveur voit `::1`. **Solution développeur** : remplacer `localhost` par l'IP réelle de la machine dans `.env.development`.

**`server.forward-headers-strategy=NATIVE`** : ajouté pour activer `RemoteIpValve` de Tomcat en production derrière un reverse proxy (Nginx) — permet de lire `X-Forwarded-For` correctement.

**`IpUtils` amélioré** : ajout de `normalize()` qui supprime le préfixe `::ffff:` des adresses IPv4 mappées IPv6 (ex. `::ffff:192.168.9.222` → `192.168.9.222`). Ajout d'un log DEBUG avec l'URI lors du fallback sur `remoteAddr`.

| Fichier | Changement |
|---|---|
| `config/LogoutService.java` | `resolveClientIp` délègue à `IpUtils.resolveClientIp(request)` (fix manqué) |
| `backend/src/main/resources/application.properties` | `server.forward-headers-strategy=NATIVE` ajouté |
| `config/IpUtils.java` | `normalize()` pour `::ffff:` ; log DEBUG fallback ; Javadoc `::1` |

---

### Règle générale mise à jour

**`@Async` + `@Transactional` ne sont pas sûrs ensemble** sans configuration explicite de l'ordre des advisors. Pour des opérations d'audit isolées, utiliser `@Transactional(propagation = Propagation.REQUIRES_NEW)` seul (synchrone, transaction séparée) et placer le `try-catch` dans l'appelant.

---

## Dashboard OPERATIONAL_MANAGER — Coefficient heures projet (session 2026-05-06)

### Modification appliquée

Les colonnes **"Heures ajoutées"** et **"Heures transférées"** du tableau **"Détails par projet"** (dashboard `OPERATIONAL_MANAGER`) sont désormais multipliées par le coefficient `7.67 / 8` avant affichage.

### Formule

```
Heures ajoutées    = valeur_brute × 7.67 / 8
Heures transférées = valeur_brute × 7.67 / 8
```

`valeur_brute` = `nb_operators × (minutes/60) × days` calculé depuis les permutations acceptées.

### Scope de la modification

Le coefficient est appliqué **côté backend** dans `DashboardService.computeProjectHours()` juste avant la construction du `ProjectHoursRowDTO`. Il se propage automatiquement à :
- La colonne "Ajoutées" et "Transférées" du tableau "Détails par projet"
- Les cartes KPI "Heures Ajoutées" / "Heures Transférées"
- Tous les graphiques (gauge, barres, top projets, analyse par superviseur)
- Les exports Excel et PDF

Les dashboards des autres rôles (ADMIN, SUPER_ADMIN, SUPERVISOR) ne sont pas affectés.

### Fichier modifié (backend)

| Fichier | Changement |
|---|---|
| `dashboard/DashboardService.java` | `.heuresAjoutees(round2(a.getHeuresAjoutees() * 7.67 / 8))` et `.heuresTransferees(round2(a.getHeuresTransferees() * 7.67 / 8))` dans `computeProjectHours()` |

---

## Dashboard OPERATIONAL_MANAGER — Correctif équilibre heures (session 2026-05-15)

### Problème corrigé

Les colonnes **"Ajoutées"** et **"Transférées"** du tableau "Détails par projet" étaient déséquilibrées : le total des ajoutées différait du total des transférées.

### Cause racine

Dans `computeProjectHours()`, les heures ajoutées étaient calculées pour **tous** les opérateurs de la permutation (`ops.size() * hoursPerOperator`), mais les heures transférées n'étaient calculées que pour les opérateurs dont le projet source (`op.productionLine`) était **différent** du projet destination. Les opérateurs avec `productionLine = null` ou avec la même ligne de production que la destination étaient comptés en "ajoutées" mais pas en "transférées" → déséquilibre.

### Correctif

Les calculs (A) ajoutées et (B) transférées sont fusionnés en **une seule boucle par opérateur**. Un opérateur est compté uniquement si son projet source (`op.productionLine`) est non-null et différent du projet destination. Ainsi, chaque heure ajoutée a exactement une heure transférée correspondante.

### Invariant garanti

```
Σ heuresAjoutees = Σ heuresTransferees  (au niveau du total)
```

### Fichier modifié (backend)

| Fichier | Changement |
|---|---|
| `dashboard/DashboardService.java` | Étapes (A) et (B) fusionnées en une seule boucle par opérateur dans `computeProjectHours()` |

---

## Rôle INGENIEUR_HSE + Modules HSE (session 2026-05-06)

### Nouveau rôle

`INGENIEUR_HSE` ajouté à `UserRole` avec un jeu de permissions vide (identique à NURSE). La création de compte suit la même logique que les autres rôles (depuis le module Gestion des utilisateurs). Le rôle est visible dans la sidebar avec le libellé "Ingénieur HSE".

### Structure de données

```
checklist_templates   — modèles de checklists (titre, description, créateur)
checklist_categories  — catégories de points (reliées au template)
checklist_items       — points à vérifier (reliés à une catégorie)
checklist_instances   — checklists remplies (date, en-tête, statut BROUILLON/COMPLETE)
checklist_responses   — réponse par point (OK / NOK / NA + description écart)
checklist_assignments — actions correctives liées à une instance
audits                — audits (date, ligne/zone, template, employé assigné, statut, notes)
```

### Endpoints HSE

| Méthode | URL | Rôles |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/v1/checklist-templates/**` | INGENIEUR_HSE, ADMIN, SUPER_ADMIN |
| `GET/POST/PUT/DELETE` | `/api/v1/checklist-instances/**` | INGENIEUR_HSE, ADMIN, SUPER_ADMIN |
| `GET/POST/PUT/PATCH/DELETE` | `/api/v1/audits/**` | INGENIEUR_HSE, ADMIN, SUPER_ADMIN |

### Accès en lecture seule

ADMIN et SUPER_ADMIN voient les deux modules mais l'UI cache les boutons de création/modification/suppression (contrôle via `role === "INGENIEUR_HSE"` dans les composants).

### Modules frontend

| Module | Description |
|---|---|
| `modules/checklist/` | Types, hooks (8), TemplateBuilder, ChecklistFillForm, ChecklistClient |
| `modules/audit/` | Types, hooks (4), AuditFormModal, AuditClient |

### Sidebar — groupe HSE

```
HSE (visible pour INGENIEUR_HSE, ADMIN, SUPER_ADMIN)
  ├── Checklists   → /checklists
  └── Audits       → /audits
```

### Fichiers créés (backend)

| Package | Fichiers clés |
|---|---|
| `hse/checklist/entity/` | ChecklistTemplate, ChecklistCategory, ChecklistItem, ChecklistInstance, ChecklistResponse, ChecklistAssignment |
| `hse/checklist/dto/` | ChecklistTemplateDto, ChecklistTemplateSummaryDto, ChecklistInstanceDto, SaveTemplateRequest, SaveInstanceRequest, … |
| `hse/checklist/repository/` | ChecklistTemplateRepository, ChecklistItemRepository, ChecklistInstanceRepository |
| `hse/checklist/service/` | ChecklistTemplateService, ChecklistInstanceService |
| `hse/checklist/controller/` | ChecklistTemplateController, ChecklistInstanceController |
| `hse/audit/entity/` | Audit (statuts : EN_ATTENTE, EN_COURS, TERMINE, ANNULE) |
| `hse/audit/dto/` | AuditDto, CreateAuditRequest |
| `hse/audit/repository/` | AuditRepository |
| `hse/audit/service/` | AuditService |
| `hse/audit/controller/` | AuditController |

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `user/UserRole.java` | `INGENIEUR_HSE` ajouté (permissions vides) |
| `config/SecurityConfiguration.java` | Routes `/api/v1/checklist-*/**` et `/api/v1/audits/**` → INGENIEUR_HSE + ADMIN + SUPER_ADMIN ; `/api/v1/users/**` inclut INGENIEUR_HSE |

### Fichiers créés (frontend)

| Fichier | Description |
|---|---|
| `modules/checklist/types.ts` | Types ChecklistTemplate, ChecklistInstance, SaveTemplateRequest, … |
| `modules/checklist/hooks/` | useFetchTemplates, useFetchTemplateById, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useFetchInstances, useFetchInstanceById, useCreateInstance, useUpdateInstance |
| `modules/checklist/components/TemplateBuilder.tsx` | Constructeur dynamique de modèles (catégories + points) |
| `modules/checklist/components/ChecklistFillForm.tsx` | Formulaire de remplissage (réponses OK/NOK/NA + assignations) |
| `modules/checklist/components/ChecklistClient.tsx` | Page principale avec onglets Modèles / Checklists remplies |
| `modules/audit/types.ts` | Types Audit, AuditsPage, CreateAuditRequest |
| `modules/audit/hooks/` | useFetchAudits, useCreateAudit, useUpdateAudit, usePatchAuditStatus |
| `modules/audit/components/AuditFormModal.tsx` | Formulaire de création/édition d'un audit |
| `modules/audit/components/AuditClient.tsx` | Page principale des audits avec tableau + détail |
| `pages/ChecklistPage.tsx` | Page wrapper |
| `pages/AuditPage.tsx` | Page wrapper |

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/auth/types.ts` | `"INGENIEUR_HSE"` ajouté à `UserRole` |
| `components/Sidebar.tsx` | `HSE_ITEMS` + groupe "HSE" ; `roleLabelMap` ; bouton "Changer mot de passe" inclut INGENIEUR_HSE |
| `App.tsx` | Routes `/checklists` et `/audits` (INGENIEUR_HSE + ADMIN + SUPER_ADMIN) ; `/change-password` inclut INGENIEUR_HSE |

---

## Correctifs sécurité — INGENIEUR_HSE + SUPER_ADMIN (session 2026-05-07)

### Bug 0 — INGENIEUR_HSE redirigé vers /unauthorized après connexion

**Cause** : Après login réussi, `LoginCard.tsx` redirige tout rôle non-NURSE vers `/`. La route `/` est protégée par `ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER", "SUPER_ADMIN"]}` qui ne connaît pas `INGENIEUR_HSE` → redirection vers `/unauthorized`.

**Correction** : Ajout d'un cas dédié dans la logique de destination post-login.

| Fichier | Changement |
|---|---|
| `modules/auth/components/LoginCard.tsx` | `INGENIEUR_HSE` → `/checklists` (comme `NURSE` → `/presence-absences`) |

**Règle générale** : Tout nouveau rôle sans accès à `/` doit avoir sa propre entrée dans la logique `destination` de `LoginCard.tsx`.

### Bug 1 — INGENIEUR_HSE absent du sélecteur de rôle (User Management)

**Cause** : La constante `ROLES` dans `UserManagementClient.tsx` était une liste statique qui n'avait pas été mise à jour après l'ajout du rôle.

**Correction** : `INGENIEUR_HSE` ajouté à `ROLES` et `ROLE_LABELS` dans le composant.

| Fichier | Changement |
|---|---|
| `modules/user-management/components/UserManagementClient.tsx` | `"INGENIEUR_HSE"` ajouté à `ROLES` ; `INGENIEUR_HSE: "Ingénieur HSE"` ajouté à `ROLE_LABELS` |

### Bug 2 — SUPER_ADMIN bloqué sur employees, salary-advances, suivi-superviseurs

**Cause racine** : `SecurityConfiguration.java` contenait un **bloc dupliqué de règles** (lignes 55–65) placé *avant* le `WHITE_LIST_URL`. Ces règles pour `/api/v1/salary-advances/**` et `GET /api/v1/employees/**` n'incluaient pas `SUPER_ADMIN`. Spring Security évalue les règles dans l'ordre (premier match gagne), donc ces règles prématurées bloquaient le `SUPER_ADMIN` avant que les règles correctes (lignes 77+, avec SUPER_ADMIN) soient atteintes.

De plus, `/api/v1/salary-advance-requests/**` n'existait que dans le bloc dupliqué (sans SUPER_ADMIN) — aucune règle dans le second bloc.

**Correction** :
- Suppression du bloc dupliqué en tête de la config (lignes 55–65)
- Ajout d'une règle propre pour `/api/v1/salary-advance-requests/**` avec ADMIN + SUPERVISOR + SUPER_ADMIN dans le second bloc

| Fichier | Changement |
|---|---|
| `config/SecurityConfiguration.java` | Bloc dupliqué avant whitelist supprimé ; `/api/v1/salary-advance-requests/**` → ADMIN + SUPERVISOR + SUPER_ADMIN dans le bloc principal |

### Règle générale à retenir

Ne jamais dupliquer des règles `requestMatchers` dans `SecurityConfiguration`. Toujours placer `WHITE_LIST_URL` en premier, puis définir chaque endpoint **une seule fois** avec l'ensemble complet des rôles autorisés.

---

## Module Checklist — Vue Détails fidèle à l'Excel (session 2026-05-07)

### Fonctionnalité

Bouton **"Détails"** (icône `FileText`, couleur `accent2`) ajouté sur chaque ligne de la liste "Checklists remplies". Il ouvre une modal plein-écran `ChecklistDetailModal` reproduisant fidèlement la mise en page du document **SAGE-FOR-DRH-62 — Checklist GEMBA WALK HSE**.

### Structure de la modal

1. **En-tête document** — bandeau bleu avec titre + référence/révision/date ; grille 2×3 (Date, Ligne/Unité, Chef d'équipe | Auditeur, Visa auditeur, Responsable Ligne/Unité)
2. **Tableau des points** — colonnes N° / Catégorie (rowSpan) / Points à vérifier / Critères OK / OK / N'OK / NA / Description de l'écart. Numérotation globale continue. Fond rouge pâle sur les lignes N'OK.
3. **Bloc score** — décompte OK/N'OK/NA, formule Résultat = (OK / total) × 100, badge de **niveau d'audit** coloré dynamiquement.
4. **Tableau de suivi des assignations** — N° / Action / Responsable / Délai / Date Réalisation.
5. Bouton **"Exporter PDF"** (jsPDF + autoTable) — page 1 : en-tête + tableau des points + score ; page 2 (si assignations) : tableau de suivi. Format paysage A4.

### Niveaux d'audit

| Seuil | Niveau | Couleur | Message |
|---|---|---|---|
| 0–59% | Niveau 2/3 | Rouge | Arrêter l'activité — Réunion urgente |
| 60–95% | Niveau 1 | Jaune/Orange | Escalation TOP Five — Actions correctives rapides |
| 96–100% | Niveau 0 | Vert | Rien à signaler |

### Fichiers créés/modifiés

| Fichier | Changement |
|---|---|
| `modules/checklist/components/ChecklistDetailModal.tsx` | **NOUVEAU** — modal de détail + export PDF |
| `modules/checklist/components/ChecklistClient.tsx` | Import `ChecklistDetailModal` + `FileText` ; état `detailInstanceId` ; bouton Détails séparé du bouton Modifier |

---

## Module Audit — Calendrier de planification (session 2026-05-07)

### Fonctionnalité

Onglet **"Calendrier"** ajouté dans le module Audit, à côté de l'onglet "Liste des audits".

### Vues disponibles

| Vue | Description |
|---|---|
| **Mois** (défaut) | Grille mensuelle 7 colonnes — 3 audits max par jour, "+N autre(s)" si dépassement |
| **Semaine** | 7 colonnes pour la semaine courante avec tous les audits du jour |
| **Liste** | Table triée chronologiquement — toutes les dates |

### Comportement

- Navigation mois/semaine avec flèches ← →
- Badge coloré par statut : 🔵 EN_ATTENTE · 🟡 EN_COURS · 🟢 TERMINÉ · 🔴 ANNULÉ
- Clic sur un événement → popup de détail avec bouton "Modifier l'audit" (INGENIEUR_HSE uniquement)
- Clic sur une case vide du calendrier → ouvre "Nouvel audit" avec la date pré-remplie (INGENIEUR_HSE uniquement)
- ADMIN/SUPER_ADMIN : accès lecture seule (pas de bouton "Planifier")
- Données : `GET /audits?page=0&size=500` — queryKey `["audits", "calendar"]` auto-invalidé par les mutations existantes

### Fichiers créés/modifiés

| Fichier | Changement |
|---|---|
| `modules/audit/hooks/useFetchAllAuditsForCalendar.ts` | **NOUVEAU** — fetch size=500 ; queryKey `["audits", "calendar"]` |
| `modules/audit/components/AuditCalendar.tsx` | **NOUVEAU** — vues mois/semaine/liste avec date-fns/fr + popup détail |
| `modules/audit/components/AuditFormModal.tsx` | Prop `prefilledDate?: string` pour pré-remplir la date depuis le calendrier |
| `modules/audit/components/AuditClient.tsx` | État `tab: "liste" \| "calendrier"` ; onglet switcher ; `prefilledDate` ; `handleCreate(date?)` |

---

## Module Audit — Améliorations complètes HSE (session 2026-05-08)

### Fonctionnalités ajoutées

1. **Vue employé assigné** (`/my-audits`) — Page dédiée au rôle SUPERVISOR listant ses audits assignés avec bouton "Remplir le checklist" (formulaire `ChecklistFillForm`).
2. **Traçabilité audit** — Journal d'activité par audit (`audit_activity_logs`) et tableau de bord stats (total/EN_ATTENTE/EN_COURS/TERMINE/ANNULE/taux).
3. **Système de rappels automatiques** — Scheduler horaire envoyant notifications in-app + emails 24h avant et le jour J.
4. **Transitions de statut automatiques** — EN_ATTENTE → EN_COURS à l'ouverture du formulaire ; EN_COURS → TERMINE à la validation.
5. **Filtres avancés** — Filtre par statut, ligne/zone, auditeur (CADRE uniquement), date.
6. **Avancement + Score** — Colonne barre de progression (`filledCount/totalCount`) et badge score coloré par niveau.

### Nouvelles tables DB

```
audits (champs ajoutés)
  - reminder_24h_sent    BOOLEAN default false — dédup rappel 24h
  - reminder_day_sent    BOOLEAN default false — dédup rappel jour J
  - started_at           TIMESTAMP nullable — horodatage passage EN_COURS
  - completed_at         TIMESTAMP nullable — horodatage passage TERMINE

audit_activity_logs
  - id                   BIGSERIAL PK
  - audit_id             BIGINT FK → audits
  - event_type           VARCHAR(50) — PLANIFIE, EN_COURS, TERMINE, ANNULE, MODIFIE
  - performed_by_id      BIGINT FK → _user (nullable)
  - performed_at         TIMESTAMP
  - detail               VARCHAR(500) nullable
```

### Nouveaux endpoints backend

| Méthode | URL | Rôles | Description |
|---|---|---|---|
| `GET` | `/api/v1/audits/stats` | INGENIEUR_HSE, ADMIN, SUPER_ADMIN | Statistiques globales |
| `GET` | `/api/v1/audits/my-audits` | SUPERVISOR (+ HSE/ADMIN/SUPER_ADMIN) | Audits de l'utilisateur connecté |
| `GET` | `/api/v1/audits/cadre-employees` | INGENIEUR_HSE, ADMIN, SUPER_ADMIN | Employés de type CADRE |
| `GET` | `/api/v1/audits/{id}/activity` | INGENIEUR_HSE, ADMIN, SUPER_ADMIN | Journal d'activité d'un audit |
| `GET` | `/api/v1/audits` | + SUPERVISOR | Filtres : status, lineZone, employeeId, from, to |
| `PATCH` | `/api/v1/audits/{id}/status` | + SUPERVISOR | Prend `Principal` en paramètre |

### Fichiers créés (backend)

| Fichier | Description |
|---|---|
| `hse/audit/entity/AuditActivityLog.java` | Entité `audit_activity_logs` |
| `hse/audit/dto/AuditActivityLogDto.java` | DTO : id, auditId, eventType, performedByName, performedAt, detail |
| `hse/audit/dto/AuditStatsDto.java` | DTO : total, enAttente, enCours, termine, annule, tauxCompletion |
| `hse/audit/repository/AuditActivityLogRepository.java` | `findByAuditIdOrderByPerformedAtAsc(Long)` |
| `hse/audit/service/AuditActivityLogService.java` | `log()` avec `@Transactional(REQUIRES_NEW)` + try-catch dans callers |
| `hse/audit/service/AuditReminderScheduler.java` | `@Scheduled(cron="0 0 * * * *")` — rappels 24h et jour J avec dédup flags |

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `hse/audit/entity/Audit.java` | Champs `reminder24hSent`, `reminderDaySent`, `startedAt`, `completedAt` |
| `hse/audit/dto/AuditDto.java` | Champs ajoutés : `templateItemCount`, `startedAt`, `completedAt`, `filledCount`, `totalCount`, `scorePercent` |
| `hse/audit/repository/AuditRepository.java` | `findWithFilters(...)`, `findByAssignedEmployeeIdOrderByDateDesc(Long)`, queries rappels avec fenêtre temporelle |
| `hse/audit/service/AuditService.java` | `findMyAudits(Principal)`, `findWithFilters(...)`, `getStats()`, `getActivityLog(Long)`, `findCadreEmployees()` ; `patchStatus` met à jour `startedAt`/`completedAt` et logue l'événement |
| `hse/audit/controller/AuditController.java` | Nouveaux endpoints stats/my-audits/cadre-employees/{id}/activity ; filtres sur GET / |
| `employee/EmployeeRepository.java` | `findAllCadreEmployees()` — JPQL `JOIN e.employmentType et WHERE UPPER(et.type) = 'CADRE'` |
| `auth/EmailService.java` | `sendAuditAssignmentEmail`, `sendAuditReminderEmail`, `sendAuditStatusChangeEmail` |
| `config/SecurityConfiguration.java` | `GET /audits/my-audits` → + SUPERVISOR ; `PATCH /audits/*/status` → + SUPERVISOR ; `GET + POST + PUT /checklist-instances/**` → + SUPERVISOR (pour remplir les checklists) |

### Fichiers créés (frontend)

| Fichier | Description |
|---|---|
| `modules/audit/hooks/useFetchAuditStats.ts` | Query `["audit-stats"]` → `GET /audits/stats` |
| `modules/audit/hooks/useFetchMyAudits.ts` | Query `["my-audits"]` → `GET /audits/my-audits` |
| `modules/audit/hooks/useFetchCadreEmployees.ts` | Query `["cadre-employees"]` → `GET /audits/cadre-employees` |
| `modules/audit/hooks/useFetchAuditActivity.ts` | Query `["audit-activity", auditId]` → `GET /audits/{id}/activity` |
| `modules/audit/components/MyAuditsClient.tsx` | Vue SUPERVISOR : tableau audits assignés, transition EN_COURS à l'ouverture, TERMINE à la validation |
| `pages/MyAuditsPage.tsx` | Page wrapper — `<Layout><MyAuditsClient /></Layout>` |

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/audit/types.ts` | Ajout `templateItemCount`, `startedAt`, `completedAt`, `filledCount`, `totalCount`, `scorePercent` sur `Audit` ; nouveaux types `AuditStats`, `AuditActivityLog`, `CadreEmployee` |
| `modules/audit/components/AuditFormModal.tsx` | `lineZone` → `<select>` via `useFetchProductionLinesAdmin` ; employé assigné → `<select>` via `useFetchCadreEmployees` (filtre CADRE strict) ; template affiche `(N point(s))` |
| `modules/audit/components/AuditClient.tsx` | 6 cartes stats ; filtres (statut, ligne, auditeur, dates) ; colonne Avancement (barre) + Score (badge coloré) ; bouton journal d'activité (timeline) |
| `App.tsx` | Route `/my-audits` → `MyAuditsPage` sous `ProtectedRoute allowedRoles=["SUPERVISOR", "INGENIEUR_HSE", "ADMIN", "SUPER_ADMIN"]` |
| `components/Sidebar.tsx` | `HSE_ITEMS` : ajout `{ label: "Mes Audits", icon: "clipboard-check", path: "/my-audits", allowedRoles: ["SUPERVISOR"] }` |

### Comportements clés

- **Transition EN_COURS** : `patchStatus.mutate({ id, status: "EN_COURS" })` appelé non-bloquant à l'ouverture du formulaire si statut était `EN_ATTENTE`. Résultat ignoré (l'audit s'affiche quand même).
- **Transition TERMINE** : après `createInstance` ou `updateInstance` réussi, `patchStatus.mutate({ id, status: "TERMINE" })` bloquant — succès requis pour fermer le formulaire.
- **Score** : calculé dans `AuditService.toDto()` = `(okCount / totalResponses) * 100`. Null si aucune instance. Niveaux : ≥96% vert, ≥60% orange, <60% rouge.
- **ChecklistFillForm** : gère son propre overlay `fixed inset-0 z-50`. Ne pas l'envelopper dans un autre overlay. `MyAuditsClient` affiche un simple loader `fixed inset-0 bg-black/40` pendant le chargement du template.
- **Rappels** : `AuditReminderScheduler` utilise `@Scheduled` — nécessite `@EnableScheduling` sur `RhApplication` (déjà présent via `FreeOperatorsResetScheduler`). Les emails sont envoyés via `CompletableFuture.runAsync()` (non-bloquant).
- **Journal d'activité** : `AuditActivityLogService.log()` utilise `@Transactional(propagation = REQUIRES_NEW)` sans `@Async`. Try-catch dans `AuditService` pour protéger l'opération principale.

### Niveaux de score audit

| Seuil | Niveau | Couleur |
|---|---|---|
| ≥ 96% | Niveau 0 | Vert (`--accent2`) |
| 60–95% | Niveau 1 | Orange (`--accent3`) |
| < 60% | Niveau 2/3 | Rouge (`--accent4`) |

### Sidebar — groupe HSE (mise à jour)

```
HSE
  ├── Checklists   → /checklists  (INGENIEUR_HSE, ADMIN, SUPER_ADMIN)
  ├── Audits       → /audits      (INGENIEUR_HSE, ADMIN, SUPER_ADMIN)
  └── Mes Audits   → /my-audits   (SUPERVISOR uniquement)
```

---

## Checklist HSE — Vue détail, export Excel/PDF, pré-remplissage (session 2026-05-08)

### Amélioration 1 — Export Excel dans ChecklistDetailModal

Bouton **"Excel"** ajouté à côté du bouton "PDF" dans la barre d'en-tête de `ChecklistDetailModal`.

#### Structure du fichier Excel (exceljs)

| Section | Contenu |
|---|---|
| Ligne titre | Fusionnée A1:G1 — fond bleu accent |
| En-tête (3 lignes) | Date/Ligne/Chef équipe (gauche) + Auditeur/Visa/Responsable (droite) |
| En-têtes colonnes | N° / Catégorie / Points à vérifier / OK / N'OK / NA / Description écart |
| Données | Fond rouge pâle si NOK ; catégorie en bleu clair ; ✓ vert / ✗ rouge |
| Score | Ligne fusionnée avec couleur dynamique selon niveau d'audit |
| Assignations | Tableau de suivi si présentes |

#### Nom de fichier

- PDF : `Checklist_HSE_[Ligne]_[Date].pdf`
- Excel : `Checklist_HSE_[Ligne]_[Date].xlsx`

(La ligne et la date sont extraites de l'instance ; les caractères non alphanumériques sont remplacés par `_`.)

### Amélioration 2 — Pré-remplissage dans ChecklistFillForm depuis l'audit

#### Prop `prefill` ajoutée à `ChecklistFillForm`

```ts
export type ChecklistPrefill = {
  date?: string;
  lineUnit?: string;
  auditor?: string;
  auditorVisa?: string;
};
```

- Les champs pré-remplis sont initialisés depuis `prefill` si `initial` (instance existante) est absent.
- Les champs pré-remplis affichent un badge "pré-rempli" et sont `readOnly` — l'auditeur ne peut pas les modifier.
- Les autres champs (Chef d'équipe, Responsable ligne/unité, réponses) restent éditables.

#### Champs pré-remplis depuis l'audit

| Champ form | Source audit |
|---|---|
| Date | `audit.date` (partie date ISO) |
| Ligne / Unité | `audit.lineZone` |
| Auditeur | `audit.assignedEmployeeName` |
| Visa auditeur | `audit.assignedEmployeeMatricule` (nouveau champ) |

#### Backend — `assignedEmployeeMatricule` ajouté

`AuditDto` et `AuditService.toDto()` exposent désormais le matricule de l'employé assigné.

### Amélioration 3 — Accès ChecklistDetailModal depuis MyAuditsClient

Le SUPERVISOR peut maintenant voir le checklist rempli de ses propres audits (lecture seule + export PDF/Excel) via le bouton `FileText` qui apparaît dès que l'audit a un `instanceId`.

Le bouton "Voir le détail" (`Eye`) est conservé pour les infos de l'audit (date, ligne, statut, score, notes).

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `hse/audit/dto/AuditDto.java` | Champ `assignedEmployeeMatricule` ajouté |
| `hse/audit/service/AuditService.java` | `toDto()` populate `assignedEmployeeMatricule` |
| `modules/audit/types.ts` | `assignedEmployeeMatricule?: string` sur `Audit` |
| `modules/checklist/components/ChecklistFillForm.tsx` | Type `ChecklistPrefill` exporté ; prop `prefill` ; champs `readOnly` avec badge "pré-rempli" |
| `modules/checklist/components/ChecklistDetailModal.tsx` | Export Excel (exceljs) ; nom de fichier `Checklist_HSE_[Ligne]_[Date].*` ; bouton Excel vert |
| `modules/audit/components/MyAuditsClient.tsx` | Prop `prefill` passée à `ChecklistFillForm` ; bouton `FileText` pour ouvrir `ChecklistDetailModal` quand `instanceId` présent |

---

## Liaison Audit ↔ Checklist + Corrections exports (session 2026-05-08)

### Amélioration 1 — Bouton "Voir le checklist" dans la fiche audit (AuditClient)

La modal "Détail de l'audit" (vue INGÉNIEUR_HSE, ADMIN, SUPER_ADMIN) dispose maintenant d'un bouton "Voir le checklist" dans son pied de page :

- **`instanceId` présent** → bouton vert "Voir le checklist" — ouvre `ChecklistDetailModal` avec les exports PDF/Excel.
- **`instanceId` absent** → bouton grisé désactivé "Checklist non rempli".

Le bouton fonctionne pour tous les statuts (EN_COURS = vue partielle, TERMINÉ = vue complète avec exports).

| Fichier | Changement |
|---|---|
| `modules/audit/components/AuditClient.tsx` | Import `ChecklistDetailModal` + `FileText` ; état `detailInstanceId` ; bouton "Voir le checklist" dans la modal détail ; rendu `ChecklistDetailModal` |

### Amélioration 2 — Export Excel corrigé

| Bug | Correction |
|---|---|
| Catégorie répétée sur chaque ligne | `fi.isFirstInCategory ? fi.category.name : ""` — catégorie uniquement sur la première ligne du groupe |
| Pas de logo | Logo SAGE chargé depuis `/logo.webp` via canvas (conversion PNG), placé sur A1:B4 |
| Hauteur de ligne fixe (contenu tronqué) | Hauteur calculée dynamiquement : `Math.max(18, Math.max(labelLines, ecartLines) * 14)` |
| En-tête titre seul (pas de structure) | Nouveau layout : logo A1:B4 / titre C1:F2 (grande police) / référence G1:G4 / info-block rows 5-7 / séparateur row 8 |

Helpers ajoutés dans `ChecklistDetailModal.tsx` :
- `loadLogoAsPngDataUrl()` — charge `/logo.webp`, convertit en PNG via canvas (compatible ExcelJS)
- `dataUrlToArrayBuffer()` — convertit un data URL en `ArrayBuffer` pour `wb.addImage`

### Amélioration 3 — Export PDF corrigé

| Bug | Correction |
|---|---|
| Symboles ✓/✗ → `'` (Helvetica ne les supporte pas) | Remplacés par `"OUI"` / `"NON"` / `"—"` |
| Pas de couleurs sur les cellules OK/NOK/NA | `didParseCell` : OK → fond vert `[212,237,218]`, NON → fond rouge `[248,215,218]`, — → fond gris `[233,236,239]` |
| Lignes NOK sans fond coloré | Toutes les cellules d'une ligne NON reçoivent `fillColor: [254,242,242]` avant les overrides par colonne |
| Pas de logo | Logo SAGE ajouté via `doc.addImage` (PNG, 28×14mm) en haut à gauche ; titre centré en-dessous |
| `handleExportPdf` synchrone | Rendu `async` pour attendre le chargement du logo |

| Fichier | Changement |
|---|---|
| `modules/checklist/components/ChecklistDetailModal.tsx` | Helpers `loadLogoAsPngDataUrl` + `dataUrlToArrayBuffer` ; `handleExportPdf` async + logo + `didParseCell` ; `handleExportExcel` restructuré (catégorie first-row only, logo, dynamic height, explicit row indices) |

---

## Correctif — Bouton "Checklist non rempli" sur audit TERMINÉ (session 2026-05-08)

### Symptôme

Malgré un audit avec statut TERMINÉ et un checklist visiblement rempli, le bouton affichait "Checklist non rempli" (désactivé) dans les deux vues : INGÉNIEUR_HSE et SUPERVISOR.

### Cause racine

Double lacune dans la liaison `Audit` ↔ `ChecklistInstance` :

1. **`SaveInstanceRequest.java`** n'avait pas de champ `auditId` → le JSON envoyé par le frontend contenait bien `auditId`, mais le deserializeur Jackson l'ignorait silencieusement.
2. **`ChecklistInstanceService.create()`** ne mettait jamais à jour la colonne FK `instance_id` de la table `audits`. La relation `Audit.instance` (`@OneToOne`, FK `instance_id` sur `audits`) restait donc toujours `null`.
3. **`AuditService.toDto()`** lit `audit.getInstance()` → null → `instanceId = null` → le frontend évalue `detailAudit.instanceId` comme falsy → bouton désactivé.

### Règle invariante

`audits.instance_id` est la colonne FK qui fait foi. Elle doit être mise à jour au moment de la création de l'instance checklist. `checklist_instances.audit_id` est un champ de commodité mais n'est pas lu par `AuditService.toDto()`.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `hse/checklist/dto/SaveInstanceRequest.java` | Champ `auditId` (Long, nullable) ajouté |
| `hse/checklist/service/ChecklistInstanceService.java` | Injection `AuditRepository` ; `create()` : `instance.setAuditId()` + MAJ `audit.instance` + save audit ; `update()` : même logique si `audit.getInstance() == null` (réparation données cassées) |
| `modules/checklist/types.ts` | `auditId?: number \| null` ajouté à `SaveInstanceRequest` (le frontend envoyait déjà la valeur) |

### Données cassées existantes

Les audits créés avant ce correctif ont `instance_id = null` en base. Ils se réparent automatiquement au premier `update()` du checklist (le SUPERVISOR rouvre et re-soumet) grâce à la logique `if (audit.getInstance() == null)` ajoutée dans `update()`.

---

## Photos sur points N'OK — Module Checklist HSE (session 2026-05-09)

### Fonctionnalité

Les auditeurs peuvent attacher des photos (JPEG, PNG, WebP) à chaque point marqué **N'OK** lors du remplissage d'un checklist.

### Contraintes

- Types acceptés : `image/jpeg`, `image/png`, `image/webp`
- Taille maximale par image : **5 Mo**
- Maximum **5 photos par point N'OK**
- Upload uniquement si la réponse est N'OK (la restriction statut ≠ COMPLETE a été retirée — voir correctif session 2026-05-09)
- Accès : INGENIEUR_HSE, SUPERVISOR, ADMIN, SUPER_ADMIN

### Table `checklist_response_photos`

```sql
checklist_response_photos
  - id            BIGSERIAL PK
  - response_id   BIGINT FK → checklist_responses(id) ON DELETE CASCADE
  - file_name     VARCHAR(255)
  - file_type     VARCHAR(100)   -- image/jpeg | image/png | image/webp
  - file_size     BIGINT         -- octets
  - data          BYTEA          -- binaire de l'image
  - uploaded_at   TIMESTAMP
  - uploaded_by   BIGINT FK → _user(id)
```

**Index** : `idx_crp_response_id` sur `response_id`.

### Endpoints backend

| Méthode | URL | Description |
|---|---|---|
| `POST` | `/api/v1/checklist/responses/{responseId}/photos` | Upload multipart (champ `file`) |
| `GET` | `/api/v1/checklist/responses/{responseId}/photos` | Métadonnées (sans binaire) |
| `GET` | `/api/v1/checklist/photos/{photoId}` | Binaire avec `Content-Type` correct pour affichage inline |
| `DELETE` | `/api/v1/checklist/photos/{photoId}` | Suppression (checklist non terminé uniquement) |

### Correctif `ChecklistInstanceService.update()` — Smart merge

**Avant** : `instance.getResponses().clear()` → `applyResponses()` — recréait toutes les réponses, supprimant les photos via CASCADE.

**Après** : `mergeResponses()` met à jour les réponses **en place** pour préserver leurs IDs (et les photos attachées). Si une réponse passe de N'OK à OK/NA, ses photos sont supprimées via `orphanRemoval`.

### `photoCount` dans `ChecklistResponseDto`

Champ `int photoCount` ajouté. Calculé en bulk dans `ChecklistInstanceService.toDto()` via `ChecklistResponsePhotoService.countByResponseIds()` pour éviter le N+1.

### Flux d'upload frontend

1. Dans le formulaire, les photos sont **en attente** (`pendingPhotos: Map<itemId, File[]>`) jusqu'à la soumission.
2. Après enregistrement réussi de l'instance, `uploadPendingPhotos()` utilise les `responseId` retournés par le backend pour uploader chaque fichier.
3. En mode édition, les photos existantes sont chargées paresseusement via `useFetchResponsePhotos(responseId)`.
4. Le changement de réponse N'OK → OK/NA affiche une confirmation Swal avant suppression.

### Fichiers créés (backend)

| Fichier | Description |
|---|---|
| `hse/checklist/entity/ChecklistResponsePhoto.java` | Entité `checklist_response_photos` |
| `hse/checklist/repository/ChecklistResponseRepository.java` | JpaRepository pour `ChecklistResponse` (lookup par ID) |
| `hse/checklist/repository/ChecklistResponsePhotoRepository.java` | Queries : liste par responseId, count bulk |
| `hse/checklist/dto/ChecklistResponsePhotoDto.java` | DTO métadonnées (sans `data`) |
| `hse/checklist/service/ChecklistResponsePhotoService.java` | Upload / liste / binaire / suppression |
| `hse/checklist/controller/ChecklistPhotoController.java` | Endpoints `/api/v1/checklist/responses/*/photos` et `/api/v1/checklist/photos/*` |

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `hse/checklist/entity/ChecklistResponse.java` | `@OneToMany photos` avec `orphanRemoval = true` |
| `hse/checklist/dto/ChecklistResponseDto.java` | Champ `photoCount` ajouté |
| `hse/checklist/service/ChecklistInstanceService.java` | `mergeResponses()` (smart merge) + bulk `photoCount` dans `toDto()` |
| `config/SecurityConfiguration.java` | Routes photo ajoutées (INGENIEUR_HSE + ADMIN + SUPER_ADMIN + SUPERVISOR) |
| `application.properties` | `max-request-size` → 20MB |

### Fichiers créés (frontend)

| Fichier | Description |
|---|---|
| `modules/checklist/hooks/useUploadResponsePhoto.ts` | POST multipart |
| `modules/checklist/hooks/useFetchResponsePhotos.ts` | GET métadonnées (lazy) |
| `modules/checklist/hooks/useDeleteResponsePhoto.ts` | DELETE |
| `modules/checklist/components/ResponsePhotoUploader.tsx` | Composant : miniatures, drag-drop, lightbox, compteur |
| `modules/checklist/utils/uploadPendingPhotos.ts` | Utilitaire post-save pour uploader les photos en attente |

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/checklist/types.ts` | `ChecklistResponsePhotoMeta` ; `photoCount?` sur `ChecklistResponseDto` |
| `modules/checklist/components/ChecklistFillForm.tsx` | `pendingPhotos` state ; `onSave(data, pendingPhotos)` ; `ResponsePhotoUploader` sur les lignes N'OK |
| `modules/checklist/components/ChecklistDetailModal.tsx` | `ResponsePhotoRow` (photos en lecture seule + lightbox) sur les lignes N'OK |
| `modules/checklist/components/ChecklistClient.tsx` | `uploadPendingPhotos` appelé dans `onSuccess` de create/update |
| `modules/audit/components/MyAuditsClient.tsx` | `uploadPendingPhotos` appelé dans `afterSave` |

### Images dans les exports

- **PDF** : les images binaires ne sont pas encore incluses (contrainte jsPDF avec BYTEA — à implémenter si besoin).
- **Excel** : idem.

---

## Indicateur photos + Exports avec photos N'OK (session 2026-05-09)

### Fonctionnalités ajoutées

1. **Indicateur visuel 📷** sur chaque ligne de point N'OK ayant des photos, dans le formulaire de remplissage ET dans la vue détail.
2. **Galerie plein-écran** avec navigation (flèches + clavier) au clic sur l'indicateur.
3. **Photos intégrées dans les exports PDF et Excel** dans une section "ANNEXE PHOTOS — POINTS N'OK" après le tableau principal.

### Indicateur et galerie

| Contexte | Comportement |
|---|---|
| Vue détail (`ChecklistDetailModal`) | Indicateur 📷 + count dans la colonne "Description de l'écart" pour chaque ligne N'OK avec photos. Clic → galerie lecture seule. |
| Formulaire remplissage (`ChecklistFillForm`) | Indicateur 📷 + count dans l'en-tête de ligne (à côté des boutons OK/NOK/NA). Clic → galerie avec suppression. Visible uniquement si `responseId` existe (photos déjà enregistrées). |

**`PhotoGalleryModal`** :
- Header : icône caméra + catégorie / point à vérifier + compteur X/Y
- Navigation gauche/droite + clavier (← →, Escape pour fermer)
- Bande de miniatures (strip) en bas si > 1 photo
- Bouton "Supprimer" (rouge) en mode édition uniquement
- z-index `[100]` — au-dessus des modals z-50

**`PhotoIndicator`** :
- Badge pill (fond `accent-light`, bordure `border`, texte `accent`)
- Ne s'affiche pas si count = 0
- Exporté depuis `PhotoGalleryModal.tsx` (réutilisable)

### Exports PDF — ANNEXE PHOTOS

- Nouvelle page ajoutée uniquement si au moins un point N'OK a des photos.
- Pour chaque point N'OK avec photos : tableau d'en-tête (N°, Catégorie, Point, Écart) + photos alignées horizontalement (3 max par ligne, 83×62mm chacune).
- Légende sous chaque photo : `Photo X/Y — N°[num] [Catégorie]`.
- Gestion des sauts de page automatique si le contenu dépasse la hauteur utile.
- Photos converties en data URL via `FileReader` (format original préservé : JPEG/PNG/WEBP).

### Exports Excel — ANNEXE PHOTOS

- Section ajoutée après le tableau d'assignations (ou après le score si absent).
- Titre fusionné A:G en bleu, puis pour chaque point N'OK avec photos :
  - Ligne titre : `N°X — [Catégorie] — [Point]` (fond `LIGHT_BLUE`, gras)
  - Ligne écart : `Écart : [texte]` (fond `LIGHT_RED`, rouge)
  - Rangées de photos : 3 par rangée (colonnes A-B, C-D, E-F), 150×115px chacune, hauteur de ligne 88pt
  - Rangée de légendes : `Photo X/Y` (fusion A:B, C:D, E:F)
  - Ligne vide de séparation entre les blocs
- Photos insérées via `wb.addImage` avec `ext: { width, height }` en pixels.

### Helpers ajoutés dans `ChecklistDetailModal.tsx`

| Fonction | Description |
|---|---|
| `fetchPhotosMeta(responseId, token)` | GET `/checklist/responses/{id}/photos` — retourne la liste des métadonnées |
| `fetchPhotoForPdf(photoId, token)` | GET blob + conversion FileReader → `{ dataUrl, format }` |
| `fetchPhotoForExcel(photoId, token)` | GET blob → `{ buffer: ArrayBuffer, extension }` |

### Fichiers créés/modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/checklist/components/PhotoGalleryModal.tsx` | **NOUVEAU** — galerie plein-écran + `PhotoIndicator` (badge exporté) |
| `modules/checklist/components/ChecklistDetailModal.tsx` | Suppression `ResponsePhotoRow`/`ReadOnlyPhoto`/`Lightbox` ; `PhotoIndicator` sur lignes N'OK ; galerie `readOnly=true` ; annexe photos dans PDF + Excel |
| `modules/checklist/components/ChecklistFillForm.tsx` | `PhotoIndicator` dans en-tête de ligne ; galerie `readOnly=false` (delete) |

---

## Correctif Photos Checklist — Indicateur et exports (session 2026-05-09)

### Symptômes

- Indicateur 📷 absent sur les points N'OK malgré des photos uploadées dans le formulaire.
- Section "ANNEXE PHOTOS" absente des exports PDF et Excel.

### Cause racine

`ChecklistResponsePhotoService.upload()` rejetait toute tentative d'upload si l'instance était en statut `COMPLETE` :

```java
if (response.getInstance().getStatus() == ChecklistInstance.InstanceStatus.COMPLETE) {
    throw new InvalidOperationException(...);
}
```

Or le flux de sauvegarde dans `ChecklistFillForm` envoie `status: "COMPLETE"` avant d'appeler `uploadPendingPhotos`. L'instance est donc COMPLETE au moment de l'upload → toutes les photos rejetées. L'erreur était silencieusement avalée par `.catch(() => {})` dans `uploadPendingPhotos.ts`.

Conséquence : `photoCount = 0` partout → indicateur masqué (condition `count > 0`) → `nokWithPhotos` vide → ANNEXE PHOTOS absente des exports.

### Correctif appliqué

Retrait du guard `COMPLETE` dans `upload()` ET dans `delete()` de `ChecklistResponsePhotoService`. La restriction n'était pas compatible avec :
1. Le flux de sauvegarde (photos uploadées après que l'instance passe en COMPLETE).
2. Le flux d'édition (INGENIEUR_HSE peut ré-éditer une checklist COMPLETE depuis ChecklistClient).

### Fichier modifié (backend)

| Fichier | Changement |
|---|---|
| `hse/checklist/service/ChecklistResponsePhotoService.java` | Guard `status == COMPLETE` retiré de `upload()` et `delete()` ; import `ChecklistInstance` supprimé |

### Règle invariante conservée

Upload refusé si la réponse n'est pas N'OK (`ChecklistResponse.ResponseType.NOK`). Cette vérification est maintenue.

---

## Module Audit — Statut EN_RETARD + Notification de modification (session 2026-05-12)

### Fonctionnalité 1 — Statut EN_RETARD

Un audit passe automatiquement au statut **EN_RETARD** si son statut est `EN_ATTENTE` et que sa date est dépassée. Le scheduler tourne toutes les heures (`detectOverdueAudits()` dans `AuditReminderScheduler`).

#### Champ anti-doublon

`retardNotifSent` (BOOLEAN DEFAULT FALSE) sur la table `audits` garantit qu'un seul passage EN_RETARD est notifié par audit.

#### Tableau des transitions

| Statut actuel | Condition | Nouveau statut |
|---|---|---|
| EN_ATTENTE | date < maintenant | **EN_RETARD** (cron) |
| EN_RETARD | Audit modifié + nouvelle date > maintenant | **EN_ATTENTE** (reset via `update()`) |
| EN_COURS / TERMINÉ / ANNULÉ | (toujours) | Inchangé |

#### Notifications EN_RETARD

- Notification in-app + email à l'auditeur assigné
- Notification in-app + email à l'INGÉNIEUR_HSE (créateur)
- Log `EN_RETARD` dans `audit_activity_logs`

#### Reset EN_RETARD → EN_ATTENTE

Dans `AuditService.update()` : si `oldStatus == EN_RETARD` ET `newDate > now` → `status = EN_ATTENTE`, `retardNotifSent = false`.

### Fonctionnalité 2 — Notification de modification

À chaque modification d'un audit (`PUT /api/v1/audits/{id}`) :
- Les champs changés sont comparés (date, ligne, notes) et loggés dans `audit_activity_logs` avec `event_type = 'MODIFIE'`
- Si l'auditeur est **le même** qu'avant → notification in-app "Votre audit a été mis à jour" + email `sendAuditUpdateEmail`
- Si l'auditeur **a changé** → notification d'affectation au nouvel auditeur (comportement existant, inchangé)

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `hse/audit/entity/Audit.java` | `EN_RETARD` ajouté à `AuditStatus` ; champ `retardNotifSent` |
| `hse/audit/repository/AuditRepository.java` | `findOverdueAuditsNotYetNotified(now)` |
| `hse/audit/dto/AuditStatsDto.java` | Champ `enRetard` ajouté |
| `hse/audit/service/AuditService.java` | `getStats()` inclut `enRetard` ; `update()` reset EN_RETARD + log MODIFIE + `notifyAssigneeOnUpdate()` |
| `hse/audit/service/AuditReminderScheduler.java` | `detectOverdueAudits()` appelé dans le cron hourly |
| `auth/EmailService.java` | `sendAuditOverdueEmail`, `sendAuditOverdueHseEmail`, `sendAuditUpdateEmail` |

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/audit/types.ts` | `EN_RETARD` dans `AuditStatus` ; `retardNotifSent` dans `Audit` ; `enRetard` dans `AuditStats` |
| `modules/audit/components/AuditClient.tsx` | `STATUS_LABELS/STYLE` + `EVENT_LABELS` (MODIFIE, EN_RETARD) ; carte "En retard" (couleur `#dc5000`) dans les stats (grille 7 colonnes) |
| `modules/audit/components/AuditCalendar.tsx` | `STATUS_COLORS/LABELS` incluent `EN_RETARD` (couleur orange-foncé `#dc5000`) |

---

## Module Audit — Champs avec recherche filtrée (session 2026-05-24)

### Fonctionnalité

Les trois champs du formulaire **"Planifier un audit"** (`AuditFormModal`) ont été convertis de `<select>` simples en champs avec **recherche filtrée en temps réel**, en réutilisant exactement le même composant et la même logique que les champs "Destinataire (superviseur)" et "Projet / ligne de production" du formulaire **Nouvelle permutation**.

### Pattern réutilisé (PermutationForm)

Chaque champ utilise :
- Un `input[type=text]` qui affiche la valeur sélectionnée quand fermé, et le texte de recherche quand ouvert
- États `xxxSearch` (texte) + `xxxOpen` (boolean)
- `onFocus` → ouvre le dropdown et vide la recherche
- `onChange` → met à jour la recherche
- `onBlur` → ferme avec `setTimeout(180ms)` (pour laisser le temps au `onMouseDown` du bouton de s'exécuter)
- Bouton ✕ pour effacer la sélection (via `onMouseDown` pour éviter le blur avant le clic)
- Dropdown `absolute z-50` avec liste filtrée via `useMemo`
- Bordure rouge (`#fca5a5`) si vide, bordure `var(--accent)` si sélection valide

### Champs modifiés

| Champ | Filtre | Affichage option | Affichage valeur sélectionnée |
|---|---|---|---|
| **Ligne / Zone auditée** | Par nom de ligne | Nom seul | Nom de la ligne |
| **Modèle de checklist** | Par titre | Titre (gras) + nb points (en-dessous) | `Titre (N points)` |
| **Auditeur assigné (CADRE)** | Par nom complet + matricule | Nom (gras) + `Matricule : XXX` (en-dessous) | `Nom — Matricule` |

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `modules/audit/components/AuditFormModal.tsx` | `useState` → `useMemo` pour les 3 champs ; 3 paires d'états `search`/`open` ; dropdowns filtrés ; logique identique à `PermutationForm` |

---

## Correctif sécurité — GET checklist-templates accessible aux SUPERVISOR (session 2026-05-24)

### Problème corrigé

`GET /api/v1/checklist-templates/**` retournait **403 Forbidden** pour tout rôle autre que `INGENIEUR_HSE`, `ADMIN` et `SUPER_ADMIN`. Les auditeurs assignés (typiquement `SUPERVISOR` / CADRE) ne pouvaient donc pas charger le modèle de checklist via `useFetchTemplateById` et étaient bloqués à l'ouverture du formulaire "Remplir le checklist".

### Correctif appliqué

Ajout de `SUPERVISOR` dans la règle `GET /api/v1/checklist-templates/**` de `SecurityConfiguration`. Les autres règles (POST, PUT, DELETE) restent réservées à `INGENIEUR_HSE`, `ADMIN` et `SUPER_ADMIN`.

### Fichier modifié

| Fichier | Changement |
|---|---|
| `config/SecurityConfiguration.java` | `GET /api/v1/checklist-templates/**` → + `SUPERVISOR` |

### Règle à retenir

Tout rôle ayant accès à `GET /api/v1/audits/my-audits` (auditeurs assignés) doit aussi avoir `GET /api/v1/checklist-templates/**` pour pouvoir charger le modèle et remplir son checklist. Les opérations d'écriture sur les templates restent réservées à `INGENIEUR_HSE`/`ADMIN`/`SUPER_ADMIN`.

---

## Module Audit — Champ date passé à LocalDate (session 2026-05-25)

### Modification appliquée

Le champ `date` de la table `audits` a été converti de `TIMESTAMP` → `DATE` et le type Java de `LocalDateTime` → `LocalDate`. L'heure n'est plus stockée ni saisie.

### Migration SQL obligatoire

Avant le premier démarrage du backend après cette modification, exécuter sur la base de données :

```sql
ALTER TABLE audits ALTER COLUMN date TYPE DATE USING date::DATE;
```

Script disponible : `backend/src/main/resources/migrate_audit_date_to_date.sql`

### Impact sur la logique EN_RETARD et rappels cron

| Rappel / Détection | Avant | Après |
|---|---|---|
| **EN_RETARD** | `a.date < LocalDateTime.now()` | `a.date < :today (LocalDate)` |
| **Rappel 24h** | `a.date BETWEEN now+23h AND now+25h` | `a.date = :tomorrow (LocalDate+1)` |
| **Rappel jour J** | `a.date BETWEEN now-30min AND now+30min` | `a.date = :today (LocalDate)` |

### Format d'affichage

Le format `dd/MM/yyyy à HH:mm` dans les notifications et logs est remplacé par `dd/MM/yyyy`.

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `hse/audit/entity/Audit.java` | `LocalDateTime date` → `LocalDate date`, `@Column(columnDefinition = "DATE")` |
| `hse/audit/dto/AuditDto.java` | `LocalDateTime date` → `LocalDate date` |
| `hse/audit/dto/CreateAuditRequest.java` | `LocalDateTime date` → `LocalDate date` |
| `hse/audit/repository/AuditRepository.java` | 4 requêtes adaptées à `LocalDate` ; rappels 24h/jour J passent de BETWEEN à `= :tomorrow`/`= :today` |
| `hse/audit/service/AuditService.java` | `DATE_FMT` → `dd/MM/yyyy` ; signature `findWithFilters` → `LocalDate` ; comparaison EN_RETARD → `isAfter(LocalDate.now())` |
| `hse/audit/service/AuditReminderScheduler.java` | `DATE_FMT` → `dd/MM/yyyy` ; cron 24h → `LocalDate.now().plusDays(1)` ; jour J → `LocalDate.now()` |
| `hse/audit/controller/AuditController.java` | Params `from`/`to` → `LocalDate` |

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/audit/components/AuditFormModal.tsx` | Input `datetime-local` → `date` ; label "Date et heure" → "Date" ; envoi direct `YYYY-MM-DD` sans conversion ISO |
| `modules/audit/components/AuditClient.tsx` | `toLocaleString` → `toLocaleDateString` dans tableau et modal détail |
| `modules/audit/components/AuditCalendar.tsx` | Chips : heure supprimée ; vue liste : format `"EEE d MMM yyyy"` ; popup : format `"EEEE d MMMM yyyy"` |
| `modules/audit/components/MyAuditsClient.tsx` | `toLocaleString` → `toLocaleDateString` ; prefill date : `.split("T")[0]` supprimé (date déjà en `YYYY-MM-DD`) |

---

## Module Audit — EN_RETARD remplissable + indicateur "Fait en retard" (session 2026-05-25)

### Modification 1 — Remplissage du checklist pour un audit EN_RETARD

Un auditeur peut désormais remplir le checklist d'un audit dont le statut est **EN_RETARD**, exactement comme pour EN_ATTENTE.

#### Tableau des transitions de statut

| Statut initial | Action | Nouveau statut |
|---|---|---|
| EN_ATTENTE | Ouverture du formulaire (1er point) | EN_COURS |
| **EN_RETARD** | **Ouverture du formulaire (1er point)** | **EN_COURS** |
| EN_COURS | Valide et enregistre | TERMINÉ |
| TERMINÉ / ANNULÉ | — | Inchangé |

#### Fichiers modifiés (frontend uniquement — pas de restriction backend)

| Fichier | Changement |
|---|---|
| `modules/audit/components/MyAuditsClient.tsx` | `canFill()` : ajout `EN_RETARD` ; `handleOpenFill()` : transition EN_COURS déclenchée aussi pour `EN_RETARD` |

### Modification 2 — Indicateur visuel "Fait en retard"

Lorsqu'un audit a été complété (TERMINÉ) depuis le statut EN_RETARD, le champ `completedLate = true` est stocké et des indicateurs visuels sont affichés.

#### Règle de calcul `completedLate`

Dans `patchStatus()` : si `status == TERMINE && oldStatus == EN_RETARD` → `completedLate = true`. Sinon reste `false`.

#### SQL (migration)

```sql
ALTER TABLE audits ADD COLUMN IF NOT EXISTS completed_late BOOLEAN DEFAULT FALSE;
```

#### Indicateurs affichés

| Emplacement | Indicateur |
|---|---|
| Tableau des audits (AuditClient, MyAuditsClient) | Badge orange **"⚠ Fait en retard"** à côté du badge TERMINÉ |
| Fiche détail de l'audit (AuditClient, MyAuditsClient) | Bandeau orange **"⚠ Cet audit a été complété en retard"** en haut du contenu |
| Vue checklist rempli (ChecklistDetailModal) | Alerte orange **"⚠ Complété en retard"** au-dessus du bloc document |
| Export PDF | Ligne orange **"⚠ Audit complété en retard"** centrée entre le titre et le tableau d'en-tête |
| Export Excel | Ligne fusionnée sous le score : **"⚠ Audit complété en retard"** (fond orange pâle, texte `#DC5000`) |

#### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `hse/audit/entity/Audit.java` | Champ `completedLate` (boolean, default false) |
| `hse/audit/dto/AuditDto.java` | Champ `completedLate` |
| `hse/audit/service/AuditService.java` | `patchStatus()` : `completedLate = true` si TERMINE depuis EN_RETARD ; `toDto()` expose le champ |

#### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/audit/types.ts` | `completedLate?: boolean` ajouté sur `Audit` |
| `modules/audit/components/AuditClient.tsx` | Badge "⚠ Fait en retard" dans tableau ; bandeau dans fiche détail ; `completedLate` passé à `ChecklistDetailModal` |
| `modules/audit/components/MyAuditsClient.tsx` | Badge "⚠ Fait en retard" dans tableau ; bandeau dans fiche détail ; `completedLate` passé à `ChecklistDetailModal` |
| `modules/checklist/components/ChecklistDetailModal.tsx` | Prop `completedLate?: boolean` ; indicateur visuel dans la modal ; mention dans export PDF et Excel |

---

## Lignes de Production — Accès INGENIEUR_HSE (session 2026-05-25)

### Permissions accordées

| Opération | INGENIEUR_HSE | ADMIN / SUPER_ADMIN |
|---|:---:|:---:|
| Consulter la liste | ✅ | ✅ |
| Ajouter une ligne | ✅ | ✅ |
| Modifier une ligne | ❌ | ✅ |
| Supprimer une ligne | ❌ | ✅ |

### Fichiers modifiés (backend)

| Fichier | Changement |
|---|---|
| `config/SecurityConfiguration.java` | `POST /api/v1/production-lines/**` → ajout `INGENIEUR_HSE` |

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `App.tsx` | Route `/production-lines` séparée des autres référentiels — `allowedRoles` inclut `INGENIEUR_HSE` |
| `components/Sidebar.tsx` | `RH_ITEMS` : `allowedRoles` de "Lignes de Production" inclut `INGENIEUR_HSE` |
| `modules/production-line/components/ProductionLineClient.tsx` | `canEdit` calculé via `useAuth` ; boutons Modifier et Supprimer enveloppés dans `{canEdit && ...}` |

---

## Validation formulaire ChecklistFillForm — module My-Audits (session 2026-05-29)

### Fonctionnalité ajoutée

Validation côté client avant soumission du formulaire "Remplir la checklist" dans le module **my-audits** (`MyAuditsClient`). La validation est désactivée dans les autres usages du formulaire (ex. `ChecklistClient` côté INGÉNIEUR_HSE).

### Contrôles implémentés

| Champ / Zone | Condition | Message d'erreur |
|---|---|---|
| **Chef d'équipe** | Vide à la soumission | "Le champ Chef d'équipe est obligatoire." |
| **Responsable ligne/unité** | Vide à la soumission | "Le champ Responsable Ligne/Unité est obligatoire." |
| **Points à vérifier** | Au moins un point sans réponse | Bannière globale + surbrillance rouge de chaque ligne sans réponse |
| **Description de l'écart** | Point N'OK sans description | "Veuillez décrire l'écart observé." |

### Comportement

- Validation déclenchée au clic sur "Enregistrer" uniquement (pas de validation à l'ouverture).
- Tous les champs invalides sont mis en évidence simultanément.
- Validation en temps réel : l'erreur disparaît dès que le champ est rempli / la réponse sélectionnée.
- Scroll automatique vers la première erreur (priorité : Chef d'équipe → Responsable → premier point invalide).
- La soumission est bloquée tant qu'il reste des erreurs.

### Prop `enforceValidation`

`ChecklistFillForm` accepte une prop optionnelle `enforceValidation?: boolean`. Quand `true`, la validation est activée. Sans cette prop (ou `false`), le comportement existant est conservé — aucun impact sur `ChecklistClient`.

### Fichiers modifiés (frontend)

| Fichier | Changement |
|---|---|
| `modules/checklist/components/ChecklistFillForm.tsx` | Prop `enforceValidation` ; états `teamLeaderError`, `lineResponsibleError`, `unansweredItemIds`, `nokMissingDescIds`, `hasGlobalPointsError` ; refs scroll ; logique de validation dans `handleSubmit` ; surbrillance rouge des lignes sans réponse |
| `modules/audit/components/MyAuditsClient.tsx` | Prop `enforceValidation` passée à `ChecklistFillForm` |

---

## Dashboard HSE analytique (session 2026-05-30)

### Fonctionnalité

Dashboard analytique dédié au rôle **INGÉNIEUR_HSE** (lecture aussi pour ADMIN et SUPER_ADMIN) accessible via `/hse-dashboard`. C'est désormais la **page d'accueil** de l'INGÉNIEUR_HSE après login.

### Endpoints backend (`/api/v1/hse/`)

| Endpoint | Description |
|---|---|
| `GET /dashboard/kpis` | 8 KPI : total, terminé, en cours, retard, annulé, completed_late, taux, score moyen |
| `GET /dashboard/by-status` | Distribution des statuts (count + %) |
| `GET /dashboard/by-line` | Audits par ligne empilés par statut |
| `GET /dashboard/scores` | Score moyen par ligne de production |
| `GET /dashboard/timeline` | Évolution mensuelle (planifiés vs terminés) |
| `GET /dashboard/nok-points` | Top 5 points N'OK les plus fréquents |
| `GET /dashboard/nok-categories` | Top 5 catégories les plus non-conformes |
| `GET /dashboard/by-auditor` | Performance par auditeur |
| `GET /dashboard/conformity-levels` | Distribution Niveau 0/1/2-3 |
| `GET /reports/nonconformities` | Rapport N'OK détaillé (export Excel) |
| `GET /reports/by-line` | Synthèse par ligne (export PDF + Excel) |
| `GET /reports/late` | Audits en retard (export Excel) |

Tous les endpoints acceptent `dateFrom`, `dateTo`, `lineZone`, `auditorId` (tous optionnels).

### Architecture backend

| Fichier | Description |
|---|---|
| `hse/dashboard/dto/HseKpiDto.java` | DTO KPIs |
| `hse/dashboard/dto/HseStatusDistributionItem.java` | DTO distribution statuts |
| `hse/dashboard/dto/HseByLineItem.java` | DTO audits par ligne |
| `hse/dashboard/dto/HseScoreByLineItem.java` | DTO scores par ligne |
| `hse/dashboard/dto/HseTimelineItem.java` | DTO évolution mensuelle |
| `hse/dashboard/dto/HseNokPointItem.java` | DTO top N'OK points |
| `hse/dashboard/dto/HseNokCategoryItem.java` | DTO top N'OK catégories |
| `hse/dashboard/dto/HseAuditorPerformanceItem.java` | DTO performance auditeur |
| `hse/dashboard/dto/HseNonConformityReportItem.java` | DTO rapport non-conformités |
| `hse/dashboard/dto/HseLineSummaryReportItem.java` | DTO synthèse par ligne |
| `hse/dashboard/dto/HseLateAuditReportItem.java` | DTO audits en retard |
| `hse/dashboard/service/HseDashboardService.java` | Service avec `EntityManager` + native SQL dynamique (appendFilters/bindFilters) |
| `hse/dashboard/controller/HseDashboardController.java` | Controller unique `/api/v1/hse/**` |

**Pattern requêtes** : `EntityManager` + native SQL avec construction dynamique du WHERE (`appendFilters` + `bindFilters`) — évite le problème CAST PostgreSQL pour les paramètres nullable.

### Architecture frontend

| Fichier | Description |
|---|---|
| `modules/hse-dashboard/types.ts` | Types TypeScript pour tous les endpoints |
| `modules/hse-dashboard/hooks/useFetchHse*.ts` | 12 hooks React Query (queryKey `["hse-*", filters]`) |
| `modules/hse-dashboard/components/HseDashboardClient.tsx` | Composant principal — filtres + 9 graphiques Recharts + table auditeurs + rapports |
| `pages/HseDashboardPage.tsx` | Page wrapper |

### Graphiques Recharts utilisés

- Donut (PieChart + Pie) : répartition statuts, distribution niveaux conformité
- BarChart horizontal empilé : audits par ligne
- BarChart horizontal avec Cell coloré : scores par ligne (rouge/orange/vert selon seuil)
- LineChart : évolution mensuelle
- BarChart horizontal : top 5 N'OK points, top 5 catégories
- Heatmap manuel (divs colorés) : activité mensuelle

### Filtres

| Filtre | Type | Comportement |
|---|---|---|
| Période | Boutons : semaine/mois/trimestre/année/personnalisé | Calcule `dateFrom`/`dateTo` dynamiquement |
| Ligne de production | Input texte | Filtre exact côté backend |
| Auditeur | Select peuplé depuis `byAuditor` | Filtre par ID |

Tous les filtres sont mémoïsés (`useMemo`) → mise à jour simultanée de tous les graphiques.

### Sécurité

`GET /api/v1/hse/**` → INGENIEUR_HSE + ADMIN + SUPER_ADMIN (ajouté dans `SecurityConfiguration.java`).

### Modifications fichiers existants

| Fichier | Changement |
|---|---|
| `config/SecurityConfiguration.java` | Règle `GET /api/v1/hse/**` ajoutée avant catch-all |
| `App.tsx` | Route `/hse-dashboard` (INGENIEUR_HSE + ADMIN + SUPER_ADMIN) |
| `components/Sidebar.tsx` | Entrée "Dashboard HSE" (icon `layout-dashboard`) en tête du groupe HSE |
| `modules/auth/components/LoginCard.tsx` | INGENIEUR_HSE → `/hse-dashboard` (au lieu de `/checklists`) |

---

## Checklist HSE — Capture caméra sur points N'OK (session 2026-06-01)

### Fonctionnalité ajoutée

Bouton **"📷 Prendre une photo"** ajouté dans le composant `ResponsePhotoUploader`, côte à côte avec le bouton "📎 Uploader une photo", pour chaque point N'OK d'un formulaire de checklist.

### Comportement selon la plateforme

| Plateforme | Comportement |
|---|---|
| **Mobile** (iOS/Android) | `capture="environment"` → ouvre directement la caméra arrière native |
| **Desktop** (Chrome, Firefox, Edge) | `getUserMedia({ video: true })` → modal webcam dans le navigateur |
| Desktop sans caméra / permission refusée | Message d'erreur toast clair |
| Desktop — API indisponible (navigateur ancien) | Fallback silencieux vers le sélecteur de fichiers |

### Détection mobile

```ts
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
```
Constante calculée une fois au chargement du module.

### Modal webcam desktop (`CameraModal`)

- Affiche le flux `<video>` en temps réel (`getUserMedia`)
- Bouton **"Capturer"** : dessine le frame sur un `<canvas>` → `toBlob('image/jpeg', 0.85)` → `File` → `validateAndAdd`
- Bouton **"Annuler"** : stoppe le stream via `stream.getTracks().forEach(t => t.stop())`
- Cleanup `useEffect` : stoppe le stream au démontage du composant (évite la caméra active en arrière-plan)
- z-index `[200]` — au-dessus de la modal checklist (z-50)

### Messages d'erreur

| Erreur | Message affiché |
|---|---|
| `NotAllowedError` / `PermissionDeniedError` | "Accès à la caméra refusé. Autorisez l'accès dans les paramètres du navigateur." |
| `NotFoundError` / `DevicesNotFoundError` | "Aucune caméra disponible sur cet appareil." |
| Autre erreur | "Impossible d'accéder à la caméra. Utilisez "Uploader une photo" à la place." |

### Flux de la photo capturée

La photo suit **exactement le même flux** que les photos uploadées via le sélecteur de fichiers :
- Même validation (`validateAndAdd` : type JPEG/PNG/WebP, taille max 5 Mo)
- Même stockage dans `pendingPhotos` avant l'enregistrement
- Même upload vers `POST /api/v1/checklist/responses/{responseId}/photos` après save
- Même miniature avec icône de suppression
- Même compteur (X/5 photos)

### Disposition UI

```
[📎 Uploader une photo (X/5)]   [📷 Prendre une photo]
```

Les deux boutons sont dans un `flex gap-2 flex-wrap`. Le bouton caméra est stylé avec `border: 1.5px solid var(--border)` (pas de tirets).

### Fichier modifié (frontend)

| Fichier | Changement |
|---|---|
| `modules/checklist/components/ResponsePhotoUploader.tsx` | `isMobile` constant ; composant `CameraModal` (modal webcam desktop) ; état `cameraStream` ; `handleCameraClick` async (mobile vs desktop) ; `cameraInputRef` conservé pour mobile ; label upload "Uploader une photo" avec icône `Paperclip` |

---

## A NE PAS MODIFIER

- `backend/src/main/java/tn/sage/rh/config/PostgresDialect.java` — dialecte custom requis
- `backend/src/main/java/tn/sage/rh/exeption/` — le nom du package avec faute de frappe est utilise partout
- `frontend/src/context/AuthProvider.tsx` — logique de persistence accessToken/refreshToken fragile
