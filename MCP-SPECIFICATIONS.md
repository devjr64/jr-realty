# JR Realty - MCP Server Specifications

## Overview

Model Context Protocol (MCP) server for JR Realty real estate platform. Enables AI agents (opencode, Claude Desktop) to manage properties, users, and agents through natural language interactions.

**Version**: 1.0.0  
**Status**: Draft  
**Last Updated**: 2026-01-09

---

## 1. Goals & Non-Goals

### Goals

- ✅ Enable AI agents to create, read, update, and delete properties, users, and agents
- ✅ Parse property data from Word documents and plain text
- ✅ Support both local development and production environments
- ✅ Maintain same validation rules as admin panel
- ✅ Provide both machine-readable (JSON) and human-readable responses
- ✅ Support multiple AI agents (opencode, Claude Desktop)

### Non-Goals (Future Implementation)

- ❌ Image upload/management (manual via admin panel)
- ❌ Other entities (blog, CMS, zones, projects, leads, testimonials)
- ❌ Advanced features (notifications, reports, backups, external API integrations)
- ❌ Client-facing features (no public API)

---

## 2. Architecture

### 2.1 Location & Structure

```
jr-realty/
├── src/
│   └── app/
│       └── api/
│           └── mcp/
│               ├── route.ts              # HTTP+SSE endpoint
│               ├── properties/
│               │   └── route.ts          # Property CRUD
│               ├── users/
│               │   └── route.ts          # User CRUD
│               ├── agents/
│               │   └── route.ts          # Agent CRUD
│               └── lib/
│                   ├── auth.ts           # API key validation
│                   ├── transport.ts      # stdio + HTTP+SSE handlers
│                   └── formatters.ts     # Response formatting
├── mcp-server/
│   ├── index.ts                          # stdio server entry point
│   ├── tools/
│   │   ├── properties.ts                 # Property tools
│   │   ├── users.ts                      # User tools
│   │   └── agents.ts                     # Agent tools
│   └── package.json                      # Separate deps for stdio server
└── docs/
    └── mcp/
        ├── setup.md                      # Setup guide
        └── api-reference.md              # Tool reference
```

### 2.2 Technology Stack

- **Runtime**: Node.js 24+ (same as main app)
- **Framework**: Next.js 15 API Routes (HTTP+SSE)
- **MCP SDK**: `@modelcontextprotocol/sdk` (official TypeScript SDK)
- **Database**: Prisma 6 (reuse existing client)
- **Validation**: Zod 4 (reuse existing schemas)
- **Transport**: stdio (primary) + HTTP+SSE (secondary)
- **Authentication**: API Key (header-based)

### 2.3 Deployment Modes

#### Mode 1: stdio (Local Development)

```
┌─────────────────┐
│  AI Agent       │
│  (opencode/     │
│   Claude)       │
└────────┬────────┘
         │ stdio (JSON-RPC)
         ▼
┌─────────────────┐
│  MCP Server     │
│  (mcp-server/)  │
│  Node process   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  Next.js App    │
│  (API Routes)   │
└────────┬────────┘
         │ Prisma
         ▼
┌─────────────────┐
│  PostgreSQL     │
└─────────────────┘
```

#### Mode 2: HTTP+SSE (Remote/Production)

```
┌─────────────────┐
│  AI Agent       │
│  (Remote)       │
└────────┬────────┘
         │ HTTP+SSE
         ▼
┌─────────────────┐
│  Next.js App    │
│  /api/mcp       │
└────────┬────────┘
         │ Prisma
         ▼
┌─────────────────┐
│  PostgreSQL     │
└─────────────────┘
```

---

## 3. Authentication & Authorization

### 3.1 API Key Authentication

**Header**: `X-API-Key: mcp_<environment>_<random_string>`

**Example**:

```bash
curl -H "X-API-Key: mcp_dev_abc123xyz" \
     http://localhost:3000/api/mcp/properties
```

### 3.2 API Key Management

**Storage**: Database table `mcp_api_keys`

```prisma
model McpApiKey {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String   // "Development Key", "Production Key"
  environment String   // "development", "production"
  userId      String   // Owner (SUPER_ADMIN only)
  active      Boolean  @default(true)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  expiresAt   DateTime?

  user        User     @relation(fields: [userId], references: [id])
}
```

**Key Generation**:

```typescript
// Format: mcp_<env>_<32_random_chars>
// Example: mcp_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
// Random part: node:crypto randomBytes (CSPRNG, 128 bits of entropy) —
// never Math.random() (predictable).
```

