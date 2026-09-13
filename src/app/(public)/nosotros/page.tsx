import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nosotros | JR Realty',
  description:
    'Conoce a JR Realty, tu aliado en el mercado inmobiliario de Caracas.',
}

export default function NosotrosPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Sobre JR Realty
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Tu mejor aliado en el mercado inmobiliario.
        </p>
      </div>

      <div className="space-y-8 leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-foreground">
            Quiénes somos
          </h2>
          <p>
            JR Realty nace de la necesidad de ayudar a las personas a conseguir un
            hogar que se adapte a sus necesidades, y de guiar a los inversionistas a
            realizar el mejor posicionamiento de su dinero, en el lugar más
            estratégico y con las condiciones más favorables.
          </p>
          <p className="mt-3">
            Somos un grupo de corredores de bienes raíces con amplia experiencia en
            el mercado inmobiliario de Caracas. Contamos con más de 6 años
            de experiencia en ventas, manejo de propiedades para Airbnb,
            administración de propiedades y asesoramiento en el alquiler, compra y
            venta de bienes inmuebles.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-foreground">
            Nuestros servicios
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground">Administración</h3>
              <p className="mt-2 text-sm">
                Gestionamos el cobro, el pago de servicios, el mantenimiento y la
                atención al inquilino en tiempo real.
              </p>
            </div>
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground">Venta y compra</h3>
              <p className="mt-2 text-sm">
                Te ayudamos a comprar la propiedad que buscas o a vender la tuya al
                precio real del mercado, de forma rápida y segura.
              </p>
            </div>
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground">Alquiler</h3>
              <p className="mt-2 text-sm">
                Buscamos el inquilino ideal con toda la documentación, inventario y
                contratos, o te asesoramos para elegir con tranquilidad.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-foreground">
            Nuestros aliados
          </h2>
          <p>
            Nuestros aliados comerciales nos ayudan a ofrecerte una amplia variedad
            de oportunidades. Además, tus propiedades se publican en los principales
            portales inmobiliarios del país para maximizar su visibilidad.
          </p>
        </section>
      </div>
    </div>
  )
}
