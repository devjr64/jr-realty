import Image from 'next/image'

/**
 * Brand lockup for the admin area — logo chip + "JR Realty" wordmark.
 *
 * logo.svg is a self-contained dark rounded square with a cream monogram,
 * so it stays legible on both the dark espresso sidebar and light surfaces.
 */
export function AdminBrand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background p-1">
        <Image
          src="/images/logo.svg"
          alt=""
          width={36}
          height={36}
          priority
          className="size-full object-contain"
        />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">
        JR Realty <span className="text-primary">Venezuela</span>
      </span>
    </div>
  )
}
