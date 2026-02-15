import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthResponse } from "../types";

type OAuthCallbackPageProps = {
  setAuth: (value: AuthResponse) => void;
};

const OAuthCallbackPage = ({ setAuth }: OAuthCallbackPageProps): JSX.Element => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);

    const error = params.get("error");
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const id = params.get("id");
    const name = params.get("name");
    const email = params.get("email");

    if (error || !token || !id || !name || !email) {
      navigate("/login", { replace: true });
      return;
    }

    setAuth({ token, accessToken: token, refreshToken: refreshToken || undefined, user: { id, name, email } });
    navigate("/tasks", { replace: true });
  }, [navigate, setAuth]);

  return (
    <section className="card">
      <h1>Signing you in...</h1>
      <p>Please wait.</p>
    </section>
  );
};

export default OAuthCallbackPage;
