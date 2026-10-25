import type { FounderProfile, WorkspaceData, WorkspaceDocument, WorkspaceProject, WorkspaceSkill } from './workspace-store';
import type { ContentFormat, DraftRecord, Platform } from './content-api';
import { supabase } from './supabase';

const sourceBucket = 'workspace_sources';
const profileFields: (keyof FounderProfile)[] = ['name', 'role', 'company', 'companyDescription', 'background', 'audience', 'pointOfView', 'voice', 'topics', 'avoid', 'linkedin', 'x', 'website'];

type SupabaseErrorLike = { code?: string; message?: string };
type RemoteLoad = { workspace: WorkspaceData; hadRemoteData: boolean };
type RemoteProject = { id: string; name: string; description: Record<string, unknown> | string | null; status: string | null };
type RemoteSkill = { id: string; name: string; description: Record<string, unknown> | string | null; status: string | null };
type RemoteVersion = { id: string; skill_id: string; version_number: number; prompt_instructions: string; applicable_formats: string[] | null; applicable_platforms: string[] | null };
type RemoteDraft = { id: string; project_id: string | null; status: string | null; topic: string; content_format: string; platform: string; objective: string | null; draft_content: string; parent_content_id: string | null; updated_at: string | null };

function fail(error: SupabaseErrorLike | null, resource: string): void {
  if (!error) return;
  console.error(`Supabase ${resource} sync failed: ${error.code ?? ''} ${error.message ?? ''}`.trim());
  throw new Error(`${resource} could not be synchronized. Check Supabase RLS and the ${resource} table policies.`);
}

function parseObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch { return {}; }
  }
  return {};
}

function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
function validFormat(value: string): value is ContentFormat { return ['written_post', 'short_video', 'long_video', 'talking_points'].includes(value); }
function validPlatform(value: string): value is Platform { return ['LinkedIn', 'X', 'TikTok', 'Instagram', 'YouTube'].includes(value); }
function isUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function cleanFilename(value: string): string { return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'source.txt'; }

export async function loadWorkspaceFromSupabase(userId: string, fallbackName = ''): Promise<RemoteLoad> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const [profileResult, projectResult, skillResult, draftResult] = await Promise.all([
    supabase.from('founder_profiles').select('user_id,voice_profile').eq('user_id', userId).maybeSingle(),
    supabase.from('projects').select('id,name,description,status').eq('user_id', userId),
    supabase.from('skills').select('id,name,description,status').eq('user_id', userId),
    supabase.from('content_history').select('id,project_id,status,topic,content_format,platform,objective,draft_content,parent_content_id,updated_at').eq('user_id', userId),
  ]);
  fail(profileResult.error, 'founder profile');
  fail(projectResult.error, 'startups');
  fail(skillResult.error, 'skills');
  fail(draftResult.error, 'draft library');

  const rawProfile = parseObject(profileResult.data?.voice_profile);
  const storedProfile = parseObject(rawProfile.profile);
  const mergedProfile = { ...rawProfile, ...storedProfile };
  const profile = Object.fromEntries(profileFields.map((key) => [key, text(mergedProfile[key])])) as FounderProfile;
  if (!profile.name) profile.name = fallbackName;

  const rawProjects = (projectResult.data ?? []) as RemoteProject[];
  const activeProjects = rawProjects.filter((item) => item.status !== 'archived' && item.status !== 'deleted');
  const projectIds = activeProjects.map((project) => project.id);
  const rawSkills = (skillResult.data ?? []) as RemoteSkill[];
  const skillIds = rawSkills.filter((item) => item.status !== 'archived' && item.status !== 'deleted').map((skill) => skill.id);
  const versionResult = skillIds.length
    ? await supabase.from('skill_versions').select('id,skill_id,version_number,prompt_instructions,applicable_formats,applicable_platforms').in('skill_id', skillIds).order('version_number', { ascending: false })
    : { data: [], error: null };
  fail(versionResult.error, 'skill versions');

  const latestVersions = new Map<string, RemoteVersion>();
  for (const version of (versionResult.data ?? []) as RemoteVersion[]) {
    if (!latestVersions.has(version.skill_id)) latestVersions.set(version.skill_id, version);
  }

  const projects: WorkspaceProject[] = await Promise.all(activeProjects.map(async (row) => {
    const saved = parseObject(row.description);
    const rawDocuments = Array.isArray(saved.documents) ? saved.documents as Record<string, unknown>[] : [];
    const documents = await Promise.all(rawDocuments.map(async (entry) => {
      const id = text(entry.id);
      const name = text(entry.name);
      const storagePath = text(entry.storagePath);
      let contents = text(entry.text);
      if (storagePath) {
        const { data, error } = await supabase!.storage.from(sourceBucket).download(storagePath);
        if (error) console.error(`Could not download startup source ${name}: ${error.message}`);
        else contents = await data.text();
      }
      return { id, name, storagePath, text: contents, addedAt: text(entry.addedAt) } satisfies WorkspaceDocument;
    }));
    return { id: row.id, name: row.name, description: text(saved.description), website: text(saved.website), voice: text(saved.voice), documents };
  }));

  const skills: WorkspaceSkill[] = rawSkills.filter((item) => item.status !== 'archived' && item.status !== 'deleted').map((row) => {
    const version = latestVersions.get(row.id);
    const saved = parseObject(row.description);
    return {
      id: row.id,
      name: row.name,
      instructions: version?.prompt_instructions || text(saved.instructions) || text(row.description),
      sourceName: text(saved.sourceName) || undefined,
      versionId: version?.id,
      versionNumber: version?.version_number,
    };
  });

  const drafts: DraftRecord[] = ((draftResult.data ?? []) as RemoteDraft[])
    .filter((row) => row.status !== 'deleted' && row.status !== 'archived' && row.draft_content && validFormat(row.content_format) && validPlatform(row.platform))
    .map((row) => ({
      id: `live-${row.id}`,
      title: row.topic || 'Generated draft',
      format: row.content_format as ContentFormat,
      platform: row.platform as Platform,
      text: row.draft_content,
      updatedAt: row.updated_at ?? undefined,
      ...(row.project_id ? { workspaceId: row.project_id } : { workspaceId: 'founder' }),
    }));

  const hadRemoteData = Boolean(profileResult.data || rawProjects.length || rawSkills.length || drafts.length);
  return {
    hadRemoteData,
    workspace: {
      drafts: drafts.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
      profile,
      projects,
      skills,
      onboardingComplete: Boolean(rawProfile.onboardingComplete ?? (profile.name && rawProfile.accountType)),
      accountType: rawProfile.accountType === 'founder' || rawProfile.accountType === 'founder_plus_startups' ? rawProfile.accountType : null,
    },
  };
}

