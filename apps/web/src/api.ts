interface ApiOk<T> {
  success: true;
  data: T;
}
interface ApiFail {
  success: false;
  error: { code: string; message: string };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'include' });
  const body = (await res.json()) as ApiOk<T> | ApiFail;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}
