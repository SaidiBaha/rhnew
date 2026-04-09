import { Routes, Route } from "react-router-dom";

import HomePage from "@/pages/HomePage";
import EmployeesPage from "@/pages/EmployeesPage";
import SalaryAdvancesPage from "@/pages/SalaryAdvancesPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import VerifyOtpPage from "@/pages/VerifyOtpPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { Layout } from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PersistLogin from "@/components/PersistLogin";
import RequestsPage from "@/pages/RequestsPage";
import AttendancesPage from "@/pages/AttendancesPage";
import PermutationsPage from "@/pages/PermutationsPage";
import ChangePasswordCard from "@/modules/auth/components/ChangePasswordCard.tsx";
import OperatorsAvailabilityPage from "@/pages/OperatorsAvailabilityPage";
import EdiPage from "@/pages/EdiPage";
import PresencePage from "@/pages/PresencePage";
import HistoriquePresencePage from "@/pages/HistoriquePresencePage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";

function App() {
  return (
    <Routes>
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/unauthorized"   element={<UnauthorizedPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp"     element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<PersistLogin />}>

        {/* Accueil + Employés : ADMIN, SUPERVISOR, OPERATIONAL_MANAGER, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER", "SUPER_ADMIN"]} />}>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/employees" element={<Layout><EmployeesPage /></Layout>} />
        </Route>

        {/* Avances : ADMIN, SUPERVISOR, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/salary-advances" element={<Layout><SalaryAdvancesPage /></Layout>} />
        </Route>

        {/* Pointage : ADMIN, SUPERVISOR, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/attendances" element={<Layout><AttendancesPage /></Layout>} />
        </Route>

        {/* Présences / Absences du jour : ADMIN, SUPERVISOR, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/presence-absences" element={<Layout><PresencePage /></Layout>} />
        </Route>

        {/* Historique Présences / Absences : ADMIN, SUPERVISOR, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/historique-presence" element={<Layout><HistoriquePresencePage /></Layout>} />
        </Route>

        {/* Demandes : ADMIN, SUPERVISOR, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/requests" element={<Layout><RequestsPage /></Layout>} />
        </Route>

        {/* Permutations : SUPERVISOR, OPERATIONAL_MANAGER, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["SUPERVISOR", "OPERATIONAL_MANAGER", "SUPER_ADMIN"]} />}>
          <Route path="/permutations" element={<Layout><PermutationsPage /></Layout>} />
        </Route>

        {/* Opérateurs disponibles : SUPERVISOR, OPERATIONAL_MANAGER, SUPER_ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["SUPERVISOR", "OPERATIONAL_MANAGER", "SUPER_ADMIN"]} />}>
          <Route path="/free-operators" element={<Layout><OperatorsAvailabilityPage /></Layout>} />
        </Route>

        {/* Module EDI : PLANIFICATEUR + SUPER_ADMIN uniquement (ADMIN exclu) */}
        <Route element={<ProtectedRoute allowedRoles={["PLANIFICATEUR", "SUPER_ADMIN"]} />}>
          <Route path="/edi" element={<Layout><EdiPage /></Layout>} />
        </Route>

        {/* Changer mot de passe : tous les rôles connectés */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER", "PLANIFICATEUR", "SUPER_ADMIN", "NURSE"]} />}>
          <Route path="/change-password" element={<Layout><ChangePasswordCard /></Layout>} />
        </Route>

      </Route>
    </Routes>
  );
}

export default App;
