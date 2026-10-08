import {
  DeviceModel, DeviceRomSupportModel, GuideModel, KernelModel, RecoveryModel, RomModel,
} from '../models';
import { AppError } from '../utils/errors';
import {
  deviceInputSchema, guideInputSchema, kernelInputSchema, recoveryInputSchema, romInputSchema, supportInputSchema,
} from '../validators/schemas';

/** Contribution types that can be approved into real records. */
export const SUBMISSION_TYPES = ['DEVICE', 'ROM', 'GUIDE', 'DEVICE_ROM_SUPPORT', 'RECOVERY', 'KERNEL'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export type ParsedSubmission =
  | { type: 'DEVICE'; data: ReturnType<typeof deviceInputSchema.parse> }
  | { type: 'ROM'; data: ReturnType<typeof romInputSchema.parse> }
  | { type: 'GUIDE'; data: ReturnType<typeof guideInputSchema.parse> }
  | { type: 'DEVICE_ROM_SUPPORT'; data: ReturnType<typeof supportInputSchema.parse> }
  | { type: 'RECOVERY'; data: ReturnType<typeof recoveryInputSchema.parse> }
  | { type: 'KERNEL'; data: ReturnType<typeof kernelInputSchema.parse> };

/** Validates a payload with the same strict schema staff inputs use. Throws a Zod error (400) when invalid. */
export function parseSubmissionPayload(type: string, payload: unknown): ParsedSubmission {
  switch (type) {
    case 'DEVICE': return { type, data: deviceInputSchema.parse(payload) };
    case 'ROM': return { type, data: romInputSchema.parse(payload) };
    case 'GUIDE': return { type, data: guideInputSchema.parse(payload) };
    case 'DEVICE_ROM_SUPPORT': return { type, data: supportInputSchema.parse(payload) };
    case 'RECOVERY': return { type, data: recoveryInputSchema.parse(payload) };
    case 'KERNEL': return { type, data: kernelInputSchema.parse(payload) };
    default: throw new AppError(400, 'UNSUPPORTED_SUBMISSION_TYPE', `Submissions of type ${type} are not supported`);
  }
}

/** Referenced devices/ROMs must exist, both when submitting and when approving (they may have been deleted since). */
export async function assertReferencesExist(parsed: ParsedSubmission): Promise<void> {
  const deviceId = 'deviceId' in parsed.data ? parsed.data.deviceId : undefined;
  const romId = 'romId' in parsed.data ? parsed.data.romId : undefined;
  if (deviceId && !(await DeviceModel.exists({ _id: deviceId }))) throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  if (romId && !(await RomModel.exists({ _id: romId }))) throw new AppError(404, 'ROM_NOT_FOUND', 'ROM not found');
}

/** Creates the real record for an approved submission. Community data is never marked verified. */
export async function applySubmission(parsed: ParsedSubmission): Promise<{ targetType: string; targetId: string }> {
  await assertReferencesExist(parsed);
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
    case 'DEVICE_ROM_SUPPORT': {
      const s = await DeviceRomSupportModel.create({ ...parsed.data, verificationStatus: 'COMMUNITY_REPORTED', lifecycle: 'UNKNOWN' });
      return { targetType: 'DeviceRomSupport', targetId: s.id };
    }
    case 'RECOVERY': {
      const r = await RecoveryModel.create(parsed.data);
      return { targetType: 'Recovery', targetId: r.id };
    }
    case 'KERNEL': {
      const k = await KernelModel.create(parsed.data);
      return { targetType: 'Kernel', targetId: k.id };
    }
  }
}
