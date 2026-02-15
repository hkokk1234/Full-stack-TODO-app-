import { useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AssistantPage from "./pages/AssistantPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import NotificationsPage from "./pages/NotificationsPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import RegisterPage from "./pages/RegisterPage";
import SecurityPage from "./pages/SecurityPage";
import TaskPage from "./pages/TaskPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import type { AuthResponse } from "./types";

const KEY = "todo_auth";

const normalizeAuth = (value: AuthResponse): AuthResponse => ({
  ...value,
  token: value.accessToken || value.token,
  accessToken: value.accessToken || value.token
});

const readAuth = (): AuthResponse | null => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    return normalizeAuth(parsed);
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
};

function App(): JSX.Element {
  const [auth, setAuthState] = useState<AuthResponse | null>(readAuth);

  const setAuth = (value: AuthResponse): void => {
    const normalized = normalizeAuth(value);
    setAuthState(normalized);
    localStorage.setItem(KEY, JSON.stringify(normalized));
  };

  const clearAuth = (): void => {
    setAuthState(null);
    localStorage.removeItem(KEY);
  };

  const token = useMemo(() => auth?.token ?? null, [auth]);

  return (
    <main className="layout">
      <Routes>
        <Route path="/" element={<Navigate to={token ? "/tasks" : "/login"} replace />} />
        <Route path="/login" element={<LoginPage setAuth={setAuth} />} />
        <Route path="/register" element={<RegisterPage setAuth={setAuth} />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage setAuth={setAuth} />} />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute token={token}>
              {auth ? <TaskPage auth={auth} clearAuth={clearAuth} /> : <Navigate to="/login" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/security"
          element={
            <ProtectedRoute token={token}>
              {auth ? <SecurityPage auth={auth} clearAuth={clearAuth} /> : <Navigate to="/login" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute token={token}>
              {auth ? <AssistantPage auth={auth} clearAuth={clearAuth} /> : <Navigate to="/login" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute token={token}>
              {auth ? <AnalyticsPage auth={auth} /> : <Navigate to="/login" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute token={token}>
              {auth ? <NotificationsPage auth={auth} /> : <Navigate to="/login" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces"
          element={
            <ProtectedRoute token={token}>
              {auth ? <WorkspacesPage auth={auth} /> : <Navigate to="/login" replace />}
            </ProtectedRoute>
          }
        />
      </Routes>
    </main>
  );
}

export default App;
