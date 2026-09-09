import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { Button } from "../components/shared/Button";
import { Toast } from "../components/shared/Toast";
import { getProject, type Project } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";
import { WS_BASE_URL } from "../lib/config";

const COLLABORATION_URL = `${WS_BASE_URL}/collaboration`;

interface CollaborationSession {
  documentName: string;
  doc: Y.Doc;
  provider: HocuspocusProvider;
  websocketProvider: HocuspocusProviderWebsocket;
}

export function PlanningDoc() {
  const { id } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const displayName = useSessionStore((state) => state.displayName) ?? "Guest";
  const [project, setProject] = useState<Project | null>(null);
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const doc = new Y.Doc();
    const documentName = `project:${id}:plan`;
    const websocketProvider = new HocuspocusProviderWebsocket({ url: COLLABORATION_URL });
    const provider = new HocuspocusProvider({
      name: documentName,
      document: doc,
      websocketProvider,
      token,
      onAuthenticationFailed: ({ reason }) => {
        setError(`Plan connection failed: ${reason}`);
      },
    });
    provider.attach();
    setSession({ documentName, doc, provider, websocketProvider });

    getProject(token, id)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not open the project plan"));

    return () => {
      provider.destroy();
      websocketProvider.destroy();
      doc.destroy();
      setSession(null);
    };
  }, [id, token]);

  if (error) return <main className="center-state"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></main>;
  if (!project || !session) return <main className="center-state"><div className="loading-line" /><p>Opening plan…</p></main>;

  return (
    <main className="room-shell plan-shell">
      <header className="room-header plan-header">
        <Link className="wordmark wordmark-small" to={`/projects/${project.id}/overview`}>CT<span className="wordmark-dot" aria-hidden="true" /></Link>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Collaborative plan</div>
          <h1>{project.name}</h1>
          <p>Draft the shared plan, decisions, demo notes, and launch checklist.</p>
        </div>
        <div className="room-actions">
          <Link className="button button-secondary" to={`/projects/${project.id}/tasks`}>Tasks</Link>
          <Link className="button button-secondary" to={`/projects/${project.id}/whiteboard`}>Whiteboard</Link>
        </div>
      </header>

      <PlanningEditor session={session} displayName={displayName} />
    </main>
  );
}

function PlanningEditor({ session, displayName }: { session: CollaborationSession; displayName: string }) {
  const user = useMemo(() => ({
    name: displayName,
    color: "#c6492d",
  }), [displayName]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
        LinkExtension.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: "Draft the plan, decisions, demo notes, and links." }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Collaboration.configure({ document: session.doc }),
        CollaborationCursor.configure({ provider: session.provider, user }),
      ],
      editorProps: {
        attributes: {
          "aria-label": "Project planning document",
          "data-document-name": session.documentName,
          class: "plan-editor",
        },
      },
    },
    [session, user]
  );

  function run(command: () => boolean): void {
    command();
  }

  if (!editor) return <section className="plan-workspace"><div className="loading-line" /><p>Preparing editor…</p></section>;

  return (
    <section className="plan-workspace">
      <div className="plan-toolbar" aria-label="Planning document tools">
        <Button variant="secondary" onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>Heading</Button>
        <Button variant="secondary" onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>Bullets</Button>
        <Button variant="secondary" onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>Numbers</Button>
        <Button variant="secondary" onClick={() => run(() => editor.chain().focus().toggleTaskList().run())}>Checklist</Button>
        <Button variant="secondary" onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}>Quote</Button>
        <Button variant="secondary" onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}>Code</Button>
        <Button variant="secondary" onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>Table</Button>
      </div>
      <EditorContent editor={editor} />
    </section>
  );
}
