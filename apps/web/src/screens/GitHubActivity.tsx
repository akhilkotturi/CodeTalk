import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ProjectActivityItem, ProjectRepository } from "@CodeTalk/types";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Toast } from "../components/shared/Toast";
import { connectGitHubRepository, getProject, listGitHubRepositories, listProjectActivity, syncGitHubActivity, type Project } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

function activityTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function GitHubActivity() {
  const { id } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const [project, setProject] = useState<Project | null>(null);
  const [repositories, setRepositories] = useState<ProjectRepository[]>([]);
  const [activity, setActivity] = useState<ProjectActivityItem[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    const [loadedProject, loadedRepositories, loadedActivity] = await Promise.all([
      getProject(token, id), listGitHubRepositories(token, id), listProjectActivity(token, id),
    ]);
    setProject(loadedProject);
    setRepositories(loadedRepositories);
    setActivity(loadedActivity);
  }

  useEffect(() => { reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load GitHub activity")); }, [id, token]);

  async function connect() {
    if (!id || !url.trim()) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const repository = await connectGitHubRepository(token, id, url.trim());
      setRepositories((current) => current.some((item) => item.id === repository.id) ? current : [...current, repository]);
      setUrl(""); setNotice("Repository connected. Sync to bring its recent work into the project.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not connect repository"); }
    finally { setBusy(false); }
  }

  async function sync() {
    if (!id) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await syncGitHubActivity(token, id);
      const freshActivity = await listProjectActivity(token, id);
      setActivity(freshActivity);
      setNotice(result.synced ? `${result.synced} new GitHub activities added.` : "Your project activity is already up to date.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not sync GitHub activity"); }
    finally { setBusy(false); }
  }

  if (error && !project) return <main className="center-state"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></main>;
  if (!project) return <main className="center-state"><div className="loading-line" /><p>Loading GitHub activity…</p></main>;

  return <main className="room-shell project-shell">
    <header className="room-header">
      <Link className="wordmark wordmark-small" to={`/projects/${project.id}/overview`}>CT<span className="wordmark-dot" aria-hidden="true" /></Link>
      <div className="room-title-group"><div className="room-state active"><span className="signal-pulse" />GitHub activity</div><h1>{project.name}</h1><p>Keep shipped work, pull requests, and decisions beside the plan.</p></div>
      <div className="room-actions"><Link className="button button-secondary" to={`/projects/${project.id}/presentation`}>Presentation board</Link><Link className="button button-secondary" to={`/projects/${project.id}/overview`}>Overview</Link></div>
    </header>
    <section className="activity-connect">
      <Input label="Repository URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/org/repository" />
      <Button onClick={connect} disabled={busy || !url.trim()}>Connect repository</Button>
      <Button variant="secondary" onClick={sync} disabled={busy || repositories.length === 0}>{busy ? "Working…" : "Sync GitHub"}</Button>
    </section>
    {(error || notice) && <div className="room-alert"><Toast message={error ?? notice!} variant={error ? "error" : "info"} onDismiss={() => { setError(null); setNotice(null); }} /></div>}
    <section className="activity-workspace">
      <aside className="repository-panel"><span className="step-label">Connected repositories</span>{repositories.length ? repositories.map((repository) => <a key={repository.id} href={repository.url} target="_blank" rel="noreferrer">{repository.owner}/{repository.name}</a>) : <p>Connect a public GitHub repository to make its work visible to the project.</p>}</aside>
      <section className="activity-feed" aria-label="GitHub activity feed"><span className="step-label">Recent activity</span>{activity.length ? activity.map((item) => <article className="activity-item" key={item.id}><span>{activityTime(item.occurredAt)}</span>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <strong>{item.title}</strong>}</article>) : <p className="column-empty">No GitHub activity yet. Connect a repository and sync it.</p>}</section>
    </section>
  </main>;
}
