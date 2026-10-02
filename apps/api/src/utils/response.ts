export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return ok(data, { total, page, limit, pages: Math.ceil(total / limit) });
}