async function syncProjectDocuments(userId: string, project: WorkspaceProject, previous?: WorkspaceProject): Promise<WorkspaceProject> {
  if (!supabase) return project;
  const priorDocuments = new Map((previous?.documents ?? []).map((document) => [document.id, document]));
  const documents = project.documents ?? [];
  const storagePaths = new Map<string, string>();
  for (const document of documents) {
    const old = priorDocuments.get(document.id);
    let storagePath = old?.storagePath;
    if (!old || old.text !== document.text || old.name !== document.name) {
      const candidatePath = `${userId}/${project.id}/${document.id}-${cleanFilename(document.name)}`;
      const file = new Blob([document.text], { type: 'text/plain;charset=utf-8' });
      const { error } = await supabase.storage.from(sourceBucket).upload(candidatePath, file, { contentType: 'text/plain', upsert: true });
      if (error?.message.toLowerCase().includes('bucket not found')) {
        // Keep source text inside the user's RLS-protected project JSON until the storage bucket is provisioned.
        storagePath = undefined;
      } else {
        fail(error, 'source upload');
        storagePath = candidatePath;
      }
    }
    if (storagePath) storagePaths.set(document.id, storagePath);
    priorDocuments.delete(document.id);
  }
  const removedPaths = [...priorDocuments.values()].map((document) => document.storagePath).filter((path): path is string => Boolean(path));
  if (removedPaths.length) {
    const { error } = await supabase.storage.from(sourceBucket).remove(removedPaths);
    fail(error, 'source removal');
  }
  return { ...project, documents: documents.map((document) => ({ ...document, storagePath: storagePaths.get(document.id) })) };
}

