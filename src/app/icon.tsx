import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#2C1810',
          borderRadius: 115,
          display: 'flex',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: 211, top: 110, width: 20, height: 122, background: '#C4956A', borderRadius: 10 }} />
        <div style={{ position: 'absolute', left: 246, top: 110, width: 20, height: 122, background: '#C4956A', borderRadius: 10 }} />
        <div style={{ position: 'absolute', left: 281, top: 110, width: 20, height: 122, background: '#C4956A', borderRadius: 10 }} />
        <div style={{ position: 'absolute', left: 211, top: 216, width: 90, height: 26, background: '#C4956A', borderRadius: 4 }} />
        <div style={{ position: 'absolute', left: 246, top: 216, width: 20, height: 192, background: '#C4956A', borderRadius: 10 }} />
      </div>
    ),
    { width: 512, height: 512 }
  )
}
