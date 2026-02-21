/**
 * Skills management hooks
 */

export {
  useSkills,
  useSkillSystemPrompt,
  useAutoMatchSkills,
  useSkillTokenBudget,
  type UseSkillsOptions,
  type UseSkillsReturn,
} from './use-skills';
export {
  useNativeSkills,
  useNativeSkillAvailable,
  type UseNativeSkillsReturn,
  type SkillRepo,
  type AddSkillRepoInput,
  type DiscoverableSkill,
  type InstalledSkill,
  type NativeSkill,
  type LocalSkill,
} from './use-native-skills';
export { useSkillSync, useSkillSyncAvailable, type UseSkillSyncReturn } from './use-skill-sync';
export {
  useSkillSecurity,
  getSeverityColor,
  getSeverityLabel,
  getCategoryLabel,
  getRiskScoreColor,
  type UseSkillSecurityReturn,
  type SecurityScanReport,
  type SecurityScanOptions,
  type SecurityFinding,
  type SecuritySeverity,
} from './use-skill-security';
export { useSkillMarketplace, type UseSkillMarketplaceReturn } from './use-skill-marketplace';
export { useSkillAI } from './use-skill-ai';
