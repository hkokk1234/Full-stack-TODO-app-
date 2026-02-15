import config from "../config/env";
import jwt from "jsonwebtoken";

export type OAuthProvider = "google";

type OAuthProfile = {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string;
};

const GOOGLE_SCOPE = "openid profile email";

const encodeState = (provider: OAuthProvider): string => {
  return jwt.sign({ provider, typ: "oauth_state" }, config.jwtSecret, { expiresIn: "10m" });
};

export const decodeState = (token: string): { provider: OAuthProvider } => {
  const payload = jwt.verify(token, config.jwtSecret) as { provider?: OAuthProvider; typ?: string };
  if (!payload.provider || payload.typ !== "oauth_state") {
    throw new Error("Invalid OAuth state");
  }
  return { provider: payload.provider };
};

const hasGoogleConfig = (): boolean => Boolean(config.googleClientId && config.googleClientSecret && config.googleRedirectUri);

export const isProviderConfigured = (provider: OAuthProvider): boolean => {
  return provider === "google" && hasGoogleConfig();
};

export const buildAuthorizationUrl = (provider: OAuthProvider): string => {
  const state = encodeState(provider);

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    include_granted_scopes: "true",
    prompt: "select_account",
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const exchangeGoogleCode = async (code: string): Promise<string> => {
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: config.googleRedirectUri,
    grant_type: "authorization_code"
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed (${tokenRes.status})`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) throw new Error("Google access token missing");
  return tokenData.access_token;
};

const fetchGoogleProfile = async (accessToken: string): Promise<OAuthProfile> => {
  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!profileRes.ok) {
    throw new Error(`Google userinfo failed (${profileRes.status})`);
  }

  const profile = (await profileRes.json()) as { sub?: string; email?: string; name?: string };
  if (!profile.sub || !profile.email) throw new Error("Google profile is missing required fields");

  return {
    provider: "google",
    providerId: profile.sub,
    email: profile.email,
    name: profile.name || profile.email.split("@")[0]
  };
};

export const fetchOAuthProfile = async (_provider: OAuthProvider, code: string): Promise<OAuthProfile> => {
  const accessToken = await exchangeGoogleCode(code);
  return fetchGoogleProfile(accessToken);
};

export const buildFrontendCallbackUrl = (payload: {
  token?: string;
  refreshToken?: string;
  id?: string;
  name?: string;
  email?: string;
  error?: string;
}): string => {
  const url = new URL(config.oauthFrontendCallbackUrl);
  const hash = new URLSearchParams();

  if (payload.token) hash.set("token", payload.token);
  if (payload.refreshToken) hash.set("refreshToken", payload.refreshToken);
  if (payload.id) hash.set("id", payload.id);
  if (payload.name) hash.set("name", payload.name);
  if (payload.email) hash.set("email", payload.email);
  if (payload.error) hash.set("error", payload.error);

  url.hash = hash.toString();
  return url.toString();
};