**Storage (hashed at rest)**: only the SHA-256 hex digest of the key is
persisted in `McpApiKey.key`. The raw key is printed exactly once by
`scripts/generate-mcp-key.ts` and cannot be recovered afterwards.
Validation hashes the presented `X-API-Key` header and looks up the digest,
so a database leak never exposes usable keys.

**Validation Middleware**:

```typescript
// src/app/api/mcp/lib/auth.ts
export async function validateMcpApiKey(request: Request) {
  const apiKey = request.headers.get('X-API-Key')
  if (!apiKey) throw new AuthenticationError('Missing API key')

  const key = await db.mcpApiKey.findUnique({
    where: { key: hashMcpApiKey(apiKey) }, // SHA-256 lookup — raw key never stored
    include: { user: true },
  })

  if (!key) throw new AuthenticationError('Invalid API key')
  if (key.expiresAt && key.expiresAt < new Date()) {
    throw new AuthenticationError('API key expired')
  }
  if (key.user.role !== 'SUPER_ADMIN') {
    throw new AuthorizationError('Only SUPER_ADMIN can use MCP')
  }

  // Update last used
  await db.mcpApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  })

  return key.user
}
```

### 3.3 Authorization Rules

- ✅ Only `SUPER_ADMIN` role can use MCP
- ❌ `AGENT` role cannot use MCP (even for own properties)
- ❌ `CLIENT` role cannot use MCP
- ✅ API key must be active and not expired
- ✅ All operations logged for audit trail

---

## 4. MCP Tools (Capabilities)

### 4.1 Property Tools

#### `create_property`

Create a new property listing.

**Input Schema**:

```typescript
{
  title: string
  slug?: string // Auto-generated if not provided
  description: string
  type: PropertyType // APARTMENT, HOUSE, PENTHOUSE, etc.
  operation: OperationType // SALE, RENT, BOTH
  price: number
  currency: Currency // USD, VES
  bedrooms?: number
  bathrooms?: number
  halfBathrooms?: number
  parkingSpots?: number
  landAreaM2?: number
  buildAreaM2?: number
  yearBuilt?: number
  address: string
  latitude?: number
  longitude?: number
  features?: string[] // ["pool", "gym", "security"]
  videoUrl?: string
  virtualTourUrl?: string
  status?: PropertyStatus // Default: AVAILABLE
  featured?: boolean // Default: false
  zoneId: string
  agentId: string
  tags?: Tag[] // FURNISHED, OPPORTUNITY, etc.
}
```

**Validations**:

