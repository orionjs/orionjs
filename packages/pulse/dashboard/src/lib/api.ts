export interface ApiResponse<T> {
  data: T
  meta: {generatedAt: string; durationMs: number}
}

export async function apiGet<T>(path: string, parameters: Record<string, unknown> = {}) {
  const url = new URL(path, window.location.origin)
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  const response = await fetch(url, {headers: {accept: 'application/json'}})
  const body = (await response.json()) as ApiResponse<T> | {error?: string}
  if (!response.ok) {
    throw new Error(
      'error' in body && body.error ? body.error : `Request failed (${response.status})`,
    )
  }
  return body as ApiResponse<T>
}
