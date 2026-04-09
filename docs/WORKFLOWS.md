# Workflows — Sage RH

## Developpement local

### Prerequis
- Java 17+, Maven (ou `./mvnw`)
- Node.js 18+, npm
- PostgreSQL sur `localhost:5432`, base `rh`, user `postgres` / password `supersecret`

### Demarrer le backend
```bash
cd backend
./mvnw spring-boot:run
# Ecoute sur 0.0.0.0:9000
```

### Demarrer le frontend
```bash
cd frontend
npm install        # premiere fois
npm run dev        # Vite avec --host (accessible sur le reseau local)
```

### Configurer l'URL API
Editer `frontend/.env.development` :
```
VITE_API_BASE_URL=http://<IP_MACHINE_BACKEND>:9000/api/v1
```
Utiliser l'IP LAN reelle (pas `localhost`) si le frontend est accede depuis d'autres machines.

---

## Build production

### Backend
```bash
cd backend
./mvnw clean package -DskipTests
# JAR genere dans backend/target/rh-0.0.1-SNAPSHOT.jar
java -jar target/rh-0.0.1-SNAPSHOT.jar
```

### Frontend
```bash
cd frontend
npm run build
# Sortie dans frontend/dist/
# Servir avec nginx ou vite preview
```

### Docker (backend)
Un `Dockerfile` est present dans `backend/`. Build et run :
```bash
cd backend
docker build -t sage-rh-backend .
docker run -p 9000:9000 sage-rh-backend
```
Penser a ajuster l'URL PostgreSQL dans les variables d'env :
`spring.datasource.url=jdbc:postgresql://postgresql:5432/rh` (mode Docker Compose)

---

## Ajouter un nouveau module frontend

1. Creer `src/modules/<nom>/` avec la structure standard :
   ```
   types.ts        # Types TypeScript
   schema.ts       # Validation Zod
   hooks/          # React Query (useFetch*, useCreate*, useUpdate*, useDelete*)
   components/     # columns.tsx + <Nom>Client.tsx
   utils.ts        # Helpers de transformation
   ```
2. Creer `src/pages/<Nom>Page.tsx` qui importe `<Nom>Client`
3. Ajouter la route dans `src/App.tsx` avec `ProtectedRoute allowedRoles`
4. Ajouter l'item de menu dans `src/components/Sidebar.tsx` (`PRINCIPAL_ITEMS` ou `GESTION_ITEMS`)

---

## Ajouter un endpoint backend

1. Creer le DTO dans `<module>/dto/`
2. Creer ou etendre l'entite JPA dans `<module>/entity/`
3. Creer le mapper MapStruct dans `<module>/mapper/`
4. Ajouter la methode au service (interface + impl)
5. Exposer dans le controller avec `@RequestMapping("/api/v1/<resource>")`
6. Pour les erreurs metier : lancer `InvalidEntityException` ou `EntityNotFoundException` depuis `tn.sage.rh.exeption`

---

## Gestion des permutations

### Flux ENVOYER (superviseur A -> superviseur B)
1. Superviseur A cree une permutation (`typePermutation: ENVOYER`, `receiverId` obligatoire, dates libres)
2. La permutation passe en statut `EN_ATTENTE`
3. Le superviseur B recoit une notification (bell dans la sidebar)
4. B accepte (`ACCEPTEE`) ou refuse (`REFUSEE`)
5. Si acceptee : les operateurs sont transferes

### Flux RECEVOIR (superviseur demande des operateurs libres)
1. Superviseur cree une permutation (`typePermutation: RECEVOIR`, `receiverId=null`)
2. `startDate = endDate = aujourd'hui` (force cote front)
3. Les operateurs libres (`free=true`) disponibles sont selectionnes

### Reset automatique
Le scheduler `FreeOperatorsResetScheduler` remet `free=false` pour tous les operateurs chaque nuit.
Desactivable via `app.schedulers.free-operators-reset.enabled=false` dans `application.properties`.

---

## Attribution automatique du role NURSE

Lors de la creation d'un employe (unitaire ou batch), si `JobTitle.title == "AIDE SOIGNANTE"` (comparaison insensible a la casse), le compte utilisateur est cree avec le role `NURSE` au lieu de `SUPERVISOR`.

### Backfill des employes existants
Au demarrage du backend, `DataInitializer` cherche tous les utilisateurs ayant le role `SUPERVISOR` dont le poste est `"AIDE SOIGNANTE"` et les met a jour vers le role `NURSE`. Cette operation est idempotente (sans effet si aucun utilisateur a corriger).

---

## Ajouter un nouveau role

1. Ajouter la valeur a `UserRole.java` avec son `Set<UserPermission>`
2. Ajouter `hasAnyRole(NOUVEAU_ROLE.name())` dans `SecurityConfiguration` pour les endpoints concernes
3. Ajouter la valeur au type `UserRole` dans `frontend/src/modules/auth/types.ts`
4. Ajouter le label dans `roleLabelMap` dans `Sidebar.tsx`
5. Ajouter le role aux `allowedRoles` des routes `App.tsx` et items `Sidebar.tsx` concernés
6. Si le role doit etre attribue automatiquement a la creation d'employe : mettre a jour `EmployeeCreationListener` et `UserService.toUser()`

---

## Debug courant

### Token JWT expire (401 en prod)
- Verifier que `useRefreshToken` et `PersistLogin` sont correctement montes
- Le `refreshToken` doit etre present dans `localStorage`
- Expiration : accessToken 24h (`86400000ms`), refreshToken 7j (`604800000ms`)

### CORS bloque
- Verifier `WebConfig.java` : l'origine du frontend doit etre dans les origines autorisees
- En dev : Vite tourne sur port 5173 (ou autre si occupe)

### Batch insert lent
- Verifier que `spring.jpa.properties.hibernate.jdbc.batch_size=100` est actif
- S'assurer que l'ID de l'entite utilise `SEQUENCE` et non `IDENTITY` (requis pour le batch Hibernate)

### MapStruct ne compile pas
```bash
cd backend
./mvnw clean compile
```
MapStruct genere les implementations a la compilation. Une erreur de mapping bloque tout le build.

### ddl-auto=update et colonnes manquantes
Si une propriete JPA est ajoutee sur une entite existante, Hibernate ajoute la colonne au prochain demarrage. Si une colonne est renommee, l'ancienne subsiste (perte de donnees silencieuse). Faire une migration SQL manuelle dans ce cas.

---

## Lint et qualite

```bash
cd frontend
npm run lint        # ESLint (react-hooks + react-refresh)
```

Regles actives : `eslint-plugin-react-hooks` (exhaustive-deps), `eslint-plugin-react-refresh`.
Pas de tests automatises configures actuellement.
