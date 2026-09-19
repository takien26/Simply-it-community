/**
 * Safe fetch helper that handles non-2xx HTTP responses, HTML error pages, and network failures.
 * Returns { data, error, ok, status }.
 */
export async function safeFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ data: T | null; error: string | null; ok: boolean; status: number }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let body: any = null;
    if (isJson) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      try {
        body = await res.text();
      } catch {
        body = null;
      }
    }

    if (!res.ok) {
      const errorMessage =
        (typeof body === 'object' && body?.error) ||
        (typeof body === 'object' && body?.message) ||
        (typeof body === 'string' && body) ||
        `HTTP error ${res.status}`;
      return { data: null, error: String(errorMessage), ok: false, status: res.status };
    }

    return { data: body as T, error: null, ok: true, status: res.status };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Lỗi kết nối mạng', ok: false, status: 0 };
  }
}
