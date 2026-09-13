/**
 * Layout for the (auth) route group — a minimal, centered shell with no
 * public header/footer. Used by /login (and future auth pages).
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Subtle gold radial accent, consistent with the public landing hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_50%_-5%,rgba(198,146,60,0.16),transparent_70%)]"
      />
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
