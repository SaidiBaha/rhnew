import { useState } from "react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ArrowLeftIcon, ArrowRightIcon, LogOut, Lock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import useLogout from "@/hooks/useLogout";
import useAuth from "@/hooks/useAuth";
import type { UserRole } from "@/modules/auth/types";
import { PermutationNotificationBell } from "@/components/PermutationNotificationBell";

/* ===================== SIDEBAR ITEM ===================== */
interface SidebarItemProps {
  active?: boolean;
  icon: IconName;
  label: string;
  expanded: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, active = false, label, expanded, onClick }: SidebarItemProps) => {
  return (
    <li>
      <button
        onClick={onClick}
        title={!expanded ? label : undefined}
        className={`
          relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150
          ${
            active
              ? "bg-(--sidebar-active) text-white font-semibold border border-[rgba(47,107,255,0.2)] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-(--accent)"
              : "text-[rgba(255,255,255,0.65)] hover:bg-(--sidebar-hover) hover:text-white font-medium"
          }
        `}
      >
        <DynamicIcon name={icon} className="h-[17px] w-[17px] shrink-0" />
        {expanded && (
          <span className="whitespace-nowrap text-[13px]">{label}</span>
        )}
      </button>
    </li>
  );
};

/* ===================== NAV GROUP ===================== */
interface NavigationItem {
  label: string;
  icon: IconName;
  path: string;
  allowedRoles: UserRole[];
}

