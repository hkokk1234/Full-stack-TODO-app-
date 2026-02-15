import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AuthResponse, Session } from "../types";

type SecurityPageProps = {
  auth: AuthResponse;
  clearAuth: () => void;
};

const SecurityPage = ({ auth, clearAuth }: SecurityPageProps): JSX.Element => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      const data = await api.listSessions(auth.token);
      setSessions(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    }
  }, [auth.token]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const onRegisterPasskey = async (): Promise<void> => {
    try {
      setBusy(true);
      setError("");
      const options = await api.passkeyRegisterOptions(auth.token);
      const response = await startRegistration({ optionsJSON: options as never });
      await api.passkeyRegisterVerify(auth.token, { response: response as unknown as Record<string, unknown> });
      setNotice("Passkey registered.");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey setup failed");
    } finally {
      setBusy(false);
    }
  };

  const onLogoutOtherDevices = async (): Promise<void> => {
    try {
      setBusy(true);
      setError("");
      await api.logoutOtherDevices(auth.token, auth.sessionId);
      setNotice("Other devices were logged out.");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to logout other devices");
    } finally {
      setBusy(false);
    }
  };

  const onRevokeSession = async (sessionId: string): Promise<void> => {
    try {
      setBusy(true);
      setError("");
      await api.revokeSession(auth.token, sessionId);
      setNotice("Session revoked.");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="security-page card">
      <header className="security-header">
        <div>
          <h1>Account & Security</h1>
          <p className="subtle">Manage passkeys and active sessions for {auth.user.email}.</p>
        </div>
        <Link className="oauth-link" to="/tasks">Back to tasks</Link>
      </header>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <div className="security-actions">
        <button onClick={() => void onRegisterPasskey()} disabled={busy}>
          Register passkey
        </button>
        <button onClick={() => void onLogoutOtherDevices()} disabled={busy}>
          Logout other devices
        </button>
        <Link className="oauth-link" to="/assistant">AI Assistant</Link>
      </div>

      <button className="logout-link-inline" onClick={clearAuth}>Logout</button>

      <section className="session-table">
        <h2>Active sessions</h2>
        <ul className="session-list">
          {sessions.map((session) => (
            <li key={session.id}>
              <div>
                <strong>{session.userAgent || "Unknown device"}</strong>
                <p>{session.ipAddress} | Last used: {new Date(session.lastUsedAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => void onRevokeSession(session.id)}
                disabled={busy || session.id === auth.sessionId}
                title={session.id === auth.sessionId ? "Current session" : "Revoke session"}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
};

export default SecurityPage;
