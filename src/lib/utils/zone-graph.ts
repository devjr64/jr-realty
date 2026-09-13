/**
 * Detección de ciclos en la jerarquía de zonas (grafo dirigido id → parentId).
 *
 * Pura y determinista: recibe el mapa de relaciones y decide si asignar
 * `parentId` a `zoneId` crearía un ciclo (auto-referencia o descendiente
 * apuntando a un ancestro).
 */

export type ParentMap = ReadonlyMap<string, string | null>

/**
 * True cuando `possibleAncestorId` es `zoneId` mismo o un ancestro de
 * `zoneId` (caminando por la cadena de padres). En ese caso asignar
 * `parentId = possibleAncestorId` crearía un ciclo.
 */
export function wouldCreateCycle(
  parents: ParentMap,
  zoneId: string,
  possibleAncestorId: string,
): boolean {
  if (zoneId === possibleAncestorId) return true

  let current = parents.get(zoneId) ?? null
  const visited = new Set<string>()

  while (current !== null && current !== undefined) {
    if (current === possibleAncestorId) return true
    // Protección contra datos corruptos ya existentes (ciclos previos).
    if (visited.has(current)) return true
    visited.add(current)
    current = parents.get(current) ?? null
  }

  return false
}