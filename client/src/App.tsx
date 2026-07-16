import { Navigate, Route, Routes } from "react-router";
import { AdminRoute } from "./components/AdminRoute";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { emailSimulatorEnabled } from "./lib/feature-flags";
import { HomePage } from "./pages/HomePage";
import { EmailSimulatorPage } from "./pages/EmailSimulatorPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { LoginPage } from "./pages/LoginPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketsPage } from "./pages/TicketsPage";
import { UsersPage } from "./pages/UsersPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          <Route element={<AdminRoute />}>
            {emailSimulatorEnabled ? (
              <Route path="email-simulator" element={<EmailSimulatorPage />} />
            ) : null}
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
