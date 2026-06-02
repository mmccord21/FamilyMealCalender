export default function OfflinePage() {
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: '#FDF8F0',
      color: '#2C1810',
      fontFamily: "'DM Sans', sans-serif",
      padding: '32px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '56px' }}>🥗</span>
      <h1 style={{ fontSize: '22px', fontWeight: 600, margin: 0 }}>You&apos;re offline</h1>
      <p style={{ fontSize: '15px', color: '#9B8B7B', maxWidth: '280px', lineHeight: 1.5, margin: 0 }}>
        Check your connection. Your meal plan will sync automatically when you&apos;re back online.
      </p>
    </div>
  );
}