- ✅ `zoneId` must exist in database
- ✅ `agentId` must exist in database
- ✅ `slug` auto-generated from title if not provided (unique)
- ✅ `price` must be positive
- ✅ `type`, `operation`, `currency`, `status` must be valid enum values
- ✅ At least one of `landAreaM2` or `buildAreaM2` recommended
- ✅ `description` minimum 50 characters

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "clxyz123",
    "title": "Apartamento en Ocean Sky",
    "slug": "apartamento-ocean-sky",
    "status": "AVAILABLE"
  },
  "metadata": {
    "id": "clxyz123",
    "url": "/propiedades/apartamento-ocean-sky",
    "adminUrl": "/admin/propiedades/clxyz123",
    "message": "Property created successfully",
    "humanReadable": "✅ Property 'Apartamento en Ocean Sky' created with ID: clxyz123\n📍 View: /propiedades/apartamento-ocean-sky"
  }
}
```

#### `list_properties`

List properties with optional filters.

**Input Schema**:

```typescript
{
  limit?: number // Default: 50, Max: 200
  offset?: number // Default: 0
  status?: PropertyStatus
  type?: PropertyType
  operation?: OperationType
  agentId?: string
  zoneId?: string
  featured?: boolean
  search?: string // Search in title, description, address
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "clxyz123",
        "title": "Apartamento en Ocean Sky",
        "slug": "apartamento-ocean-sky",
        "price": 360000,
        "currency": "USD",
        "bedrooms": 2,
        "bathrooms": 2,
        "buildAreaM2": 141,
        "status": "AVAILABLE",
        "zone": { "id": "...", "name": "Las Mercedes" },
        "agent": { "id": "...", "name": "Fabiola Ostos" }
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  },
  "metadata": {
    "message": "Found 150 properties",
    "humanReadable": "📊 Found 150 properties (showing 1-50)"
  }
}
```

#### `get_property`

Get detailed property information.

**Input Schema**:

```typescript
{
  id?: string // Property ID (cuid)
  slug?: string // Property slug
}
```

**Response**: Full property object with relations (zone, agent, images, tags).

#### `update_property`

Update an existing property.

**Input Schema**:

```typescript
{
  id: string // Required
  // ... any property field (partial update)
}
```

**Validations**: Same as create, plus:

- ✅ Property must exist
- ✅ If changing `slug`, new slug must be unique

#### `delete_property`

Delete a property (hard delete).

**Input Schema**:

```typescript
{
  id: string
  confirm?: boolean // Safety check
}
```

**Validations**:

- ✅ Property must exist
- ✅ `confirm` must be true (prevents accidental deletion)
- ✅ Cascade delete images and tags

---

### 4.2 User Tools

#### `create_user`

Create a new user (agent or admin).

**Input Schema**:

```typescript
{
  email: string
  password: string
  name: string
  role: Role // SUPER_ADMIN, AGENT, CLIENT
  phone?: string
  active?: boolean // Default: true
}
```

**Validations**:

- ✅ Email must be unique
- ✅ Password minimum 8 characters
- ✅ Role must be valid enum value
- ✅ Email format validation

#### `list_users`

List users with filters.

**Input Schema**:

```typescript
{
  limit?: number
  offset?: number
  role?: Role
  active?: boolean
  search?: string // Search in name, email
}
```

#### `get_user`

Get user details.

**Input Schema**:

```typescript
{
  id?: string
  email?: string
}
```

#### `update_user`

Update user information.

**Input Schema**:

```typescript
{
  id: string
  // ... any user field (partial update)
}
```

#### `delete_user`

Delete a user (hard delete).

**Input Schema**:

```typescript
{
  id: string
  confirm?: boolean
}
```

**Validations**:

- ✅ Cannot delete yourself
- ✅ Cannot delete last SUPER_ADMIN
- ✅ Cascade delete or reassign related entities

---

### 4.3 Agent Tools

#### `create_agent`

Create a new agent (extends User).

**Input Schema**:

```typescript
{
  userId: string // Existing user ID
  bio?: string
  phone?: string
  whatsapp?: string
  photoUrl?: string
}
```

**Validations**:

- ✅ `userId` must exist
- ✅ User must have role `AGENT`
- ✅ User must not already be an agent

#### `list_agents`

List all agents.

**Input Schema**:

```typescript
{
  limit?: number
  offset?: number
  active?: boolean
  search?: string
}
```

#### `get_agent`

Get agent details with properties count.

**Input Schema**:

```typescript
{
  id?: string
  userId?: string
}
```

#### `update_agent`

Update agent information.

**Input Schema**:

```typescript
{
  id: string
  // ... any agent field (partial update)
}
```

#### `delete_agent`

Delete an agent (hard delete).

**Input Schema**:

```typescript
{
  id: string
  confirm?: boolean
}
```

**Validations**:

- ✅ Agent must exist
- ✅ Reassign or delete agent's properties first

---

### 4.4 Utility Tools

#### `parse_property_document`

Parse property data from Word document or plain text.

**Input Schema**:

```typescript
{
  content: string // Raw text or markdown from Word doc
  format?: 'word' | 'text' | 'markdown'
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "parsed": {
      "title": "Apartamento en Ocean Sky",
      "operation": "SALE",
      "price": 360000,
      "currency": "USD",
      "bedrooms": 2,
      "bathrooms": 2,
      "buildAreaM2": 141,
      "parkingSpots": 2,
      "description": "Precio: $360,000\nÁrea: 141 m2\n...",
      "features": ["pool", "gym", "party_room", "kids_area", "squash_court"],
      "owner": "Corcione",
      "responsible": "Fabiola Ostos"
    },
    "confidence": 0.95,
    "missingFields": ["zoneId", "agentId", "address"]
  },
  "metadata": {
    "message": "Property data parsed successfully",
    "humanReadable": "📄 Parsed property: 'Apartamento en Ocean Sky'\n💰 Price: $360,000\n🛏️ 2 bedrooms, 2 bathrooms\n⚠️ Missing: zone, agent, address"
  }
}
```

**Parsing Logic**:

- Extract key-value pairs from text
- Map Spanish terms to enum values (Venta → SALE, Alquiler → RENT)
- Extract numbers from text (price, area, bedrooms, etc.)
- Identify features from description (piscina → pool, gym → gym)
- Return confidence score and missing required fields

#### `list_zones`

List all zones (for property creation).

**Input Schema**:

```typescript
{
  parentId?: string // Filter by parent zone
}
```

#### `list_enums`

List available enum values (for validation).

**Input Schema**:

```typescript
{
  type: 'PropertyType' | 'OperationType' | 'Currency' | 'PropertyStatus' | 'Tag' | 'Role'
}
```

---

## 5. Data Formats

### 5.1 Property Document Parsing

**Input Example** (from Word document):

```
PROPIEDAD: Apartamento en Ocean Sky
OPERACIÓN: Venta
NOMBRE DEL PROPIETARIO: Corcione
RESPONSABLE DE PROPIEDAD: Fabiola Ostos
DESCRIPCIÓN DE LA PROPIEDAD:
Precio: $360,000
Área: 141 m2
Habitaciones: 2
Baños: 2
Balcón: si
Estacionamiento: 2
Área social: piscina, gym, salón de fiestas
Cuota de admon: 246
Años del Edificio: 12 años
```

**Parsed Output**:

```json
{
  "title": "Apartamento en Ocean Sky",
  "operation": "SALE",
  "price": 360000,
  "currency": "USD",
  "buildAreaM2": 141,
  "bedrooms": 2,
  "bathrooms": 2,
  "parkingSpots": 2,
  "features": ["pool", "gym", "party_room"],
  "description": "Precio: $360,000\nÁrea: 141 m2\n...",
  "owner": "Corcione",
  "responsible": "Fabiola Ostos"
}
```

**Mapping Rules**:

- `OPERACIÓN: Venta` → `operation: "SALE"`
- `OPERACIÓN: Alquiler` → `operation: "RENT"`
- `Precio: $360,000` → `price: 360000, currency: "USD"`
- `Área: 141 m2` → `buildAreaM2: 141`
- `Habitaciones: 2` → `bedrooms: 2`
- `Baños: 2` → `bathrooms: 2`
- `piscina` → `features: ["pool"]`
- `gym` → `features: ["gym"]`
- `salón de fiestas` → `features: ["party_room"]`

### 5.2 Response Format

**Standard Response Structure**:

```typescript
{
  success: boolean
  data?: any // Machine-readable data for agent
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    id?: string // Created/updated resource ID
    url?: string // Public URL
    adminUrl?: string // Admin panel URL
    message: string // Human-readable summary
    humanReadable: string // Formatted for human display
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid property data",
    "details": {
      "zoneId": "Zone not found",
      "price": "Price must be positive"
    }
  },
  "metadata": {
    "message": "Failed to create property",
    "humanReadable": "❌ Failed to create property\n⚠️ Zone not found\n⚠️ Price must be positive"
  }
}
```

---

## 6. Environment Configuration

### 6.1 Environment Variables

**.env.local** (Development):

```bash
# MCP Configuration
MCP_ENABLED=true
MCP_API_KEY=mcp_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
MCP_SERVER_URL=http://localhost:3000/api/mcp
```

**.env.production** (Production):

```bash
# MCP Configuration
MCP_ENABLED=true
MCP_API_KEY=mcp_prod_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4

