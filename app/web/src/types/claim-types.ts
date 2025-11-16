/**
 * Claim types and interfaces for SkillChain
 */

export enum ClaimType {
  JobCompleted = 'JobCompleted',
  HackathonWin = 'HackathonWin',
  RepoContribution = 'RepoContribution',
  SkillEndorsement = 'SkillEndorsement',
  Other = 'Other',
}

export interface Claim {
  id: number;
  issuer: string;
  receiver: string;
  claimType: ClaimType;
  proofHash: string;
  approved: boolean;
  timestamp: number;
}


