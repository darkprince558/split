export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function recordingSessions(clips: { sessionId: string; createdAt: number }[]) {
  const sessions = new Map<string, { id: string; createdAt: number; count: number }>();
  for (const clip of clips) {
    const session = sessions.get(clip.sessionId);
    if (session) {
      session.count += 1;
      session.createdAt = Math.min(session.createdAt, clip.createdAt);
    } else {
      sessions.set(clip.sessionId, { id: clip.sessionId, createdAt: clip.createdAt, count: 1 });
    }
  }
  return [...sessions.values()].sort((a, b) => b.createdAt - a.createdAt);
}
