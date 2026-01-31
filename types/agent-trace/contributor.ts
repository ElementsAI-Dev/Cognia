export type ContributorType = 'human' | 'ai' | 'mixed' | 'unknown';

export interface Contributor {
  type: ContributorType;
  model_id?: string;
}
