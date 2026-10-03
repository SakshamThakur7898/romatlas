import type { FieldValues, Resolver } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

/** Minimal Zod resolver for react-hook-form (first error per field). */
export function zodResolver<T extends FieldValues>(schema: ZodTypeAny): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data as T, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.');
      if (!errors[key]) errors[key] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors } as never;
  };
}