# App URLs
NEXT_PUBLIC_APP_URL=https://jrrealty.com
MCP_SERVER_URL=https://jrrealty.com/api/mcp
```

### 6.2 AI Agent Configuration

**opencode** (`.opencode/config.json`):

```json
{
  "mcp": {
    "servers": {
      "jrrealty-dev": {
        "command": "node",
        "args": ["mcp-server/index.js"],
        "env": {
          "MCP_API_KEY": "mcp_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
          "MCP_SERVER_URL": "http://localhost:3000/api/mcp"
        }
      },
      "jrrealty-prod": {
        "command": "node",
        "args": ["mcp-server/index.js"],
        "env": {
          "MCP_API_KEY": "mcp_prod_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4",
          "MCP_SERVER_URL": "https://jrrealty.com/api/mcp"
        }
      }
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jrrealty-dev": {
      "command": "node",
      "args": ["/path/to/jr-realty/mcp-server/index.js"],
      "env": {
        "MCP_API_KEY": "mcp_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "MCP_SERVER_URL": "http://localhost:3000/api/mcp"
      }
    }
  }
}
```

---

## 7. Error Handling

### 7.1 Error Codes

| Code                   | Description                         | HTTP Status |
| ---------------------- | ----------------------------------- | ----------- |
| `AUTHENTICATION_ERROR` | Invalid or missing API key          | 401         |
| `AUTHORIZATION_ERROR`  | Insufficient permissions            | 403         |
| `VALIDATION_ERROR`     | Invalid input data                  | 400         |
| `NOT_FOUND`            | Resource not found                  | 404         |
| `CONFLICT`             | Resource already exists (duplicate) | 409         |
| `INTERNAL_ERROR`       | Server error                        | 500         |

### 7.2 Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot create property: invalid data",
    "details": {
      "zoneId": "Zone 'xyz' does not exist",
      "agentId": "Agent must be assigned"
    }
  },
  "metadata": {
    "message": "Validation failed",
    "humanReadable": "❌ Cannot create property\n⚠️ Zone 'xyz' does not exist\n⚠️ Agent must be assigned"
  }
}
```

