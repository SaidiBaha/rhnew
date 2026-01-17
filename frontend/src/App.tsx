import { Routes, Route } from "react-router-dom";

import HomePage from "@/pages/HomePage";
import EmployeesPage from "@/pages/EmployeesPage";
import SalaryAdvancesPage from "@/pages/SalaryAdvancesPage";
import LoginPage from "@/pages/LoginPage";
import { Layout } from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PersistLogin from "@/components/PersistLogin";
import RequestsPage from "@/pages/RequestsPage";
import AttendancesPage from "@/pages/AttendancesPage";
import PermutationsPage from "@/pages/PermutationsPage";
import ChangePasswordCard from "@/modules/auth/components/ChangePasswordCard.tsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PersistLogin />}>
        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR","OPERATIONAL_MANAGER"]} />}
        >
          <Route
            path="/"
            element={
              <Layout>
                <HomePage />
              </Layout>
            }
          />
          <Route
            path="/employees"
            element={
              <Layout>
                <EmployeesPage />
              </Layout>
            }
          />
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}
        >
          <Route
            path="/salary-advances"
            element={
              <Layout>
                <SalaryAdvancesPage />
              </Layout>
            }
          />
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}
        >
          <Route
            path="/attendances"
            element={
              <Layout>
                <AttendancesPage />
              </Layout>
            }
          />
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}
        >
          <Route
            path="/requests"
            element={
              <Layout>
                <RequestsPage />
              </Layout>
            }
          />
        </Route>
      </Route>
        <Route
            element={<ProtectedRoute allowedRoles={["SUPERVISOR","OPERATIONAL_MANAGER"]} />}
        >
            <Route
                path="/permutations"
                element={
                    <Layout>
                        <PermutationsPage />
                    </Layout>
                }
            />
        </Route>
        <Route
            element={<ProtectedRoute allowedRoles={["ADMIN","SUPERVISOR","OPERATIONAL_MANAGER"]} />}
        >
            <Route
                path="/change-password"
                element={
                    <Layout>
                        <ChangePasswordCard />
                    </Layout>
                }
            />
        </Route>
    </Routes>
  );
}
export default App;
