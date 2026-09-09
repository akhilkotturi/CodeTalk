import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Toast } from "../components/shared/Toast";
import { createPresentationPin, getProjectPresentation, type ProjectPresentation } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function PresentationBoard() {
  const { id } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const [presentation, setPresentation] = useState<ProjectPresentation | null>(null);
  const [talkingPoint, setTalkingPoint] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    setPresentation(await getProjectPresentation(token, id));
  }
  useEffect(() => { reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load presentation board")); }, [id, token]);

  async function addTalkingPoint() {
    if (!id || !talkingPoint.trim()) return;
    const note = talkingPoint.trim();
    try {
      await createPresentationPin(token, id, { sourceType: "note", sourceId: note, note });
      setTalkingPoint(""); await reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save talking point"); }
  }
  async function pinActivity(activityId: string, title: string) {
    if (!id) return;
    try { await createPresentationPin(token, id, { sourceType: "activity", sourceId: activityId, note: title }); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save activity to the briefing"); }
  }

  if (error && !presentation) return <main className="center-state"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></main>;
  if (!presentation) return <main className="center-state"><div className="loading-line" /><p>Building presentation board…</p></main>;
  const { project, taskCounts, recentActivity, pins } = presentation;

  return <main className="room-shell project-shell presentation-shell">
    <header className="room-header">
      <Link className="wordmark wordmark-small" to={`/projects/${project.id}/overview`}>CT<span className="wordmark-dot" aria-hidden="true" /></Link>
      <div className="room-title-group"><div className="room-state active"><span className="signal-pulse" />Presentation board</div><h1>{project.name}</h1><p>{project.description || "A live briefing built from the project, not a separate slide file."}</p></div>
      <div className="room-actions"><Link className="button button-secondary" to={`/projects/${project.id}/activity`}>GitHub activity</Link><Link className="button button-secondary" to={`/projects/${project.id}/overview`}>Overview</Link></div>
    </header>
    {error && <div className="room-alert"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></div>}
    <section className="presentation-summary"><div><span className="step-label">Project progress</span><h2>{taskCounts.done} done</h2><p>{taskCounts.doing} in motion · {taskCounts.blocked} blocked · {taskCounts.backlog} queued</p></div><div className="presentation-links"><Link to={`/projects/${project.id}/plan`}>Open plan</Link><Link to={`/projects/${project.id}/tasks`}>Open tasks</Link><Link to={`/projects/${project.id}/whiteboard`}>Open whiteboard</Link></div></section>
    <section className="presentation-grid">
      <section className="presentation-panel"><span className="step-label">Proof from the work</span>{recentActivity.length ? recentActivity.map((item) => <article className="presentation-activity" key={item.id}><div>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <strong>{item.title}</strong>}</div><button className="text-button" onClick={() => pinActivity(item.id, item.title)}>Pin to briefing</button></article>) : <p className="column-empty">Sync a connected repository to add evidence from the work.</p>}</section>
      <section className="presentation-panel"><span className="step-label">Your narrative</span><div className="talking-point-composer"><Input label="Talking point" value={talkingPoint} onChange={(event) => setTalkingPoint(event.target.value)} placeholder="What should the room remember?" /><Button onClick={addTalkingPoint} disabled={!talkingPoint.trim()}>Add talking point</Button></div>{pins.length ? <div className="presentation-pins">{pins.map((pin) => <article key={pin.id}>{pin.note || pin.sourceId}</article>)}</div> : <p className="column-empty">Add the decisions and outcomes that give the work a clear story.</p>}</section>
    </section>
  </main>;
}