interface NavGroupProps {
  label: string;
  items: NavigationItem[];
  expanded: boolean;
  userRole: UserRole | undefined;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const NavGroup = ({ label, items, expanded, userRole, currentPath, onNavigate }: NavGroupProps) => {
  const visible = items.filter(
    (item) => userRole && item.allowedRoles.includes(userRole)
  );
  if (visible.length === 0) return null;

  return (
    <div className="mb-1">
      {expanded && (
        <div
          className="px-3 pt-3 pb-1"
          style={{
            fontSize: "9px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {label}
        </div>
      )}
      {!expanded && <div className="my-1 mx-3 border-t border-[rgba(255,255,255,0.08)]" />}
      <ul className="space-y-0.5 px-2">
        {visible.map((item, i) => (
          <SidebarItem
            key={i}
            icon={item.icon}
            label={item.label}
            expanded={expanded}
            active={currentPath === item.path && item.path !== ""}
            onClick={() => onNavigate(item.path)}
          />
        ))}
      </ul>
    </div>
  );
};

/* ===================== SIDEBAR ===================== */
const PRINCIPAL_ITEMS: NavigationItem[] = [
  { label: "Accueil",              icon: "home",               path: "/",                allowedRoles: ["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"] },
  { label: "Employés",             icon: "users",              path: "/employees",       allowedRoles: ["ADMIN"] },
  { label: "Création d'Employés",  icon: "user-plus",          path: "",                 allowedRoles: ["ADMIN"] },
  { label: "Avances",              icon: "hand-coins",         path: "/salary-advances", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { label: "Pointage",             icon: "clipboard-clock",    path: "/attendances",     allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { label: "Correction Pointage",  icon: "search-check",       path: "",                 allowedRoles: ["ADMIN", "SUPERVISOR"] },
];

const GESTION_ITEMS: NavigationItem[] = [
  { label: "Demandes Documents",    icon: "newspaper",           path: "/requests",       allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { label: "Gestion de Carrière",   icon: "briefcase-business",  path: "",                allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { label: "Permutations",          icon: "shuffle",             path: "/permutations",   allowedRoles: ["SUPERVISOR", "OPERATIONAL_MANAGER"] },
  { label: "Opérateurs Disponibles",icon: "user-check",          path: "/free-operators", allowedRoles: ["SUPERVISOR", "OPERATIONAL_MANAGER"] },
];

export const Sidebar = () => {
  const [expanded, setExpanded] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth.user;
  const logout = useLogout();

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const isSupervisor = user?.role === "SUPERVISOR";

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const roleLabelMap: Record<string, string> = {
    ADMIN: "Admin",
    SUPERVISOR: "Superviseur",
    OPERATIONAL_MANAGER: "Chef d'opérations",
  };
  const roleLabel = user?.role ? (roleLabelMap[user.role] ?? user.role) : "";

  return (
    <aside
      data-expanded={String(expanded)}
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "2px 0 20px rgba(0,0,0,0.18)",
      }}
      className={`fixed left-0 top-0 h-screen transition-all duration-300 z-40 flex flex-col ${
        expanded ? "w-64" : "w-20"
      }`}
    >
      {/* Orange top accent filet */}
      <div
        className="absolute top-0 right-0 w-[3px] h-24 rounded-b-full"
        style={{ background: "linear-gradient(to bottom, var(--accent), transparent)" }}
      />

      <nav className="flex h-full flex-col">
        {/* ================= LOGO ================= */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Brand mark */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-base font-black shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              S
            </div>
            {expanded && (
              <div className="overflow-hidden">
                <div
                  className="text-sm leading-tight truncate"
                  style={{ fontWeight: 700, color: "#ffffff" }}
                >
                  Sage RH
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  Automotive
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 rounded-md p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            title={expanded ? "Réduire" : "Agrandir"}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLElement).style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            {expanded ? <ArrowLeftIcon className="h-3.5 w-3.5" /> : <ArrowRightIcon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* ================= USER CARD ================= */}
        {user && (
          <div
            className={`mx-3 my-3 rounded-lg ${expanded ? "px-3 py-3" : "flex flex-col items-center gap-2 py-3"}`}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {expanded ? (
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div
                    className="truncate text-sm font-semibold"
                    style={{ color: "#ffffff" }}
                  >
                    {user.fullName}
                  </div>
                  <div
                    className="font-mono-data"
                    style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)" }}
                  >
                    Matricule #{user.matricule}
                  </div>
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      background: "rgba(47,107,255,0.2)",
                      color: "#7ea8ff",
                      border: "1px solid rgba(47,107,255,0.25)",
                    }}
                  >
                    {roleLabel}
                  </span>
                </div>
                {isSupervisor && <PermutationNotificationBell expanded={expanded} />}
              </div>
            ) : (
              <>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--accent)" }}
                  title={user.fullName}
                >
                  {initials}
                </div>
                {isSupervisor && <PermutationNotificationBell expanded={expanded} />}
              </>
            )}
          </div>
        )}

        {/* ================= MENU ================= */}
        <div className="flex-1 overflow-y-auto py-1">
          <NavGroup
            label="Principal"
            items={PRINCIPAL_ITEMS}
            expanded={expanded}
            userRole={user?.role}
            currentPath={location.pathname}
            onNavigate={(path) => navigate(path)}
          />
          <NavGroup
            label="Gestion"
            items={GESTION_ITEMS}
            expanded={expanded}
            userRole={user?.role}
            currentPath={location.pathname}
            onNavigate={(path) => navigate(path)}
          />
        </div>

        {/* ================= FOOTER ================= */}
        <div
          className="p-3 space-y-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Change password */}
          {user?.role && (["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"] as UserRole[]).includes(user.role) && (
            <button
              onClick={() => navigate("/change-password")}
              title={!expanded ? "Changer mot de passe" : undefined}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
                location.pathname === "/change-password"
                  ? "bg-(--sidebar-active) text-white font-semibold"
                  : "text-[rgba(255,255,255,0.65)] hover:bg-(--sidebar-hover) hover:text-white"
              }`}
            >
              <Lock className="h-[17px] w-[17px] shrink-0" />
              {expanded && <span className="whitespace-nowrap text-[13px]">Changer mot de passe</span>}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={signOut}
            title={!expanded ? "Déconnexion" : undefined}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150"
            style={{ color: "var(--text-2)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--red-soft)";
              (e.currentTarget as HTMLElement).style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
          >
            <LogOut className="h-[17px] w-[17px] shrink-0" />
            {expanded && <span className="whitespace-nowrap text-[13px]">Déconnexion</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
};
