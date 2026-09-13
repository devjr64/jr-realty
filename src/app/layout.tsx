import type { Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'

import { Toaster } from '@/components/ui/sonner'
import { fontSans } from '@/lib/fonts'
import './globals.css'

// Brand logo (self-contained dark rounded square) — public/images/logo.svg.
// Used as favicon here; header/footer/login components reference it too.
export const metadata: Metadata = {
  title: 'JR Realty | Venta y Alquiler de Propiedades',
  description:
    'Tu mejor aliado en el mercado inmobiliario. Venta y alquiler de propiedades en Venezuela.',
  icons: {
    icon: '/images/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${fontSans} antialiased`}>
        <NextTopLoader color="oklch(0.62 0.13 75)" showSpinner={false} height={3} shadow={false} />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
