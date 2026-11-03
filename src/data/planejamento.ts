/** Armazenamento opcional: restrições do navegador não impedem planejar a grade. */
export function lerSessao(chave: string): unknown {
  try { return JSON.parse(sessionStorage.getItem(chave) ?? 'null'); } catch { return null; }
}
export function salvarSessao(chave: string, valor: unknown): void {
  try { sessionStorage.setItem(chave, JSON.stringify(valor)); } catch { /* A seleção continua em memória. */ }
}
export function lerTextoLegado(chave: string): string | null {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}
