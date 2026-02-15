import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AuthResponse } from "../types";

type RegisterPageProps = {
  setAuth: (value: AuthResponse) => void;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RegisterPage = ({ setAuth }: RegisterPageProps): JSX.Element => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const oauthUrl = useMemo(() => `${API_URL}/auth/oauth/google/start`, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");

    try {
      const data = await api.register({ name, email, password });
      setAuth(data);
      navigate("/tasks", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <section className="card auth-card">
      <h1>Create account</h1>
      <p className="subtle">Start organizing your day in a focused workspace.</p>

      <form onSubmit={onSubmit} className="form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} placeholder="Password" required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Create account</button>
      </form>

      <div className="oauth-actions">
        <a className="oauth-link google" href={oauthUrl}>Continue with Google</a>
      </div>

      <p className="switch-auth">Already have account? <Link to="/login">Sign in</Link></p>
    </section>
  );
};

export default RegisterPage;
