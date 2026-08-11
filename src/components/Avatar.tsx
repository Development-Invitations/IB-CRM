const PALETTE = ['#1E3A8A', '#B45309', '#0F766E', '#7C3AED', '#BE123C', '#0369A1'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Avatar({
  name,
  size = 40,
  src,
  online,
}: {
  name: string;
  size?: number;
  src?: string | null;
  online?: boolean;
}) {
  const dot = online !== undefined && (
    <span
      className={`avatar-status-dot ${online ? 'online' : ''}`}
      style={{ width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24) }}
    />
  );

  if (src) {
    return (
      <span className="avatar-wrap" style={{ width: size, height: size }}>
        <img className="avatar avatar-photo" src={src} alt={name} style={{ width: size, height: size }} />
        {dot}
      </span>
    );
  }

  return (
    <span className="avatar-wrap" style={{ width: size, height: size }}>
      <div
        className="avatar"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          background: colorForName(name || '?'),
        }}
      >
        {initials(name)}
      </div>
      {dot}
    </span>
  );
}
