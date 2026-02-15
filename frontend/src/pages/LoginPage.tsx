import { FormEvent, useMemo, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AuthResponse } from "../types";

type LoginPageProps = {
  setAuth: (value: AuthResponse) => void;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const LoginPage = ({ setAuth }: LoginPageProps): JSX.Element => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const oauthUrl = useMemo(() => `${API_URL}/auth/oauth/google/start`, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");

    try {
      const data = await api.login({ email, password });
      setAuth(data);
      navigate("/tasks", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onPasskeyLogin = async (): Promise<void> => {
    if (!email.trim()) {
      setError("Enter your email first for passkey sign-in.");
      return;
    }

    setError("");
    setPasskeyLoading(true);

    try {
      const options = await api.passkeyLoginOptions({ email: email.trim() });
      const response = await startAuthentication({ optionsJSON: options as never });
      const data = await api.passkeyLoginVerify({ email: email.trim(), response: response as unknown as Record<string, unknown> });
      setAuth(data);
      navigate("/tasks", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey login failed");
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <section className="card auth-card">
      <h1>Sign in</h1>
      <p className="subtle">Use your account to manage tasks across devices.</p>

      <form onSubmit={onSubmit} className="form">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} placeholder="Password" required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Sign in</button>
      </form>

      <div className="oauth-actions">
        <a className="oauth-link google" href={oauthUrl}>Continue with Google</a>
        <button type="button" className="oauth-link passkey" onClick={() => void onPasskeyLogin()} disabled={passkeyLoading}>
          {passkeyLoading ? "Checking passkey..." : "Continue with Passkey"}
        </button>
      </div>

      <p className="switch-auth">No account? <Link to="/register">Create one</Link></p>
    </section>
  );
};

export default LoginPage;
