/**
 * Auto-reply email template sent to the lead submitter.
 *
 * Props are passed in by the server action (which already has the lead data
 * and site settings) — this template does NOT import from `@/lib/db` to keep
 * the Edge bundle clean.
 */

import React from 'react'

interface LeadConfirmTemplateProps {
  name: string
  /** First ~200 characters of the lead's message. */
  messagePreview?: string
  /** JR Realty contact info for the footer. */
  phone?: string
  whatsapp?: string
}

/**
 * Renders the lead-confirmation email as a React element.
 * Resend's SDK will convert this to HTML via its internal renderer.
 */
export function LeadConfirmTemplate({
  name,
  messagePreview,
  phone = '+58 212-555-0140',
  whatsapp = phone,
}: LeadConfirmTemplateProps): React.ReactElement {
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
          ¡Gracias por contactarnos, {name}!
        </h1>
      </div>

      {/* Body */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ margin: '0 0 16px 0', fontSize: 16 }}>
          Recibimos tu mensaje y un asesor de <strong>JR Realty</strong> se
          pondrá en contacto contigo muy pronto.
        </p>

        {messagePreview ? (
          <div
            style={{
              background: '#f5f5f5',
              borderRadius: 8,
              padding: '12px 16px',
              borderLeft: '3px solid #b8860b',
              fontStyle: 'italic',
              color: '#555',
              fontSize: 14,
            }}
          >
            «{messagePreview}»
          </div>
        ) : null}

        <p style={{ margin: '24px 0 0 0', fontSize: 16 }}>
          Si tu consulta es urgente, también puedes escribirnos directamente:
        </p>
      </div>

      {/* Contact links */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <a
          href={`tel:${phone.replace(/\s/g, '')}`}
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            borderRadius: 8,
            background: '#b8860b',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          📞 {phone}
        </a>
        <a
          href={`https://wa.me/${whatsapp.replace(/\s/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            borderRadius: 8,
            background: '#25d366',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
           WhatsApp
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
        <p style={{ margin: 0 }}>JR Realty — Tu mejor aliado inmobiliario</p>
        <p style={{ margin: '8px 0 0 0' }}>Caracas, Venezuela</p>
      </div>
    </div>
  )
}