---

## 8. Security Considerations

### 8.1 API Key Security

- ✅ Store API keys hashed in database (bcrypt)
- ✅ Use HTTPS in production (never send keys in plain text)
- ✅ Rotate keys periodically (optional expiration date)
- ✅ Log all API key usage (lastUsedAt)
- ✅ Revoke compromised keys immediately (set active=false)

### 8.2 Rate Limiting

- ✅ Implement rate limiting per API key
- ✅ Default: 100 requests per minute
- ✅ Configurable per key

### 8.3 Audit Logging

- ✅ Log all MCP operations (create, update, delete)
- ✅ Include: timestamp, API key, operation, resource ID, success/failure
- ✅ Store in `mcp_audit_logs` table

```prisma
model McpAuditLog {
  id          String   @id @default(cuid())
  apiKeyId    String
  operation   String   // "create_property", "update_user", etc.
  resourceId  String?
  success     Boolean
  error       String?
  ipAddress   String?
  createdAt   DateTime @default(now())

  apiKey      McpApiKey @relation(fields: [apiKeyId], references: [id])
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

- Test each tool independently
- Mock Prisma client
- Test validation logic
- Test parsing logic (property documents)

### 9.2 Integration Tests

- Test API routes with real database
- Test authentication flow
- Test error handling
- Use test database (port 5433)

### 9.3 E2E Tests

- Test with actual AI agent (opencode/Claude)
- Test full workflow: parse document → create property → verify
- Test both stdio and HTTP+SSE transports

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

- [ ] Create database schema (McpApiKey, McpAuditLog)
- [ ] Implement API key authentication
- [ ] Create base API route structure
- [ ] Implement stdio transport
- [ ] Implement HTTP+SSE transport
- [ ] Setup MCP SDK integration

### Phase 2: Property Tools (Week 2)

- [ ] Implement `create_property`
- [ ] Implement `list_properties`
- [ ] Implement `get_property`
- [ ] Implement `update_property`
- [ ] Implement `delete_property`
- [ ] Implement `parse_property_document`
- [ ] Implement `list_zones` and `list_enums`

### Phase 3: User & Agent Tools (Week 3)

- [ ] Implement user CRUD tools
- [ ] Implement agent CRUD tools
- [ ] Add validation logic
- [ ] Add audit logging

### Phase 4: Testing & Documentation (Week 4)

- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Create setup documentation
- [ ] Create API reference documentation
- [ ] Test with opencode
- [ ] Test with Claude Desktop

### Phase 5: Production Deployment (Week 5)

- [ ] Generate production API keys
- [ ] Deploy to production server
- [ ] Configure production environment
- [ ] Test production setup
- [ ] Monitor for issues

---

## 11. Success Criteria

### Functional Requirements

- ✅ AI agent can create properties from Word documents
- ✅ AI agent can list, view, update, and delete properties
- ✅ AI agent can manage users and agents
- ✅ Same validation rules as admin panel
- ✅ Works with opencode and Claude Desktop
- ✅ Supports both dev and prod environments

### Non-Functional Requirements

- ✅ Response time < 2 seconds for all operations
- ✅ 100% test coverage for critical paths
- ✅ Zero security vulnerabilities
- ✅ Comprehensive error messages
- ✅ Clear documentation

---

## 12. Future Enhancements (Out of Scope)

- Image upload/management via MCP
- Blog post management
- CMS page management
- Zone management
- Project management
- Lead management
- Testimonial management
- Email notifications
- WhatsApp integration
- Google Maps integration
- Automated reports
- Data backup/restore
- Bulk operations (import/export CSV)
- Advanced search (geographic, price ranges)
- Analytics and insights

---

## 13. Glossary

- **MCP**: Model Context Protocol - standard for AI agent tool integration
- **stdio**: Standard input/output - transport for local processes
- **HTTP+SSE**: HTTP with Server-Sent Events - transport for remote connections
- **API Key**: Secret token for authentication
- **Tool**: MCP capability (function) that AI agent can invoke
- **Resource**: Database entity (Property, User, Agent)

---

## 14. References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Validation](https://zod.dev/)

---

**Document Status**: Draft  
**Next Steps**: Review and approval → Implementation planning → Development
