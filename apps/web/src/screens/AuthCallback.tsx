import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Toast } from "../components/shared/Toast";
import { useSessionStore } from "../lib/store/session";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const displayName = searchParams.get("displayName");
  const githubLogin = searchParams.get("githubLogin");

  useEffect(() => {
    if (!token || !userId || !displayName) return;
    setSession({ token, userId, displayName, githubLogin });
    navigate("/projects", { replace: true });
  }, [displayName, githubLogin, navigate, setSession, token, userId]);

  if (!token || !userId || !displayName) {
    return (
      <main className="center-state">
        <Toast message="GitHub sign-in did not return a complete session." variant="error" onDismiss={() => undefined} />
        <Link className="button button-secondary" to="/">Back to sign in</Link>
      </main>
    );
  }

  return <main className="center-state"><div className="loading-line" /><p>Signing you in…</p></main>;
}
