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
  title: "Weekly Meal Planner",
  description: "Plan your weekly meals, manage recipes, and build your shopping list.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Meal Planner",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
          {/* Simple inline PWA manifest hack from the original app */}
          <link
            rel="manifest"
            href={"data:application/json," + encodeURIComponent(JSON.stringify({
              name: 'Weekly Meal Planner',
              short_name: 'Meal Plan',
              start_url: '.',
              display: 'standalone',
              background_color: '#FDF8F0',
              theme_color: '#2C1810',
              icons: [{
                src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%232C1810'/><text y='.9em' font-size='72' x='12'>🥗</text></svg>",
                sizes: 'any',
                type: 'image/svg+xml'
              }]
            }))}
          />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
