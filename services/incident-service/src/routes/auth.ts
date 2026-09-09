import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import { pool } from "../db/index";

export const authRouter = Router();
const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

interface GitHubUser {
  id: number;
  login: string;
  name?: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function issueAppToken(user: { id: string; displayName: string; githubLogin?: string | null }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(
    { sub: user.id, displayName: user.displayName, githubLogin: user.githubLogin ?? undefined },
    secret,
    { expiresIn: "24h" }
  );
}

function stableUserIdForGitHub(githubId: number): string {
  const hex = createHash("sha256").update(`github:${githubId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function ensureUsersTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      display_name text NOT NULL,
      github_login text UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function upsertGitHubUser(githubUser: GitHubUser): Promise<{ id: string; displayName: string; githubLogin: string }> {
  await ensureUsersTable();
  const id = stableUserIdForGitHub(githubUser.id);
  const displayName = githubUser.name?.trim() || githubUser.login;
  const result = await pool.query<{ id: string; display_name: string; github_login: string }>(
    `INSERT INTO users (id, display_name, github_login)
     VALUES ($1, $2, $3)
     ON CONFLICT (github_login) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id, display_name, github_login`,
    [id, displayName, githubUser.login]
  );
  return {
    id: result.rows[0].id,
    displayName: result.rows[0].display_name,
    githubLogin: result.rows[0].github_login,
  };
}

authRouter.post("/token", (req: Request, res: Response) => {
  if (process.env.ALLOW_DEV_AUTH !== "true") {
    res.status(403).json({ error: "GitHub sign-in required" });
    return;
  }

  const { userId } = req.body as { userId?: string };
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const normalizedUserId = userId.trim();
    const identity = UUID_PATTERN.test(normalizedUserId) ? normalizedUserId : randomUUID();
    const token = issueAppToken({ id: identity, displayName: normalizedUserId });
    res.status(200).json({ token, userId: identity, displayName: normalizedUserId });
  } catch (error) {
    console.error("POST /auth/token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.get("/github/start", (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "GitHub auth is not configured" });
    return;
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!redirectUri) {
    res.status(503).json({ error: "GitHub redirect URI is not configured" });
    return;
  }
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  res.redirect(url.toString());
});

authRouter.get("/github/callback", async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!code) {
    res.status(400).json({ error: "GitHub code is required" });
    return;
  }
  if (!clientId || !clientSecret || !frontendUrl) {
    res.status(503).json({ error: "GitHub auth is not configured" });
    return;
  }

  try {
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenPayload = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error(tokenPayload.error ?? "GitHub token exchange failed");

    const githubHeaders = { Authorization: `Bearer ${tokenPayload.access_token}`, Accept: "application/vnd.github+json" };
    const [userResponse, emailsResponse] = await Promise.all([
      fetch(GITHUB_USER_URL, { headers: githubHeaders }),
      fetch(GITHUB_EMAILS_URL, { headers: githubHeaders }),
    ]);
    if (!userResponse.ok) throw new Error("Could not load GitHub profile");

    const githubUser = await userResponse.json() as GitHubUser;
    await emailsResponse.json().catch(() => []) as GitHubEmail[];
    const user = await upsertGitHubUser(githubUser);
    const token = issueAppToken({ id: user.id, displayName: user.displayName, githubLogin: user.githubLogin });

    const redirect = new URL("/auth/callback", frontendUrl);
    redirect.searchParams.set("token", token);
    redirect.searchParams.set("userId", user.id);
    redirect.searchParams.set("displayName", user.displayName);
    redirect.searchParams.set("githubLogin", user.githubLogin);
    res.redirect(redirect.toString());
  } catch (error) {
    console.error("GET /auth/github/callback error:", error);
    const redirect = new URL("/", frontendUrl);
    redirect.searchParams.set("authError", "GitHub sign-in failed");
    res.redirect(redirect.toString());
  }
});
