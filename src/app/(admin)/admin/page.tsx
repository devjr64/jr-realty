import { redirect } from 'next/navigation'

/**
 * /admin — index of the admin area. The real home is /admin/dashboard; this
 * route exists so a bare /admin visit lands somewhere sensible.
 */
export default function AdminIndexPage() {
  redirect('/admin/dashboard')
}
