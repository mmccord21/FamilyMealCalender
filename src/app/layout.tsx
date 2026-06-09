import type { Metadata, Viewport } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#2C1810",
};

export const metadata: Metadata = {
  title: "Tonight",
  description: "Stop guessing. Tonight tells you what's for dinner — plan meals, build your grocery list, and get your week sorted.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tonight",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" style={{ background: '#FDF8F0' }}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Tonight" />
          <link rel="apple-touch-icon" href="/apple-icon" />
        </head>
        <body>
          {/* Inline splash — paints immediately from raw HTML before any CSS/JS loads.
              MealPlannerApp removes it on mount once the app is ready. */}
          <div
            id="__splash"
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: '#FDF8F0',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '14px',
            }}
          >
            <svg width="72" height="72" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="115" fill="#2C1810" />
              <g fill="#C4956A">
                <rect x="211" y="110" width="20" height="122" rx="10" />
                <rect x="246" y="110" width="20" height="122" rx="10" />
                <rect x="281" y="110" width="20" height="122" rx="10" />
                <rect x="211" y="216" width="90" height="26" rx="4" />
                <rect x="246" y="216" width="20" height="192" rx="10" />
              </g>
            </svg>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 600, color: '#2C1810', letterSpacing: '-0.01em' }}>
              Tonight
            </div>
            <div style={{ fontFamily: 'sans-serif', fontSize: '12px', color: '#9B8B7B', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Loading your week…
            </div>
          </div>
          {/* Fallback: auto-remove splash after 12 s if React never mounts */}
          <script dangerouslySetInnerHTML={{ __html: `(function(){var t=setTimeout(function(){var s=document.getElementById('__splash');if(s){s.style.transition='opacity .3s';s.style.opacity='0';setTimeout(function(){s.remove()},300)}},12000);window.__splashTimer=t;})()` }} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
