#!/usr/bin/env bash
# MCP Server startup script
# Bypasses pnpm dependency checks for faster startup

set -e

cd "$(dirname "$0")"

# Use npx to run tsx without pnpm overhead
exec npx --yes tsx index.ts "$@"
