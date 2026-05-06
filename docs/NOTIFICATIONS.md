# Système de Notifications — Sage RH

## Vue d'ensemble

Deux systèmes de notifications coexistent dans la sidebar, tous deux logés dans la user card de `Sidebar.tsx`.

```
Sidebar (user card)
├── PermutationNotificationBell  — visible uniquement pour SUPERVISOR
└── NotificationCenter           — visible pour tous les rôles authentifiés
```

---

## Composants

### `NotificationCenter` (`src/components/NotificationCenter.tsx`)

Cloche générique pour les notifications système backend.

**Comportement :**
- Icône `Bell` (lucide-react) avec badge rouge (compte des non lus)
- Clic → dropdown `position: fixed` calculé depuis `getBoundingClientRect()` du bouton
- Polling backend toutes les 30s (`refetchInterval`)
- Clic sur une notification → marque comme lue + navigation vers `lien` si présent
- Bouton "Tout marquer lu" visible si `unreadCount > 0`

**Positionnement du dropdown :**
- `position: fixed` — n'est pas clippé par la sidebar
- `top` = `rect.bottom + 8` (juste sous la cloche)
- `left` = `rect.left`, clamped pour rester dans le viewport
- `width` = `min(340px, viewport - 16px)` — s'adapte aux petits écrans

**Hooks utilisés :**
| Hook | Endpoint | Refetch |
|---|---|---|
| `useFetchNotifications()` | `GET /notifications` | 30s |
| `useFetchUnreadCount()` | `GET /notifications/unread-count` | 30s |
| `useMarkAllAsRead()` | `PATCH /notifications/mark-all-read` | mutation |
| `useMarkAsRead(id)` | `PATCH /notifications/{id}/mark-read` | mutation |

---

### `PermutationNotificationBell` (`src/components/PermutationNotificationBell.tsx`)

Cloche spécifique aux permutations en attente pour les SUPERVISOR.

**Comportement :**
- Icône `BellIcon` (heroicons) pleine si permutations en attente, outline sinon
- Badge rouge avec le nombre de permutations `EN_ATTENTE` où `asReceiver = true`
- Clic → dropdown avec liste des permutations en attente (expéditeur, opérateurs, dates, horaires)
- Clic sur une notification ou le footer → navigation vers `/permutations`

**Positionnement du dropdown :**
- `position: absolute`
- Sidebar **étendue** (`expanded=true`) : `left-0 top-full mt-2` → s'ouvre en dessous, aligné à gauche (dans la zone de contenu)
- Sidebar **réduite** (`expanded=false`) : `left-full top-0 ml-3` → s'ouvre à droite de l'icône

**Hook utilisé :**
| Hook | Source | Description |
|---|---|---|
| `useFetchPermutations()` | `modules/permutation/hooks` | Filtre côté front : `asReceiver && status === "EN_ATTENTE"` |

---

## Module `modules/notifications/`

```
modules/notifications/
├── hooks/
│   └── useNotifications.ts   # 4 hooks (fetch, unreadCount, markOne, markAll)
└── types.ts                  # type Notification
```

**Type `Notification` :**
```typescript
type Notification = {
  id: string;
  titre: string;
  message: string;
  lien?: string;      // route interne (ex: "/permutations")
  lu: boolean;
  createdAt: string;  // ISO 8601
};
```

---

## Intégration dans la Sidebar

Dans `Sidebar.tsx`, les cloches sont rendues dans la user card :

```tsx
// Sidebar étendue
<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
  {isSupervisor && <PermutationNotificationBell expanded={expanded} />}
  <NotificationCenter />
</div>

// Sidebar réduite
<div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
  {isSupervisor && <PermutationNotificationBell expanded={expanded} />}
  <NotificationCenter />
</div>
```

---

## À ne pas modifier

- La logique de fetch/mutation dans `useNotifications.ts`
- Le polling interval (30s) — coordonné avec le backend
- `AuthProvider.tsx` dont les hooks dépendent pour le token d'authentification
