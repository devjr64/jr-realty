import {
  PrismaClient,
  Role,
  OperationType,
  PropertyStatus,
  PropertyType,
  Tag,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding JR Realty database...')

  // === MODO PRODUCCIÓN ===
  // Si SEED_DEMO_DATA=false se omite TODO el contenido demo (agentes, propiedades,
  // proyectos, testimonios, blog, página CMS), dejando solo el super admin,
  // zonas y configuración base del sitio. Útil para desplegar en producción
  // con datos reales que se cargarán manualmente después.
  const includeDemoData = process.env.SEED_DEMO_DATA !== 'false'
  if (!includeDemoData) {
    console.log('🔒 Modo producción: se omitirán datos demo (SEED_DEMO_DATA=false)')
  }

  // === SUPER ADMIN (idempotente) ===
  // En producción SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD son obligatorios.
  // En desarrollo, si no se definen, se genera una contraseña aleatoria única
  // que se imprime UNA VEZ en consola (nunca un valor conocido por defecto).
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ??
    (process.env.NODE_ENV === 'production' ? null : randomBytes(16).toString('base64url'))

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD son obligatorios para ejecutar el seed en producción.'
    )
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.create({
      data: {
        name: 'JR Realty Admin',
        email: adminEmail,
        passwordHash,
        role: Role.SUPER_ADMIN,
        phone: '+58 212-555-0140',
      },
    })
    console.log(`✅ Super Admin creado: ${adminEmail}`)
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`🔑 Contraseña generada (guárdala, no se mostrará de nuevo): ${adminPassword}`)
    }
  } else {
    console.log(`ℹ️  Super Admin ya existe: ${adminEmail}`)
  }

  // === ZONAS (idempotente) ===
  const zonas = [
    { name: 'Las Mercedes', slug: 'las-mercedes' },
    { name: 'El Rosal', slug: 'el-rosal' },
    { name: 'Los Palos Grandes', slug: 'los-palos-grandes' },
    { name: 'La Castellana', slug: 'la-castellana' },
    { name: 'Sebucán', slug: 'sebucan' },
    { name: 'Chuao', slug: 'chuao' },
    { name: 'Valle Arriba', slug: 'valle-arriba' },
    { name: 'Santa Eduvigis', slug: 'santa-eduvigis' },
    { name: 'Prados del Este', slug: 'prados-del-este' },
    { name: 'El Hatillo', slug: 'el-hatillo' },
    { name: 'Valencia', slug: 'valencia' },
    { name: 'Margarita', slug: 'margarita' },
  ]

  for (const zona of zonas) {
    await prisma.zone.upsert({
      where: { slug: zona.slug },
      update: {},
      create: zona,
    })
  }
  console.log(`✅ ${zonas.length} zonas creadas/verificadas`)

  // === CONFIGURACIÓN DEL SITIO (idempotente) ===
  const settings = [
    {
      key: 'general',
      value: {
        siteName: 'JR Realty',
        tagline: 'Tu mejor aliado en el mercado inmobiliario',
        phone: '+58 212-555-0140',
        whatsapp: '+58 212-555-0140',
        email: 'admin@jrrealty.com',
        address: 'Caracas, Venezuela',
        currency: 'USD',
      },
    },
    {
      key: 'social',
      value: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        youtube: '',
      },
    },
    {
      key: 'seo',
      value: {
        title: 'JR Realty | Venta y Alquiler de Propiedades',
        description:
          'Agencia inmobiliaria en Caracas. Venta, alquiler y administración de apartamentos, casas, oficinas y locales comerciales.',
      },
    },
  ]

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log(`✅ ${settings.length} settings creados/verificados`)

  if (includeDemoData) {
    // === AGENTES DEMO (idempotente) ===
    // En producción SEED_AGENT_PASSWORD es obligatorio (igual que el admin):
    // nunca se crean agentes con una contraseña conocida por defecto.
    const agentPassword = process.env.SEED_AGENT_PASSWORD
    if (!agentPassword) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SEED_AGENT_PASSWORD es obligatorio para ejecutar el seed en producción.')
      }
      console.warn(
        '⚠️  SEED_AGENT_PASSWORD no definido: se usará la contraseña demo "Agente123!" (solo desarrollo).'
      )
    }
    const resolvedAgentPassword = agentPassword ?? 'Agente123!'

    const agentData = [
      {
        email: 'andreina.salas@jrrealty.test',
        name: 'Andreína Salas',
        title: 'Asesora Inmobiliaria Senior',
        phone: '+58 212-555-0101',
        whatsapp: '+58 212-555-0101',
      },
      {
        email: 'ricardo.pena@jrrealty.test',
        name: 'Ricardo Peña',
        title: 'Asesor de Inversiones',
        phone: '+58 212-555-0102',
        whatsapp: '+58 212-555-0102',
      },
      {
        email: 'genesis.uzcategui@jrrealty.test',
        name: 'Génesis Uzcátegui',
        title: 'Asesora de Alquileres',
        phone: '+58 212-555-0103',
        whatsapp: '+58 212-555-0103',
      },
    ]

    const agents: { id: string }[] = []
    for (const data of agentData) {
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(resolvedAgentPassword, 12)
        const user = await prisma.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: Role.AGENT,
            phone: data.phone,
            agent: {
              create: {
                title: data.title,
                phone: data.phone,
                whatsapp: data.whatsapp,
                active: true,
              },
            },
          },
          include: { agent: true },
        })
        agents.push({ id: user.agent!.id })
        console.log(`✅ Agente creado: ${data.email}`)
      } else {
        const agent = await prisma.agent.findUnique({ where: { userId: existingUser.id } })
        if (agent) agents.push({ id: agent.id })
      }
    }
    console.log(`ℹ️  ${agents.length} agentes verificados`)

    // === PROPIEDADES DEMO (idempotente por slug) ===
    const zoneBySlug = new Map<string, string>()
    for (const zona of zonas) {
      const row = await prisma.zone.findUnique({ where: { slug: zona.slug } })
      if (row) zoneBySlug.set(zona.slug, row.id)
    }

    const properties = [
      {
        slug: 'venta-apartamento-torre-altavista-las-mercedes',
        title: 'Venta de apartamento en Torre Altavista, Las Mercedes',
        description:
          'Espectacular apartamento de 3 recámaras y 3 baños en el exclusivo Torre Altavista, Las Mercedes. Cuenta con amplia sala-comedor, cocina abierta con isla, terraza con vista despejada y 2 estacionamientos. Amenidades del edificio: piscina, gimnasio, seguridad 24/7 y área infantil.',
        type: PropertyType.APARTMENT,
        operation: OperationType.SALE,
        price: 480000,
        bedrooms: 3,
        bathrooms: 3,
        halfBathrooms: 0,
        parkingSpots: 2,
        landAreaM2: null,
        buildAreaM2: 210,
        yearBuilt: 2021,
        address: 'Av. Principal de Las Mercedes, Caracas',
        latitude: 10.4864,
        longitude: -66.8653,
        zoneSlug: 'las-mercedes',
        features: [
          'Piscina',
          'Gimnasio',
          'Seguridad 24/7',
          'Área infantil',
          'Salón de eventos',
          'Lobby',
          'Elevadores',
        ],
        tags: [Tag.PREMIUM, Tag.NEW_CONSTRUCTION],
        status: PropertyStatus.AVAILABLE,
        featured: true,
        agentIndex: 0,
        images: 3,
      },
      {
        slug: 'alquiler-apartamento-edificio-miranda-los-palos-grandes',
        title: 'Alquiler de apartamento amoblado en Los Palos Grandes',
        description:
          'Moderno apartamento de 2 recámaras y 2 baños en el Edificio Miranda, Los Palos Grandes. Totalmente amoblado con muebles de diseño, aire acondicionado en todas las habitaciones y espectacular vista al Ávila. Incluye 1 estacionamiento y acceso a las amenidades del edificio.',
        type: PropertyType.APARTMENT,
        operation: OperationType.RENT,
        price: 1500,
        bedrooms: 2,
        bathrooms: 2,
        halfBathrooms: 0,
        parkingSpots: 1,
        landAreaM2: null,
        buildAreaM2: 85,
        yearBuilt: 2020,
        address: 'Av. Andrés Bello, Los Palos Grandes, Caracas',
        latitude: 10.5043,
        longitude: -66.8434,
        zoneSlug: 'los-palos-grandes',
        features: [
          'Piscina',
          'Gimnasio',
          'Seguridad 24/7',
          'Amoblado',
          'Aire acondicionado',
          'Balcón',
          'Vista al Ávila',
        ],
        tags: [Tag.FURNISHED, Tag.PET_FRIENDLY],
        status: PropertyStatus.AVAILABLE,
        featured: true,
        agentIndex: 2,
        images: 2,
      },
      {
        slug: 'venta-apartamento-torre-araguaney-el-rosal',
        title: 'Venta de apartamento en Torre Araguaney, El Rosal',
        description:
          'Impresionante apartamento de 3 recámaras y 4 baños en Torre Araguaney, El Rosal. Vista panorámica a la ciudad, acabados de lujo y 2 estacionamientos. Amenidades: piscina infinita, spa, business center y conserjería.',
        type: PropertyType.APARTMENT,
        operation: OperationType.SALE,
        price: 635000,
        bedrooms: 3,
        bathrooms: 4,
        halfBathrooms: 0,
        parkingSpots: 2,
        landAreaM2: null,
        buildAreaM2: 334,
        yearBuilt: 2019,
        address: 'El Rosal, Chacao, Caracas',
        latitude: 10.4902,
        longitude: -66.8636,
        zoneSlug: 'el-rosal',
        features: [
          'Piscina',
          'Gimnasio',
          'Spa',
          'Seguridad 24/7',
          'Business center',
          'Vista a la ciudad',
          'Elevadores',
        ],
        tags: [Tag.PREMIUM],
        status: PropertyStatus.AVAILABLE,
        featured: true,
        agentIndex: 1,
        images: 3,
      },
      {
        slug: 'venta-casa-la-lagunita-el-hatillo-piscina',
        title: 'Venta de casa unifamiliar en La Lagunita, El Hatillo con piscina',
        description:
          'Hermosa casa unifamiliar de 5 recámaras y 5 baños en La Lagunita, El Hatillo. Cuenta con piscina, jardín amplio, terraza con parrillera y 3 estacionamientos. Ideal para familias que buscan espacio y tranquilidad.',
        type: PropertyType.HOUSE,
        operation: OperationType.SALE,
        price: 650000,
        bedrooms: 5,
        bathrooms: 5,
        halfBathrooms: 1,
        parkingSpots: 3,
        landAreaM2: 450,
        buildAreaM2: 325,
        yearBuilt: 2018,
        address: 'La Lagunita, El Hatillo, Caracas',
        latitude: 10.4237,
        longitude: -66.8253,
        zoneSlug: 'el-hatillo',
        features: [
          'Piscina',
          'Jardín',
          'Terraza',
          'Parrillera',
          'Seguridad 24/7',
          'Aire acondicionado',
        ],
        tags: [Tag.PREMIUM, Tag.PET_FRIENDLY],
        status: PropertyStatus.AVAILABLE,
        featured: true,
        agentIndex: 0,
        images: 2,
      },
      {
        slug: 'alquiler-oficina-chuao',
        title: 'Alquiler de oficina en Chuao',
        description:
          'Oficina de 68 m² en excelente ubicación en Chuao, ideal para empresas. Espacio abierto, 2 oficinas privadas, recepción y baño. Estacionamiento para visitas. Disponible de inmediato.',
        type: PropertyType.OFFICE,
        operation: OperationType.RENT,
        price: 1200,
        bedrooms: 0,
        bathrooms: 2,
        halfBathrooms: 0,
        parkingSpots: 2,
        landAreaM2: null,
        buildAreaM2: 68,
        yearBuilt: 2015,
        address: 'Av. Luis Roche, Chuao, Caracas',
        latitude: 10.485,
        longitude: -66.8601,
        zoneSlug: 'chuao',
        features: [
          'Aire acondicionado',
          'Elevadores',
          'Seguridad 24/7',
          'Estacionamiento visitas',
          'Internet fibra óptica',
        ],
        tags: [],
        status: PropertyStatus.AVAILABLE,
        featured: false,
        agentIndex: 2,
        images: 2,
      },
      {
        slug: 'local-comercial-sebucan',
        title: 'Local comercial en alquiler, Sebucán',
        description:
          'Local comercial de 45 m² en primera planta con vitrina sobre la Av. Principal de Sebucán. Alto tránsito peatonal y vehicular. Ideal para restaurante, tienda o consultorio. Incluye 1 estacionamiento.',
        type: PropertyType.COMMERCIAL,
        operation: OperationType.RENT,
        price: 1800,
        bedrooms: 0,
        bathrooms: 1,
        halfBathrooms: 0,
        parkingSpots: 1,
        landAreaM2: null,
        buildAreaM2: 45,
        yearBuilt: 2012,
        address: 'Av. Principal de Sebucán, Caracas',
        latitude: 10.504,
        longitude: -66.8361,
        zoneSlug: 'sebucan',
        features: ['Aire acondicionado', 'Seguridad 24/7', 'Elevadores', 'Estacionamiento visitas'],
        tags: [Tag.OPPORTUNITY],
        status: PropertyStatus.AVAILABLE,
        featured: false,
        agentIndex: 1,
        images: 2,
      },
      {
        slug: 'apartamento-inversion-santa-eduvigis',
        title: 'Apartamento de inversión en Santa Eduvigis',
        description:
          'Oportunidad de inversión: apartamento de 3 recámaras y 2.5 baños en Santa Eduvigis, a pocos minutos del Parque del Este. Zona consolidada, con excelente plusvalía y fácil acceso al centro de la ciudad. Precio de oportunidad, ideal para inversionistas.',
        type: PropertyType.APARTMENT,
        operation: OperationType.SALE,
        price: 280000,
        bedrooms: 3,
        bathrooms: 2,
        halfBathrooms: 1,
        parkingSpots: 2,
        landAreaM2: null,
        buildAreaM2: 141,
        yearBuilt: 2017,
        address: 'Santa Eduvigis, Caracas',
        latitude: 10.5003,
        longitude: -66.8385,
        zoneSlug: 'santa-eduvigis',
        features: ['Piscina', 'Gimnasio', 'Seguridad 24/7', 'Parque', 'Área infantil'],
        tags: [Tag.REPOSSESSED, Tag.OPPORTUNITY],
        status: PropertyStatus.AVAILABLE,
        featured: false,
        agentIndex: 1,
        images: 2,
      },
      {
        slug: 'villa-playa-el-yaque-margarita',
        title: 'Villa amoblada frente al mar en Playa El Yaque, Margarita',
        description:
          'Espectacular villa de playa amoblada en Playa El Yaque, Margarita. 4 recámaras, piscina privada y acceso directo a la playa. Ideal para vacaciones o renta vacacional. Incluye todo el equipamiento.',
        type: PropertyType.BEACH_HOUSE,
        operation: OperationType.SALE,
        price: 1390000,
        bedrooms: 4,
        bathrooms: 4,
        halfBathrooms: 1,
        parkingSpots: 2,
        landAreaM2: 600,
        buildAreaM2: 480,
        yearBuilt: 2020,
        address: 'Playa El Yaque, Margarita, Nueva Esparta',
        latitude: 10.897,
        longitude: -63.9646,
        zoneSlug: 'margarita',
        features: [
          'Piscina',
          'Gimnasio',
          'Seguridad 24/7',
          'Amoblado',
          'Jardín',
          'Parrillera',
          'Vista al mar',
        ],
        tags: [Tag.PREMIUM, Tag.FURNISHED],
        status: PropertyStatus.AVAILABLE,
        featured: false,
        agentIndex: 0,
        images: 3,
      },
    ]

    const propertyCount = { created: 0 }
    for (const p of properties) {
      const zoneId = zoneBySlug.get(p.zoneSlug)
      const agent = agents[p.agentIndex]
      if (!zoneId || !agent) continue

      const existing = await prisma.property.findUnique({ where: { slug: p.slug } })
      if (existing) continue

      const images = Array.from({ length: p.images }, (_, i) => ({
        url: `https://picsum.photos/seed/${p.slug}-${i + 1}/800/600`,
        alt: `${p.title} - imagen ${i + 1}`,
        sortOrder: i,
      }))

      await prisma.property.create({
        data: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          type: p.type,
          operation: p.operation,
          price: p.price,
          currency: 'USD',
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          halfBathrooms: p.halfBathrooms,
          parkingSpots: p.parkingSpots,
          landAreaM2: p.landAreaM2,
          buildAreaM2: p.buildAreaM2,
          yearBuilt: p.yearBuilt,
          address: p.address,
          zoneId,
          agentId: agent.id,
          features: p.features,
          status: p.status,
          featured: p.featured,
          images: { createMany: { data: images } },
          tags: { createMany: { data: p.tags.map((tag) => ({ tag })) } },
        },
      })
      propertyCount.created += 1
    }
    console.log(`✅ ${propertyCount.created} propiedades demo creadas`)

    // === PROYECTOS DEMO ===
    const projects = [
      {
        slug: 'torre-miranda-las-mercedes',
        name: 'Torre Miranda',
        description:
          'Torre residencial de lujo en Las Mercedes con acabados de primera, rooftop con piscina y vista panorámica a la ciudad. Unidades desde 2 a 4 recámaras con estacionamientos dobles.',
        developer: 'Grupo Miranda',
        zoneSlug: 'las-mercedes',
        deliveryYear: 2028,
        priceMin: 334000,
        priceMax: 850000,
        coverImage: 'https://picsum.photos/seed/torre-miranda/800/450',
      },
      {
        slug: 'los-jardines-la-castellana',
        name: 'Los Jardines',
        description:
          'Desarrollo residencial contemporáneo en La Castellana. Espacios amplios, doble altura y amenidades exclusivas en una de las zonas más cotizadas de la ciudad.',
        developer: 'Grupo Ávila',
        zoneSlug: 'la-castellana',
        deliveryYear: 2027,
        priceMin: 465000,
        priceMax: 1200000,
        coverImage: 'https://picsum.photos/seed/los-jardines/800/450',
      },
      {
        slug: 'aqua-chuao',
        name: 'Aqua Chuao',
        description:
          'Vida de lujo en Chuao. Torres gemelas con amenidades estilo resort, piscina infinita y amplias áreas sociales rodeadas de naturaleza.',
        developer: 'Desarrollos Aqua',
        zoneSlug: 'chuao',
        deliveryYear: 2028,
        priceMin: 313000,
        priceMax: 900000,
        coverImage: 'https://picsum.photos/seed/aqua-chuao/800/450',
      },
    ]

    let projectCount = 0
    for (const project of projects) {
      const zoneId = zoneBySlug.get(project.zoneSlug)
      if (!zoneId) continue
      const existing = await prisma.project.findUnique({ where: { slug: project.slug } })
      if (existing) continue
      await prisma.project.create({
        data: {
          slug: project.slug,
          name: project.name,
          description: project.description,
          developer: project.developer,
          zoneId,
          deliveryDate: new Date(project.deliveryYear, 11, 31),
          priceRangeMin: project.priceMin,
          priceRangeMax: project.priceMax,
          coverImage: project.coverImage,
          status: 'ACTIVE',
        },
      })
      projectCount += 1
    }
    console.log(`✅ ${projectCount} proyectos demo creados`)

    // === TESTIMONIOS DEMO ===
    const testimonials = [
      {
        name: 'Carlos y Milagros Rojas',
        role: 'Propietarios',
        content:
          'Lo que más nos satisface es la orientación del equipo al servicio. Recibimos respuestas rápidas, profesionales y adecuadas. Los recomendamos ampliamente.',
        rating: 5,
      },
      {
        name: 'María Fernanda Blanco',
        role: 'Compradora',
        content:
          'Excelente servicio, muy buena disposición y se esfuerzan por entender las necesidades de los clientes para encontrarles lo que buscan.',
        rating: 5,
      },
      {
        name: 'Roberto Santander',
        role: 'Inversionista',
        content:
          'Muy serios, con un alto nivel de compromiso, empatía y profesionalismo. Poco usual en el rubro. Súper recomendados.',
        rating: 5,
      },
    ]

    for (const testimonial of testimonials) {
      await prisma.testimonial.upsert({
        where: { id: `seed-${testimonial.name}` },
        update: {},
        create: {
          id: `seed-${testimonial.name}`,
          name: testimonial.name,
          role: testimonial.role,
          content: testimonial.content,
          rating: testimonial.rating,
          active: true,
        },
      })
    }
    console.log(`✅ ${testimonials.length} testimonios creados/verificados`)

    // === BLOG DEMO ===
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })
    const posts = [
      {
        slug: 'guia-comprar-apartamento-venezuela',
        title: 'Guía para comprar tu primer apartamento en Venezuela',
        excerpt:
          'Todo lo que necesitas saber antes de comprar un apartamento en Caracas: zonas, precios, financiamiento y trámites.',
        content:
          'Comprar un apartamento en Venezuela es una de las mejores decisiones de inversión en la región.\n\n## Zonas recomendadas\n\nLas Mercedes, El Rosal, Los Palos Grandes y La Castellana son las zonas más cotizadas.\n\n## Precios promedio\n\nUn apartamento de 2 recámaras en una buena zona oscila entre $200,000 y $400,000.\n\n## Financiamiento\n\nLos bancos venezolanos ofrecen préstamos hipotecarios de hasta el 90% del valor de la propiedad.\n\n¿Listo para dar el paso? Contáctanos y te asesoramos gratis.',
        coverImage: 'https://picsum.photos/seed/blog-guia/800/450',
      },
      {
        slug: 'invertir-en-bienes-raices-venezuela',
        title: 'Por qué invertir en bienes raíces en Venezuela',
        excerpt:
          'Venezuela se consolida como uno de los destinos de inversión inmobiliaria más atractivos de la región. Descubre por qué.',
        content:
          'Venezuela ofrece una combinación única de oportunidades de inversión, dolarización de facto y demanda creciente de espacios de calidad.\n\n## Ventajas\n\n- Economía dolarizada\n- Alto flujo de inversión extranjera\n- Plusvalía sostenida en zonas prime\n- Atractivo turístico creciente\n\n## Oportunidades\n\nLos remates bancarios y los proyectos en pre-construcción ofrecen las mejores tasas de retorno.',
        coverImage: 'https://picsum.photos/seed/blog-invertir/800/450',
      },
    ]

    let postCount = 0
    if (adminUser) {
      for (const post of posts) {
        const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } })
        if (existing) continue
        await prisma.blogPost.create({
          data: {
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            coverImage: post.coverImage,
            authorId: adminUser.id,
            published: true,
            publishedAt: new Date(),
          },
        })
        postCount += 1
      }
    }
    console.log(`✅ ${postCount} posts de blog demo creados`)

    // === PÁGINA CMS DEMO (Nosotros) ===
    const existingPage = await prisma.page.findUnique({ where: { slug: 'nosotros' } })
    if (!existingPage) {
      await prisma.page.create({
        data: {
          slug: 'nosotros',
          title: 'Sobre nosotros',
          content: [
            {
              type: 'hero',
              title: 'JR Realty',
              subtitle: 'Tu mejor aliado en el mercado inmobiliario',
              ctaText: 'Ver propiedades',
              ctaHref: '/propiedades',
            },
            {
              type: 'text',
              title: 'Quiénes somos',
              body: 'JR Realty nace de la necesidad de ayudar a las personas a conseguir un hogar que se adapte a sus necesidades, y de guiar a los inversionistas a realizar el mejor posicionamiento de su dinero.\n\nSomos un grupo de corredores de bienes raíces con más de 10 años de experiencia en ventas en Caracas, manejo de propiedades para renta vacacional y administración de propiedades.',
            },
            {
              type: 'features',
              title: 'Nuestros servicios',
              items: [
                {
                  title: 'Administración',
                  description:
                    'Gestionamos el cobro, servicios, mantenimiento y atención al inquilino.',
                },
                {
                  title: 'Venta y compra',
                  description: 'Asesoría para promocionar tu propiedad al precio real del mercado.',
                },
                {
                  title: 'Alquiler',
                  description: 'Buscamos el inquilino ideal con toda la documentación y contratos.',
                },
              ],
            },
            {
              type: 'cta',
              title: '¿Listo para dar el siguiente paso?',
              description: 'Contáctanos y un asesor te acompañará en todo el proceso.',
              buttonText: 'Contáctanos',
              buttonHref: '/contacto',
            },
          ],
          metaTitle: 'Sobre JR Realty | JR Realty',
          metaDescription: 'Conoce a JR Realty, tu aliado en el mercado inmobiliario de Venezuela.',
          published: true,
        },
      })
      console.log(`✅ Página CMS "nosotros" creada`)
    }
  }

  console.log('🌱 Seed completado exitosamente.')
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
