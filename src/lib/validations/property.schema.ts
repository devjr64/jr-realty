import { z } from 'zod'

/**
 * Property form validation schema (zod v4).
 *
 * Following the project convention from `auth.schema.ts`:
 * - Top-level format schemas are preferred (`z.url()`, not the deprecated
 *   `z.string().url()`) — same for enums, plain string messages work.
 *
 * ENUM VALUES: the arrays below mirror `prisma/schema.prisma` exactly.
 * They are defined locally (not imported from `@prisma/client`) so this
 * module stays importable from client components without pulling in the
 * Prisma runtime.
 */

// === Enums (mirror prisma/schema.prisma) ===

export const propertyTypeValues = [
  'APARTMENT',
  'HOUSE',
  'PENTHOUSE',
  'OFFICE',
  'COMMERCIAL',
  'WAREHOUSE',
  'LAND',
  'FARM',
  'BUILDING',
  'CONSULTING_ROOM',
  'TOWNHOUSE',
  'BEACH_HOUSE',
  'PARKING',
] as const

export const operationValues = ['SALE', 'RENT', 'BOTH'] as const

export const currencyValues = ['USD', 'VES'] as const

export const statusValues = ['AVAILABLE', 'SOLD', 'RENTED', 'RESERVED', 'INACTIVE'] as const

export const tagValues = [
  'FURNISHED',
  'REPOSSESSED',
  'OPPORTUNITY',
  'NEW_CONSTRUCTION',
  'PREMIUM',
  'PET_FRIENDLY',
] as const

// === Helpers ===

/**
 * Converts an empty string (untouched optional form input) into null.
 *
 * This must run BEFORE `z.coerce.number()`: coercion alone would turn ''
 * into 0 (`Number('') === 0`), so optional fields left blank would silently
 * become 0 instead of null.
 */
const emptyToNull = (value: unknown): unknown => (value === '' ? null : value)

/**
 * Optional numeric form field: accepts a number or a numeric string
 * (coerced), but keeps blank / null / missing input as null / undefined so
 * Prisma nullable columns stay clean.
 */
const optionalNumber = (check: z.ZodType<number>) =>
  z.preprocess(emptyToNull, check.optional().nullable())

/** Optional URL field: blank input becomes null; non-URL values fail. */
const optionalUrl = z.preprocess(
  emptyToNull,
  z.url('Ingresa una URL válida').nullable().optional(),
)

// === Schema ===

