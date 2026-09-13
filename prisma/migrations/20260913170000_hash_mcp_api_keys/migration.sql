-- Hash existing plaintext MCP API keys at rest (SHA-256, hex).
--
-- Mirrors hashMcpApiKey() in src/app/api/mcp/lib/auth.ts:
--   createHash('sha256').update(key, 'utf8').digest('hex')
-- so lookups after this migration match the new application code.
--
-- PostgreSQL's sha256() accepts bytea; convert_to() encodes the text as
-- UTF-8 first (same encoding Node's digest('hex') uses).
UPDATE "McpApiKey" SET key = encode(sha256(convert_to(key, 'UTF8')), 'hex');
