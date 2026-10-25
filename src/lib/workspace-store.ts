import type { ContentFormat, DraftRecord, Platform } from './content-api';

export type FounderProfile = {
  name: string;
  role: string;
  company: string;
  companyDescription: string;
  background: string;
  audience: string;
  pointOfView: string;
  voice: string;
  topics: string;
  avoid: string;
  linkedin: string;
  x: string;
  website: string;
};

export type WorkspaceDocument = { id: string; name: string; text: string; addedAt: string; storagePath?: string };
export type WorkspaceProject = { id: string; name: string; description: string; website?: string; voice?: string; documents?: WorkspaceDocument[] };
export type WorkspaceSkill = { id: string; name: string; instructions: string; sourceName?: string; versionId?: string; versionNumber?: number };

export type WorkspaceData = {
  drafts: DraftRecord[];
  profile: FounderProfile;
  projects: WorkspaceProject[];
  skills: WorkspaceSkill[];
  onboardingComplete: boolean;
  accountType: 'founder' | 'founder_plus_startups' | null;
};

export const emptyProfile: FounderProfile = {
  name: '', role: '', company: '', companyDescription: '', background: '', audience: '',
  pointOfView: '', voice: '', topics: '', avoid: '', linkedin: '', x: '', website: '',
};

export const emptyWorkspace: WorkspaceData = {
  drafts: [], profile: emptyProfile, projects: [], skills: [], onboardingComplete: false, accountType: null,
};

const storagePrefix = 'fieldnotes-workspace-v2:';

export function readWorkspace(ownerId: string): WorkspaceData {
  try {
    const raw = localStorage.getItem(`${storagePrefix}${ownerId}`);
    if (!raw) {
      const legacyProfile = localStorage.getItem('founder-studio-profile-v1');
      if (!legacyProfile) return emptyWorkspace;
      const parsedProfile = JSON.parse(legacyProfile) as Partial<FounderProfile>;
      return { ...emptyWorkspace, profile: { ...emptyProfile, ...parsedProfile } };
    }
    const parsed = JSON.parse(raw) as Partial<WorkspaceData>;
    return {
      ...emptyWorkspace,
      ...parsed,
      profile: { ...emptyProfile, ...parsed.profile },
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.map((project) => ({ ...project, website: project.website ?? '', voice: project.voice ?? '', documents: Array.isArray(project.documents) ? project.documents : [] })) : [],
      accountType: parsed.accountType === 'founder' || parsed.accountType === 'founder_plus_startups' ? parsed.accountType : null,
    };
  } catch {
    return emptyWorkspace;
  }
}

export function writeWorkspace(ownerId: string, value: WorkspaceData): boolean {
  try {
    localStorage.setItem(`${storagePrefix}${ownerId}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function makeDraft(input: { id: string; title: string; format: ContentFormat; platform: Platform; text: string; demo?: boolean }): DraftRecord {
  return { ...input, updatedAt: new Date().toISOString() };
}
