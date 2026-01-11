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
  type DiscoverableSkill,
  type InstalledSkill,
  type NativeSkill,
  type LocalSkill,
} from './use-native-skills';
export {
  useSkillSync,
  useSkillSyncAvailable,
  type UseSkillSyncReturn,
} from './use-skill-sync';
