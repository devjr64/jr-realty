/**
 * Admin notification email template — sent when a new public lead arrives.
 *
 * Props are passed in by the server action. This template does NOT import from
 * `@/lib/db` to keep the Edge bundle clean.
 */

import React from 'react'

interface LeadNotifyTemplateProps {
  /** Lead's display name. */
  name: string
  /** Lead's email address. */
  email: string
  /** Lead's phone (may be empty). */
  phone?: string
  /** Lead's message (may be empty). */
  message?: string
  /** If the lead came from a property detail page. */
  property?: {
    slug: string
    title: string
  }
  /** Base URL for the admin panel (e.g. https://jrrealty.com). */
  appUrl: string
}

/**
 * Renders the admin notification email as a React element.
 */
export function LeadNotifyTemplate({
  name,
  email,
  phone,
  message,
  property,
  appUrl = 'http://localhost:3000',
}: LeadNotifyTemplateProps): React.ReactElement {
  const adminLeadsUrl = `${appUrl}/admin/leads`

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        maxWidth: 600,
        margin: '0 auto',
        padding: 24,
        color: '#1a1a1a',
        lineHeight: 1.6,
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 12,
            background: '#2d2926',
            color: '#fff',
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          JR
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            margin: 0,
            color: '#2d2926',
          }}
        >
          Nuevo lead desde el sitio
        </h1>
      </div>

      {/* Lead details */}
      <div style={{ marginBottom: 24 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 15,
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: '8px 12px 8px 0',
                  fontWeight: 600,
                  color: '#666',
                  width: 90,
                  verticalAlign: 'top',
                }}
              >
                Nombre
              </td>
              <td style={{ padding: '8px 0' }}>{name}</td>
            </tr>
            <tr>
              <td
                style={{
                  padding: '8px 12px 8px 0',
                  fontWeight: 600,
                  color: '#666',
                  verticalAlign: 'top',
                }}
              >
                Correo
              </td>
              <td style={{ padding: '8px 0' }}>
                <a href={`mailto:${email}`} style={{ color: '#b8860b' }}>
                  {email}
                </a>
              </td>
            </tr>
            {phone ? (
              <tr>
                <td
                  style={{
                    padding: '8px 12px 8px 0',
                    fontWeight: 600,
                    color: '#666',
                    verticalAlign: 'top',
                  }}
                >
                  Teléfono
                </td>
                <td style={{ padding: '8px 0' }}>
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    style={{ color: '#b8860b' }}
                  >
                    {phone}
                  </a>
                </td>
              </tr>
            ) : null}
            {property ? (
              <tr>
                <td
                  style={{
                    padding: '8px 12px 8px 0',
                    fontWeight: 600,
                    color: '#666',
                    verticalAlign: 'top',
                  }}
                >
                  Propiedad
                </td>
                <td style={{ padding: '8px 0' }}>
                  <a
                    href={`${appUrl}/propiedades/${property.slug}`}
                    style={{ color: '#b8860b' }}
                  >
                    {property.title}
                  </a>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Message */}
      {message ? (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontWeight: 600,
              color: '#666',
              marginBottom: 8,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Mensaje
          </div>
          <div
            style={{
              background: '#f9f9f9',
              borderRadius: 8,
              padding: 16,
              fontSize: 15,
              borderLeft: '3px solid #b8860b',
            }}
          >
            {message}
          </div>
        </div>
      ) : null}

      {/* CTA */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <a
          href={adminLeadsUrl}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            borderRadius: 8,
            background: '#b8860b',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Ver en el panel de administración →
        </a>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          paddingTop: 24,
          borderTop: '1px solid #e5e5e5',
          fontSize: 12,
          color: '#999',
        }}
      >
        <p style={{ margin: 0 }}>
          Este correo fue enviado automáticamente por JR Realty.
        </p>
      </div>
    </div>
  )
}
