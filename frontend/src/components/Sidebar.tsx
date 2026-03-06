import { useState } from "react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ArrowLeftIcon, ArrowRightIcon, LogOut } from "lucide-react";
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

const SidebarItem = ({
  icon,
  active = false,
  label,
  expanded,
  onClick,
}: SidebarItemProps) => {
  return (
    <li>
      <button
        onClick={onClick}
        title={!expanded ? label : undefined}
        className={`
          relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
          ${
            active
              ? "bg-white/15 text-white ring-1 ring-white/20 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-white"
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        <DynamicIcon name={icon} className="h-[18px] w-[18px] shrink-0" />
        {expanded && (
          <span className="whitespace-nowrap tracking-wide">{label}</span>
        )}
      </button>
    </li>
  );
};

/* ===================== SIDEBAR ===================== */
interface NavigationItem {
  label: string;
  icon: IconName;
  path: string;
  allowedRoles: UserRole[];
}

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

  const navigationItems: NavigationItem[] = [
    { label: "Accueil", icon: "home", path: "/", allowedRoles: ["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"] },
    { label: "Employés", icon: "users", path: "/employees", allowedRoles: ["ADMIN"] },
    { label: "Création d'Employés", icon: "user-plus", path: "", allowedRoles: ["ADMIN"] },
    { label: "Avances", icon: "hand-coins", path: "/salary-advances", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Pointage", icon: "clipboard-clock", path: "/attendances", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Correction Pointage", icon: "search-check", path: "", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Demandes Documents", icon: "newspaper", path: "/requests", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Gestion de Carrière", icon: "briefcase-business", path: "", allowedRoles: ["ADMIN", "SUPERVISOR"] },
    { label: "Permutations", icon: "shuffle", path: "/permutations", allowedRoles: ["SUPERVISOR", "OPERATIONAL_MANAGER"] },
    { label: "Opérateurs Disponibles", icon: "user-check", path: "/free-operators", allowedRoles: ["SUPERVISOR", "OPERATIONAL_MANAGER"] },
    { label: "Changer mot de passe", icon: "lock-keyhole", path: "/change-password", allowedRoles: ["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER"] },
  ];

  const isSupervisor = user?.role === "SUPERVISOR";

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside
      data-expanded={String(expanded)}
      className={`fixed left-0 top-0 h-screen bg-[#687818] transition-all duration-300 z-40 flex flex-col shadow-xl ${
        expanded ? "w-64" : "w-20"
      }`}
    >
      <nav className="flex h-full flex-col">
        {/* ================= LOGO ================= */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#687818] text-lg font-black shadow-sm">
              S
            </div>
            {expanded && (
              <span className="text-sm font-bold text-white leading-tight">
                Sage<br />
                <span className="font-normal opacity-80">Automotive</span>
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
            title={expanded ? "Réduire" : "Agrandir"}
          >
            {expanded ? (
              <ArrowLeftIcon className="h-3.5 w-3.5" />
            ) : (
              <ArrowRightIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* ================= USER ================= */}
        {user && (
          <div className={`mx-3 my-3 rounded-xl bg-white/10 text-white ${expanded ? "px-3 py-3" : "flex flex-col items-center gap-2 py-3"}`}>
            {expanded ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate text-sm font-semibold">{user.fullName}</div>
                  <div className="text-[11px] opacity-70">#{user.matricule}</div>
                  <span className="mt-0.5 inline-block rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                    {user.role}
                  </span>
                </div>
                {/* Cloche notifications — superviseurs uniquement */}
                {isSupervisor && <PermutationNotificationBell expanded={expanded} />}
              </div>
            ) : (
              <>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-sm font-bold"
                  title={user.fullName}
                >
                  {initials}
                </div>
                {/* Cloche notifications — superviseurs uniquement */}
                {isSupervisor && <PermutationNotificationBell expanded={expanded} />}
              </>
            )}
          </div>
        )}

        {/* ================= MENU ================= */}
        <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
          {navigationItems
            .filter(
              (item) =>
                auth.user?.role &&
                item.allowedRoles.includes(auth.user.role)
            )
            .map((item, index) => (
              <SidebarItem
                key={index}
                icon={item.icon}
                label={item.label}
                expanded={expanded}
                active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              />
            ))}
        </ul>

        {/* ================= LOGOUT ================= */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={signOut}
            title={!expanded ? "Déconnexion" : undefined}
            className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-500/80 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {expanded && "Déconnexion"}
          </button>
        </div>
      </nav>
    </aside>
  );
};