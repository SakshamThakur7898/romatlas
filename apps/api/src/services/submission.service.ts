import { DeviceModel, GuideModel, RomModel } from '../models';
import { AppError } from '../utils/errors';
import { deviceInputSchema, guideInputSchema, romInputSchema } from '../validators/schemas';

/** Contribution types that can currently be approved into real records. */
export const SUBMISSION_TYPES = ['DEVICE', 'ROM', 'GUIDE'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export type ParsedSubmission =
  | { type: 'DEVICE'; data: ReturnType<typeof deviceInputSchema.parse> }
  | { type: 'ROM'; data: ReturnType<typeof romInputSchema.parse> }
  | { type: 'GUIDE'; data: ReturnType<typeof guideInputSchema.parse> };

/** Validates a payload with the same strict schema staff inputs use. Throws a Zod error (400) when invalid. */
export function parseSubmissionPayload(type: string, payload: unknown): ParsedSubmission {
  switch (type) {
    case 'DEVICE': return { type, data: deviceInputSchema.parse(payload) };
    case 'ROM': return { type, data: romInputSchema.parse(payload) };
    case 'GUIDE': return { type, data: guideInputSchema.parse(payload) };
    default: throw new AppError(400, 'UNSUPPORTED_SUBMISSION_TYPE', `Submissions of type ${type} are not supported yet`);
  }
}

/** Creates the real record for an approved submission. Approving a guide publishes it. */
export async function applySubmission(parsed: ParsedSubmission): Promise<{ targetType: string; targetId: string }> {
  switch (parsed.type) {
    case 'DEVICE': {
      const d = await DeviceModel.create(parsed.data);
      return { targetType: 'Device', targetId: d.id };
    }
    case 'ROM': {
      const r = await RomModel.create(parsed.data);
      return { targetType: 'Rom', targetId: r.id };
    }
    case 'GUIDE': {
      const g = await GuideModel.create({ ...parsed.data, status: 'PUBLISHED', lastReviewedAt: new Date() });
      return { targetType: 'Guide', targetId: g.id };
    }
  }
}
