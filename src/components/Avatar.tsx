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

export default function Avatar({ name, size = 40, src }: { name: string; size?: number; src?: string | null }) {
  if (src) {
    return (
      <img
        className="avatar avatar-photo"
        src={src}
        alt={name}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
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
  );
}
