export function ReconnectBanner() {
  return (
    <div
      role="status"
      className="reconnect-banner"
    >
      <span className="signal-pulse" aria-hidden="true" /> Reconnecting to the room…
    </div>
  );
}
