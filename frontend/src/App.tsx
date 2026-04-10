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

// ✅ HEAD
import SalaryAdvancesHistoryPage from "@/pages/SalaryAdvancesHistoryPage";

// ✅ MAIN
import EdiPage from "@/pages/EdiPage";
import PresencePage from "@/pages/PresencePage";
import HistoriquePresencePage from "@/pages/HistoriquePresencePage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<PersistLogin />}>

        {/* Accueil + Employés */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER", "SUPER_ADMIN"]} />}>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/employees" element={<Layout><EmployeesPage /></Layout>} />
        </Route>

        {/* Avances */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/salary-advances" element={<Layout><SalaryAdvancesPage /></Layout>} />
        </Route>

        {/* ✅ Historique Avances (HEAD) */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route
            path="/salary-advances/history"
            element={
              <Layout>
                <SalaryAdvancesHistoryPage />
              </Layout>
            }
          />
        </Route>

        {/* ✅ Pointage (fusion → avec SUPER_ADMIN) */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/attendances" element={<Layout><AttendancesPage /></Layout>} />
        </Route>

        {/* Présences / Absences */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/presence-absences" element={<Layout><PresencePage /></Layout>} />
        </Route>

        {/* Historique Présences */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/historique-presence" element={<Layout><HistoriquePresencePage /></Layout>} />
        </Route>

        {/* Demandes */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]} />}>
          <Route path="/requests" element={<Layout><RequestsPage /></Layout>} />
        </Route>

        {/* Permutations */}
        <Route element={<ProtectedRoute allowedRoles={["SUPERVISOR", "OPERATIONAL_MANAGER", "SUPER_ADMIN"]} />}>
          <Route path="/permutations" element={<Layout><PermutationsPage /></Layout>} />
        </Route>

        {/* Opérateurs disponibles */}
        <Route element={<ProtectedRoute allowedRoles={["SUPERVISOR", "OPERATIONAL_MANAGER", "SUPER_ADMIN"]} />}>
          <Route path="/free-operators" element={<Layout><OperatorsAvailabilityPage /></Layout>} />
        </Route>

        {/* EDI */}
        <Route element={<ProtectedRoute allowedRoles={["PLANIFICATEUR", "SUPER_ADMIN"]} />}>
          <Route path="/edi" element={<Layout><EdiPage /></Layout>} />
        </Route>

        {/* Changer mot de passe */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER", "PLANIFICATEUR", "SUPER_ADMIN", "NURSE"]} />}>
          <Route path="/change-password" element={<Layout><ChangePasswordCard /></Layout>} />
        </Route>

      </Route>
    </Routes>
  );
}

export default App;