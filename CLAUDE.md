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
| `department` | ADMIN, SUPER_ADMIN — CRUD départements |
| `edi` | PLANIFICATEUR, SUPER_ADMIN |
| `employee` | ADMIN (CRUD), ADMIN+SUPERVISOR (lecture) |
| `history` | ADMIN, SUPERVISOR (historique présences) |
| `job-title` | ADMIN, SUPER_ADMIN — CRUD postes occupés |
| `notifications` | tous — polling 30s, mark-read |
| `permutation` | SUPERVISOR, OPERATIONAL_MANAGER |
| `presence` | ADMIN, SUPERVISOR, NURSE |
| `production-line` | ADMIN, SUPER_ADMIN — CRUD lignes de production |
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
| `POST` | `/api/v1/production-lines` | ADMIN, SUPER_ADMIN |
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
| `App.tsx` | 3 nouvelles routes `/departments`, `/job-titles`, `/production-lines` (ADMIN + SUPER_ADMIN) |
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

## A NE PAS MODIFIER

- `backend/src/main/java/tn/sage/rh/config/PostgresDialect.java` — dialecte custom requis
- `backend/src/main/java/tn/sage/rh/exeption/` — le nom du package avec faute de frappe est utilise partout
- `frontend/src/context/AuthProvider.tsx` — logique de persistence accessToken/refreshToken fragile
