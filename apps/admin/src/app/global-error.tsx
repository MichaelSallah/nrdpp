'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Something went wrong</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>{error.message}</p>
            <button onClick={reset} style={{ padding: '8px 16px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
