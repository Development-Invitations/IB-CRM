export default function LoadingScreen({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? 'loading-inline' : 'loading-screen'}>
      <img src="/brand/logo-mark.png" alt="" className={compact ? 'loading-logo-sm' : 'loading-logo'} />
    </div>
  );
}
