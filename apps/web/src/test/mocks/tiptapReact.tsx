import type { ReactNode } from "react";

function chain() {
  const api = {
    focus: () => api,
    toggleHeading: (_options: unknown) => api,
    toggleBulletList: () => api,
    toggleOrderedList: () => api,
    toggleTaskList: () => api,
    toggleBlockquote: () => api,
    toggleCodeBlock: () => api,
    insertTable: (_options: unknown) => api,
    run: () => true,
  };
  return api;
}

export function useEditor(options: { editorProps?: { attributes?: Record<string, string> } } | null) {
  return {
    chain,
    isActive: () => false,
    options,
  };
}

export function EditorContent({ editor }: { editor: ReturnType<typeof useEditor>; children?: ReactNode }) {
  return (
    <div
      data-testid="editor-content"
      data-document-name={editor.options?.editorProps?.attributes?.["data-document-name"]}
    />
  );
}