export async function persistWorkspaceToSupabase(userId: string, workspace: WorkspaceData, previous: WorkspaceData): Promise<WorkspaceData> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error: profileError } = await supabase.from('founder_profiles').upsert({
    user_id: userId,
    voice_profile: { ...workspace.profile, onboardingComplete: workspace.onboardingComplete, accountType: workspace.accountType },
  }, { onConflict: 'user_id' });
  fail(profileError, 'founder profile');

  const previousProjects = new Map(previous.projects.map((project) => [project.id, project]));
  const persistedProjects = await Promise.all(workspace.projects.map((project) => syncProjectDocuments(userId, project, previousProjects.get(project.id))));
  const projectRecords = persistedProjects.map((project) => ({
    id: project.id,
    user_id: userId,
    name: project.name,
    description: { description: project.description, website: project.website ?? '', voice: project.voice ?? '', documents: (project.documents ?? []).map(({ id, name, addedAt, storagePath, text: contents }) => ({ id, name, addedAt, ...(storagePath ? { storagePath } : { text: contents }) })) },
    status: 'active',
  }));
  const removedProjects = previous.projects.filter((project) => !workspace.projects.some((current) => current.id === project.id));
  for (const project of removedProjects) {
    const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', project.id).eq('user_id', userId);
    fail(error, 'startup archive');
    const storagePaths = (project.documents ?? []).map((document) => document.storagePath).filter((path): path is string => Boolean(path));
    if (storagePaths.length) {
      const { error: removeError } = await supabase.storage.from(sourceBucket).remove(storagePaths);
      fail(removeError, 'source removal');
    }
  }
  if (projectRecords.length) {
    const { error } = await supabase.from('projects').upsert(projectRecords, { onConflict: 'id' });
    fail(error, 'startup');
  }

  const previousSkills = new Map(previous.skills.map((skill) => [skill.id, skill]));
  const removedSkills = previous.skills.filter((skill) => !workspace.skills.some((current) => current.id === skill.id));
  for (const skill of removedSkills) {
    const { error } = await supabase.from('skills').update({ status: 'archived' }).eq('id', skill.id).eq('user_id', userId);
    fail(error, 'skill archive');
  }
  const persistedSkills = workspace.skills.map((skill) => {
    const old = previousSkills.get(skill.id);
    const changed = Boolean(old && old.instructions !== skill.instructions);
    return {
      ...skill,
      versionId: skill.versionId ?? crypto.randomUUID(),
      versionNumber: skill.versionNumber ?? (changed ? (old?.versionNumber ?? 1) + 1 : 1),
    };
  });
  if (persistedSkills.length) {
    const { error } = await supabase.from('skills').upsert(persistedSkills.map((skill) => ({ id: skill.id, user_id: userId, name: skill.name, description: { instructions: skill.instructions, sourceName: skill.sourceName ?? '' }, status: 'active' })), { onConflict: 'id' });
    fail(error, 'skill');
    const versions = persistedSkills.filter((skill) => {
      const old = previousSkills.get(skill.id);
      return !old || !old.versionId || old.instructions !== skill.instructions;
    }).map((skill) => ({
      id: skill.versionId ?? crypto.randomUUID(),
      skill_id: skill.id,
      version_number: skill.versionNumber ?? 1,
      prompt_instructions: skill.instructions,
      applicable_formats: [],
      applicable_platforms: [],
    }));
    if (versions.length) {
      const { error: versionsError } = await supabase.from('skill_versions').upsert(versions, { onConflict: 'id' });
      fail(versionsError, 'skill version');
    }
  }

  const drafts = workspace.drafts.filter((draft) => !draft.demo && isUuid(draft.id.replace(/^live-/, '')));
  if (drafts.length) {
    const { error } = await supabase.from('content_history').upsert(drafts.map((draft) => ({
      id: draft.id.replace(/^live-/, ''),
      user_id: userId,
      project_id: draft.workspaceId && draft.workspaceId !== 'founder' ? draft.workspaceId : null,
      status: 'draft',
      topic: draft.title,
      content_format: draft.format,
      platform: draft.platform,
      objective: '',
      draft_content: draft.text,
      parent_content_id: null,
    })), { onConflict: 'id' });
    fail(error, 'draft');
  }

  return { ...workspace, projects: persistedProjects, skills: persistedSkills };
}

export function mergeLocalAndRemote(local: WorkspaceData, remote: WorkspaceData, hadRemoteData: boolean): WorkspaceData {
  if (!hadRemoteData) return {
    ...local,
    profile: { ...local.profile, name: local.profile.name || remote.profile.name },
    skills: local.skills.map((skill) => ({ ...skill, versionId: skill.versionId ?? crypto.randomUUID(), versionNumber: skill.versionNumber ?? 1 })),
  };
  const byId = <T extends { id: string }>(server: T[], localItems: T[]) => {
    const result = new Map(server.map((item) => [item.id, item]));
    for (const item of localItems) if (!result.has(item.id)) result.set(item.id, item);
    return [...result.values()];
  };
  return {
    ...remote,
    profile: Object.fromEntries(profileFields.map((key) => [key, remote.profile[key] || local.profile[key]])) as FounderProfile,
    projects: byId(remote.projects, local.projects),
    skills: byId(remote.skills, local.skills).map((skill) => ({ ...skill, versionId: skill.versionId ?? crypto.randomUUID(), versionNumber: skill.versionNumber ?? 1 })),
    drafts: byId(remote.drafts, local.drafts),
    onboardingComplete: remote.onboardingComplete || local.onboardingComplete,
    accountType: remote.accountType ?? local.accountType,
  };
}

