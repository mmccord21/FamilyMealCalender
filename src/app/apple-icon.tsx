import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const s = 180 / 512
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#2C1810',
          borderRadius: Math.round(115 * s),
          display: 'flex',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: Math.round(211 * s), top: Math.round(110 * s), width: Math.round(20 * s), height: Math.round(122 * s), background: '#C4956A', borderRadius: Math.round(10 * s) }} />
        <div style={{ position: 'absolute', left: Math.round(246 * s), top: Math.round(110 * s), width: Math.round(20 * s), height: Math.round(122 * s), background: '#C4956A', borderRadius: Math.round(10 * s) }} />
        <div style={{ position: 'absolute', left: Math.round(281 * s), top: Math.round(110 * s), width: Math.round(20 * s), height: Math.round(122 * s), background: '#C4956A', borderRadius: Math.round(10 * s) }} />
        <div style={{ position: 'absolute', left: Math.round(211 * s), top: Math.round(216 * s), width: Math.round(90 * s), height: Math.round(26 * s), background: '#C4956A', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: Math.round(246 * s), top: Math.round(216 * s), width: Math.round(20 * s), height: Math.round(192 * s), background: '#C4956A', borderRadius: Math.round(10 * s) }} />
      </div>
    ),
    { width: 180, height: 180 }
  )
}
