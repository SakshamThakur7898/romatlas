export const ROLES = ['USER', 'CONTRIBUTOR', 'MODERATOR', 'ADMIN'] as const;
export const ROM_STATUS = ['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'UNKNOWN'] as const;
export const OFFICIAL_STATUS = ['OFFICIAL', 'COMMUNITY', 'UNKNOWN'] as const;
// UNKNOWN is an addition to the original spec: lets seed/imported data avoid guessing.
export const SUPPORT_TYPE = ['OFFICIAL', 'COMMUNITY', 'UNOFFICIAL', 'UNKNOWN'] as const;
export const VERIFICATION = ['VERIFIED', 'COMMUNITY_REPORTED', 'OUTDATED', 'UNVERIFIED'] as const;
export const BUILD_TYPE = ['STABLE', 'NIGHTLY', 'BETA', 'OTHER'] as const;
export const GUIDE_CATEGORY = [
  'BOOTLOADER', 'RECOVERY', 'ROM_INSTALLATION', 'ROOT', 'KERNEL',
  'GAPPS', 'BACKUP', 'RESTORE', 'TROUBLESHOOTING', 'GENERAL',
] as const;
export const DIFFICULTY = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export const GUIDE_STATUS = ['DRAFT', 'PUBLISHED', 'OUTDATED', 'ARCHIVED'] as const;
export const SOURCE_TYPE = [
  'OFFICIAL_PROJECT', 'OFFICIAL_DEVICE_PAGE', 'GITHUB', 'GITLAB',
  'DOCUMENTATION', 'COMMUNITY', 'FORUM', 'OTHER',
] as const;
// Factual classification only, no trust scores.
export const RELIABILITY_TYPE = ['FIRST_PARTY', 'THIRD_PARTY', 'USER_SUBMITTED'] as const;
export const SOURCE_STATUS = ['ACTIVE', 'OUTDATED', 'CHECK_FAILED', 'DISABLED'] as const;
export const UPDATE_TYPE = [
  'NEW_BUILD', 'ANDROID_VERSION', 'SOURCE_CHANGE', 'GUIDE_CHANGE',
  'RECOVERY_UPDATE', 'KERNEL_UPDATE', 'STATUS_CHANGE',
] as const;
export const TARGET_TYPE = [
  'DEVICE', 'ROM', 'DEVICE_ROM_SUPPORT', 'RECOVERY', 'KERNEL', 'GUIDE', 'SOURCE', 'UPDATE',
] as const;
export const REPORT_REASON = [
  'BROKEN_LINK', 'OUTDATED_INFO', 'INCORRECT_COMPATIBILITY', 'WRONG_DEVICE_VARIANT',
  'INCORRECT_ROM_INFO', 'GUIDE_OUTDATED', 'OTHER',
] as const;
export const REPORT_STATUS = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const;
export const SUBMISSION_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const COMPONENT_STATUS = ['ACTIVE', 'INACTIVE', 'UNKNOWN'] as const;
