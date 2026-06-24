export default function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: '60vh',
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid var(--glass-border-light)',
          borderTopColor: 'rgba(139,92,246,0.8)',
          animation: 'loadSpin 0.8s linear infinite',
          boxShadow: '0 0 16px rgba(139,92,246,0.3)',
        }}
      />
      <style>{`@keyframes loadSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