export const propertySchema = z.object({
  title: z
    .string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(200, 'El título no puede superar los 200 caracteres'),
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(10000, 'La descripción no puede superar los 10.000 caracteres'),
  type: z.enum(propertyTypeValues, 'Selecciona un tipo de propiedad válido'),
  operation: z.enum(operationValues, 'Selecciona una operación válida'),
  price: z.coerce
    .number()
    .positive('El precio debe ser mayor que cero')
    .max(100_000_000, 'El precio no puede superar $100.000.000'),
  currency: z.enum(currencyValues, 'Selecciona una moneda válida').default('USD'),
  bedrooms: optionalNumber(z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativo').max(50, 'El valor máximo es 50')),
  bathrooms: optionalNumber(z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativo').max(50, 'El valor máximo es 50')),
  halfBathrooms: optionalNumber(z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativo').max(50, 'El valor máximo es 50')),
  parkingSpots: optionalNumber(z.coerce.number().int('Debe ser un número entero').min(0, 'No puede ser negativo').max(50, 'El valor máximo es 50')),
  landAreaM2: optionalNumber(z.coerce.number().positive('Debe ser mayor que cero').max(1_000_000, 'El área no puede superar 1.000.000 m²')),
  buildAreaM2: optionalNumber(z.coerce.number().positive('Debe ser mayor que cero').max(1_000_000, 'El área no puede superar 1.000.000 m²')),
  yearBuilt: optionalNumber(
    z.coerce
      .number()
      .int('Ingresa un año válido')
      .min(1800, 'El año debe ser 1800 o posterior')
      .max(new Date().getFullYear() + 1, 'El año no puede estar en el futuro'),
  ),
  address: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(300, 'La dirección no puede superar los 300 caracteres'),
  latitude: optionalNumber(z.coerce.number().min(-90, 'La latitud debe estar entre -90 y 90').max(90, 'La latitud debe estar entre -90 y 90')),
  longitude: optionalNumber(z.coerce.number().min(-180, 'La longitud debe estar entre -180 y 180').max(180, 'La longitud debe estar entre -180 y 180')),
  zoneId: z.string().min(1, 'Selecciona una zona'),
  features: z.array(z.string()).max(40, 'Máximo 40 características').default([]),
  tags: z
    .array(z.enum(tagValues, 'Selecciona etiquetas válidas'))
    .max(6, 'Máximo 6 etiquetas')
    .default([]),
  videoUrl: optionalUrl,
  virtualTourUrl: optionalUrl,
  status: z.enum(statusValues, 'Selecciona un estado válido').default('AVAILABLE'),
  featured: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z
          .string()
          .min(1, 'La URL de la imagen es requerida')
          .refine(
            (val) =>
              val.startsWith('/uploads/') ||
              val.startsWith('http://') ||
              val.startsWith('https://'),
            'Ingresa una URL de imagen válida',
          ),
        alt: z.string().optional(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .max(30, 'Máximo 30 imágenes')
    .default([]),
})

/**
 * Validated property form input.
 *
 * NOTE: `slug` is intentionally NOT part of the schema — it is auto-generated
 * from the title inside the server action (unique, url-safe) and never taken
 * from user input, so the form never submits it.
 */
export type PropertyInput = z.infer<typeof propertySchema>

// === Form options (Spanish labels) ===

/**
 * Curated feature list rendered as a checkbox grid in the property form.
 * Stored values are free-form strings (schema validates count only).
 */
export const propertyFeatureOptions = [
  'Piscina',
  'Gimnasio',
  'Seguridad 24/7',
  'Estacionamiento visitas',
  'Área infantil',
  'Salón de eventos',
  'Lobby',
  'Elevadores',
  'Vista al mar',
  'Amoblado',
  'Aire acondicionado',
  'Balcón',
  'Terraza',
  'Jardín',
  'Parrillera',
  'Rooftop',
  'Bodega',
  'Lavandería',
  'Sauna',
  'Spa',
  'Business center',
  'Pet friendly',
  'Energía solar',
  'Cisterna',
  'Internet fibra óptica',
] as const

export const propertyTypeLabels: Record<(typeof propertyTypeValues)[number], string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  PENTHOUSE: 'Penthouse (PH)',
  OFFICE: 'Oficina',
  COMMERCIAL: 'Local Comercial',
  WAREHOUSE: 'Bodega / Galera',
  LAND: 'Terreno',
  FARM: 'Finca',
  BUILDING: 'Edificio',
  CONSULTING_ROOM: 'Consultorio',
  TOWNHOUSE: 'Townhouse',
  BEACH_HOUSE: 'Casa de Playa',
  PARKING: 'Estacionamiento',
}

export const operationLabels: Record<(typeof operationValues)[number], string> = {
  SALE: 'Venta',
  RENT: 'Alquiler',
  BOTH: 'Ambos',
}

export const statusLabels: Record<(typeof statusValues)[number], string> = {
  AVAILABLE: 'Disponible',
  SOLD: 'Vendido',
  RENTED: 'Alquilado',
  RESERVED: 'Reservado',
  INACTIVE: 'Inactivo',
}

/** Bonus: Spanish labels for the tag checkbox grid (max 6 per schema). */
export const tagLabels: Record<(typeof tagValues)[number], string> = {
  FURNISHED: 'Amoblado',
  REPOSSESSED: 'Reposeído bancario',
  OPPORTUNITY: 'Oportunidad de inversión',
  NEW_CONSTRUCTION: 'Estreno / Nuevo',
  PREMIUM: 'Premium',
  PET_FRIENDLY: 'Pet friendly',
}
