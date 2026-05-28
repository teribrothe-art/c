import AsyncStorage from '@react-native-async-storage/async-storage';

import { isPrivateOrNasEndpoint } from './api/endpoint-policy';
import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { addNotification } from './notifications';
import { supabase } from './supabase';
import { getTreatmentById, Treatment, updateTreatment } from './treatments';

const DEMO_INVITATIONS_KEY = 'hair-diary-customer-invitations';
const DEMO_RELATIONSHIPS_KEY = 'hair-diary-designer-customer-relationships';

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** I,O,0,1 제외 — generate_invite_code와 동일 */
const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const INVITE_VALID_DAYS = 7;

const NON_INVITE_URL_PREFIXES = ['http://', 'https://', 'exp://', 'exps://'];

export function isValidInviteCodeFormat(code: string) {
  return INVITE_CODE_PATTERN.test(code);
}

function looksLikeDevOrExpoUrl(payload: string) {
  const trimmed = payload.trim();
  const lower = trimmed.toLowerCase();

  if (isPrivateOrNasEndpoint(trimmed)) {
    return true;
  }

  return (
    NON_INVITE_URL_PREFIXES.some((prefix) => lower.startsWith(prefix)) ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('exp.direct') ||
    lower.includes('/_expo/')
  );
}

export type InvitationStatus = 'pending' | 'used' | 'expired';

export type CustomerInvitation = {
  id: string;
  invite_code: string;
  designer_id: string;
  treatment_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: InvitationStatus;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
};

export type DesignerCustomerRelationship = {
  id: string;
  designer_id: string;
  customer_id: string;
  first_treatment_date: string | null;
  total_treatments: number;
  total_amount: number;
  status: 'active' | 'inactive';
  created_at: string;
};

export type InviteValidationResult =
  | {
      valid: true;
      invitation: CustomerInvitation;
      designerName: string;
    }
  | {
      valid: false;
      reason: 'invalid' | 'expired' | 'used';
      message: string;
    };

export type DesignerClientListItem = {
  key: string;
  customerName: string;
  treatmentTitle: string;
  treatmentDate: string;
  treatmentId: string;
  inviteCode?: string;
  inviteStatus?: InvitationStatus;
  invitationId?: string;
  isRegistered: boolean;
  treatment?: Treatment;
};

const invitationSelect =
  'id, invite_code, designer_id, treatment_id, customer_name, customer_phone, status, expires_at, used_at, used_by, created_at';

const demoInvitations: CustomerInvitation[] = [];
const demoRelationships: DesignerCustomerRelationship[] = [];

/** 입력란용 — 허용 문자만 남기고 6자리까지 (미완성 입력 가능) */
export function formatInviteCodeInput(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/gi, '')
    .slice(0, 6);
}

export function normalizeInviteCode(raw: string) {
  return formatInviteCodeInput(raw);
}

/** 저장·QR·딥링크용 — 유효한 6자리만 반환, 아니면 빈 문자열 */
export function sanitizeInviteCode(raw: string) {
  const code = formatInviteCodeInput(raw);

  return isValidInviteCodeFormat(code) ? code : '';
}

export function buildInviteDeepLink(code: string) {
  return `hairdiaryapp://invite/${normalizeInviteCode(code)}`;
}

/** QR 스캔용 — 딥링크(권장) 또는 6자리 코드 */
export function buildInviteQrPayload(code: string) {
  const normalized = normalizeInviteCode(code);

  return normalized ? buildInviteDeepLink(normalized) : '';
}

function extractInviteCodeSegment(segment: string) {
  const cleaned = segment.split(/[?#]/)[0]?.replace(/[^A-HJ-NP-Z2-9]/gi, '') ?? '';

  return sanitizeInviteCode(cleaned);
}

export function parseInviteCodeFromQrPayload(payload: string) {
  const trimmed = payload.trim();

  if (!trimmed || looksLikeDevOrExpoUrl(trimmed)) {
    return '';
  }

  const compact = trimmed.replace(/\s+/g, '');

  const deepLinkMatch = compact.match(/hairdiaryapp:\/\/invite\/([A-HJ-NP-Z2-9]{6})/i);

  if (deepLinkMatch?.[1]) {
    return sanitizeInviteCode(deepLinkMatch[1]);
  }

  if (compact.includes('invite/')) {
    const part = compact.split(/invite\//i)[1] ?? '';
    const fromPath = extractInviteCodeSegment(part);

    if (fromPath) {
      return fromPath;
    }
  }

  try {
    if (trimmed.startsWith('hairdiaryapp://')) {
      const url = new URL(trimmed);
      const segment = url.pathname.replace(/^\//, '').split('/');

      if (segment[0] === 'invite' && segment[1]) {
        return extractInviteCodeSegment(segment[1]);
      }
    }
  } catch {
    // URL 파싱 실패 시 아래 패턴으로 재시도
  }

  const inlineMatch = compact.match(/(?:^|[^A-HJ-NP-Z2-9])([A-HJ-NP-Z2-9]{6})(?:[^A-HJ-NP-Z2-9]|$)/i);

  if (inlineMatch?.[1]) {
    return sanitizeInviteCode(inlineMatch[1]);
  }

  if (/^[A-HJ-NP-Z2-9]{6}$/i.test(compact)) {
    return sanitizeInviteCode(compact);
  }

  return '';
}

type ValidateInviteCodeRpcResult = {
  valid: boolean;
  reason?: 'invalid' | 'expired' | 'used';
  message?: string;
  designer_name?: string;
  invitation?: CustomerInvitation;
};

async function validateInviteCodeViaRpc(code: string): Promise<InviteValidationResult | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc('validate_invite_code', { p_code: code });

  if (error) {
    const message = error.message ?? '';

    if (message.includes('validate_invite_code') || message.includes('Could not find the function')) {
      return null;
    }

    throw toAppError(error);
  }

  const result = data as ValidateInviteCodeRpcResult | null;

  if (!result || typeof result.valid !== 'boolean') {
    return null;
  }

  if (!result.valid) {
    return {
      valid: false,
      reason: result.reason ?? 'invalid',
      message: result.message ?? '코드가 올바르지 않아요',
    };
  }

  if (!result.invitation) {
    return { valid: false, reason: 'invalid', message: '코드가 올바르지 않아요' };
  }

  return {
    valid: true,
    invitation: normalizeInvitationRow(result.invitation),
    designerName: result.designer_name?.trim() || '디자이너',
  };
}

export function generateInviteCodeLocal(existing: Set<string>) {
  let code = '';

  do {
    code = '';

    for (let index = 0; index < 6; index += 1) {
      const char = INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
      code += char;
    }
  } while (existing.has(code));

  return code;
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeInvitationRow(row: CustomerInvitation): CustomerInvitation {
  const rawStatus = row.status as InvitationStatus | 'active';
  const status: InvitationStatus = rawStatus === 'active' ? 'pending' : rawStatus;

  return { ...row, status };
}

function resolveInvitationStatus(invitation: CustomerInvitation): InvitationStatus {
  const normalized = normalizeInvitationRow(invitation);

  if (normalized.status === 'used') {
    return 'used';
  }

  if (new Date(normalized.expires_at).getTime() < Date.now()) {
    return 'expired';
  }

  return normalized.status === 'expired' ? 'expired' : 'pending';
}

async function readDemoInvitations() {
  const raw = await AsyncStorage.getItem(DEMO_INVITATIONS_KEY);
  const parsed = raw ? (JSON.parse(raw) as CustomerInvitation[]) : [...demoInvitations];
  const normalized = parsed.map((item) => normalizeInvitationRow(item));
  demoInvitations.length = 0;
  demoInvitations.push(...normalized);
  return demoInvitations;
}

async function writeDemoInvitations(items: CustomerInvitation[]) {
  demoInvitations.length = 0;
  demoInvitations.push(...items);
  await AsyncStorage.setItem(DEMO_INVITATIONS_KEY, JSON.stringify(items));
}

async function readDemoRelationships() {
  const raw = await AsyncStorage.getItem(DEMO_RELATIONSHIPS_KEY);
  const parsed = raw ? (JSON.parse(raw) as DesignerCustomerRelationship[]) : [...demoRelationships];
  demoRelationships.length = 0;
  demoRelationships.push(...parsed);
  return demoRelationships;
}

async function writeDemoRelationships(items: DesignerCustomerRelationship[]) {
  demoRelationships.length = 0;
  demoRelationships.push(...items);
  await AsyncStorage.setItem(DEMO_RELATIONSHIPS_KEY, JSON.stringify(items));
}

async function applyInvitationUsedSideEffects(invitation: CustomerInvitation, customerId: string) {
  const relationships = await readDemoRelationships();

  if (!relationships.some((item) => item.designer_id === invitation.designer_id && item.customer_id === customerId)) {
    relationships.unshift({
      id: `demo-rel-${Date.now()}`,
      designer_id: invitation.designer_id,
      customer_id: customerId,
      first_treatment_date: null,
      total_treatments: 0,
      total_amount: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    });
    await writeDemoRelationships(relationships);
  }

  if (invitation.treatment_id) {
    await updateTreatment(invitation.treatment_id, { customer_id: customerId });
  }
}

async function fetchDesignerName(designerId: string) {
  if (isDemoAuthMode || !supabase) {
    const usersRaw = await AsyncStorage.getItem('hair-diary-demo-users');
    const users = usersRaw ? (JSON.parse(usersRaw) as { id: string; name: string | null }[]) : [];
    return users.find((user) => user.id === designerId)?.name ?? '디자이너';
  }

  const { data } = await supabase.from('profiles').select('name').eq('id', designerId).maybeSingle();

  return data?.name?.trim() || '디자이너';
}

export async function validateInviteCode(rawCode: string): Promise<InviteValidationResult> {
  const code = sanitizeInviteCode(rawCode);

  if (code.length !== 6) {
    return { valid: false, reason: 'invalid', message: '코드가 올바르지 않아요' };
  }

  if (!isDemoAuthMode && supabase) {
    const rpcResult = await validateInviteCodeViaRpc(code);

    if (rpcResult) {
      return rpcResult;
    }
  }

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoInvitations();
    const invitation = items.find((item) => item.invite_code === code);

    if (!invitation) {
      return {
        valid: false,
        reason: 'invalid',
        message:
          '등록되지 않은 코드예요. 디자이너가 방금 만든 QR인지 확인하거나, Supabase 연결 후 다시 시도해주세요.',
      };
    }

    const status = resolveInvitationStatus(invitation);

    if (status === 'used') {
      return { valid: false, reason: 'used', message: '이미 사용된 코드예요' };
    }

    if (status === 'expired') {
      return {
        valid: false,
        reason: 'expired',
        message: '코드가 만료되었어요. 디자이너에게 새 코드를 요청하세요',
      };
    }

    const designerName = await fetchDesignerName(invitation.designer_id);
    return { valid: true, invitation: normalizeInvitationRow(invitation), designerName };
  }

  const rpcFallback = await validateInviteCodeViaRpc(code);

  if (rpcFallback) {
    return rpcFallback;
  }

  const { data, error } = await supabase
    .from('customer_invitations')
    .select(invitationSelect)
    .eq('invite_code', code)
    .maybeSingle();

  if (error) {
    throw toAppError(error);
  }

  if (!data) {
    return { valid: false, reason: 'invalid', message: '코드가 올바르지 않아요' };
  }

  const invitation = normalizeInvitationRow(data as CustomerInvitation);
  const status = resolveInvitationStatus(invitation);

  if (status === 'used') {
    return { valid: false, reason: 'used', message: '이미 사용된 코드예요' };
  }

  if (status === 'expired') {
    return {
      valid: false,
      reason: 'expired',
      message: '코드가 만료되었어요. 디자이너에게 새 코드를 요청하세요',
    };
  }

  const designerName = await fetchDesignerName(invitation.designer_id);
  return { valid: true, invitation, designerName };
}

export async function createCustomerInvitation(input: {
  treatmentId: string;
  customerName: string;
  customerPhone?: string;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('디자이너만 초대 코드를 만들 수 있습니다.');
  }

  const customerName = input.customerName.trim();

  if (!customerName) {
    throw new Error('고객 이름을 입력해주세요.');
  }

  const { treatment } = await getTreatmentById(input.treatmentId);

  if (!treatment || treatment.designer_id !== user.id) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  const expiresAt = addDaysIso(INVITE_VALID_DAYS);

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoInvitations();
    const existingCodes = new Set(items.map((item) => item.invite_code));
    const invitation: CustomerInvitation = {
      id: `demo-invite-${Date.now()}`,
      invite_code: generateInviteCodeLocal(existingCodes),
      designer_id: user.id,
      treatment_id: input.treatmentId,
      customer_name: customerName,
      customer_phone: input.customerPhone?.trim() || null,
      status: 'pending',
      expires_at: expiresAt,
      used_at: null,
      used_by: null,
      created_at: new Date().toISOString(),
    };

    items.unshift(invitation);
    await writeDemoInvitations(items.slice(0, 200));
    return invitation;
  }

  let inviteCode = '';

  const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code');

  if (codeError || !codeData) {
    const { data: existingRows, error: existingError } = await supabase
      .from('customer_invitations')
      .select('invite_code')
      .limit(500);

    if (existingError) {
      throw toAppError(codeError ?? existingError);
    }

    const existingCodes = new Set((existingRows ?? []).map((row) => row.invite_code));
    inviteCode = generateInviteCodeLocal(existingCodes);
  } else {
    inviteCode = String(codeData);
  }

  const { data, error } = await supabase
    .from('customer_invitations')
    .insert({
      invite_code: inviteCode,
      designer_id: user.id,
      treatment_id: input.treatmentId,
      customer_name: customerName,
      customer_phone: input.customerPhone?.trim() || null,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select(invitationSelect)
    .single();

  if (error) {
    throw toAppError(error);
  }

  return normalizeInvitationRow(data as CustomerInvitation);
}

export async function getPendingInvitationForTreatment(treatmentId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoInvitations();
    return (
      items.find(
        (item) =>
          item.treatment_id === treatmentId &&
          item.designer_id === user.id &&
          resolveInvitationStatus(item) === 'pending',
      ) ?? null
    );
  }

  const { data, error } = await supabase
    .from('customer_invitations')
    .select(invitationSelect)
    .eq('treatment_id', treatmentId)
    .eq('designer_id', user.id)
    .in('status', ['pending', 'active'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toAppError(error);
  }

  return data ? normalizeInvitationRow(data as CustomerInvitation) : null;
}

/** @deprecated getPendingInvitationForTreatment 사용 */
export const getActiveInvitationForTreatment = getPendingInvitationForTreatment;

export async function redeemInviteCode(rawCode: string, customerId: string) {
  const validation = await validateInviteCode(rawCode);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const invitation = validation.invitation;
  const now = new Date().toISOString();

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoInvitations();
    const index = items.findIndex((item) => item.id === invitation.id);

    if (index < 0) {
      throw new Error('초대 코드를 찾을 수 없습니다.');
    }

    items[index] = {
      ...items[index],
      status: 'used',
      used_at: now,
      used_by: customerId,
    };

    await writeDemoInvitations(items);
    await applyInvitationUsedSideEffects(items[index], customerId);

    await addNotification({
      user_id: invitation.designer_id,
      type: 'invite_customer_joined',
      title: '고객 가입',
      message: `🎉 ${invitation.customer_name ?? '고객'}님이 가입하셨어요!`,
      treatment_id: invitation.treatment_id ?? '',
      href: '/designer/clients',
    });

    return {
      invitation: items[index],
      designerName: validation.designerName,
      customerName: invitation.customer_name ?? '고객',
    };
  }

  const { data, error } = await supabase
    .from('customer_invitations')
    .update({
      status: 'used',
      used_at: now,
      used_by: customerId,
    })
    .eq('id', invitation.id)
    .in('status', ['pending', 'active'])
    .select(invitationSelect)
    .single();

  if (error) {
    throw toAppError(error);
  }

  const redeemed = normalizeInvitationRow(data as CustomerInvitation);

  const { error: applyError } = await supabase.rpc('apply_customer_invite', {
    p_invitation_id: redeemed.id,
    p_customer_id: customerId,
  });

  if (applyError && !applyError.message.includes('Could not find the function')) {
    throw toAppError(applyError);
  }

  return {
    invitation: redeemed,
    designerName: validation.designerName,
    customerName: invitation.customer_name ?? '고객',
  };
}

export async function getDesignerClientListItems(): Promise<DesignerClientListItem[]> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    return [];
  }

  const { getDesignerTreatments } = await import('./treatments');
  const { treatments } = await getDesignerTreatments();

  let invitations: CustomerInvitation[] = [];

  if (isDemoAuthMode || !supabase) {
    invitations = await readDemoInvitations();
    invitations = invitations.filter((item) => item.designer_id === user.id);
  } else {
    const { data, error } = await supabase
      .from('customer_invitations')
      .select(invitationSelect)
      .eq('designer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw toAppError(error);
    }

    invitations = (data ?? []).map((row) => normalizeInvitationRow(row as CustomerInvitation));
  }

  const treatmentIdsWithInvite = new Set<string>();
  const rows: DesignerClientListItem[] = [];

  for (const invitation of invitations) {
    const status = resolveInvitationStatus(invitation);
    const treatment = invitation.treatment_id
      ? treatments.find((item) => item.id === invitation.treatment_id)
      : undefined;

    if (invitation.treatment_id) {
      treatmentIdsWithInvite.add(invitation.treatment_id);
    }

    rows.push({
      key: `invite-${invitation.id}`,
      customerName: invitation.customer_name ?? '고객',
      treatmentTitle: treatment?.treatment_title ?? '시술',
      treatmentDate: treatment?.treatment_date ?? invitation.created_at.slice(0, 10),
      treatmentId: invitation.treatment_id ?? '',
      inviteCode: invitation.invite_code,
      inviteStatus: status,
      invitationId: invitation.id,
      isRegistered: status === 'used',
      treatment,
    });
  }

  for (const treatment of treatments) {
    if (treatmentIdsWithInvite.has(treatment.id)) {
      continue;
    }

    rows.push({
      key: `treatment-${treatment.id}`,
      customerName: treatment.customer_name || '고객',
      treatmentTitle: treatment.treatment_title,
      treatmentDate: treatment.treatment_date,
      treatmentId: treatment.id,
      isRegistered: Boolean(treatment.customer_id),
      treatment,
    });
  }

  return rows.sort((a, b) => b.treatmentDate.localeCompare(a.treatmentDate));
}

export async function renewCustomerInvitation(input: {
  invitationId: string;
  treatmentId: string;
  customerName?: string;
  customerPhone?: string;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('디자이너만 초대 코드를 다시 발급할 수 있습니다.');
  }

  const { treatment } = await getTreatmentById(input.treatmentId);

  if (!treatment || treatment.designer_id !== user.id) {
    throw new Error('시술 기록을 찾을 수 없습니다.');
  }

  const customerName = (input.customerName?.trim() || treatment.customer_name?.trim() || '').trim();

  if (!customerName) {
    throw new Error('고객 이름을 입력해주세요.');
  }

  await expireInvitation(input.invitationId);

  return createCustomerInvitation({
    treatmentId: input.treatmentId,
    customerName,
    customerPhone: input.customerPhone,
  });
}

export async function expireInvitation(invitationId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('권한이 없습니다.');
  }

  if (isDemoAuthMode || !supabase) {
    const items = await readDemoInvitations();
    const index = items.findIndex((item) => item.id === invitationId && item.designer_id === user.id);

    if (index >= 0) {
      items[index] = { ...items[index], status: 'expired' };
      await writeDemoInvitations(items);
    }

    return;
  }

  await supabase
    .from('customer_invitations')
    .update({ status: 'expired' })
    .eq('id', invitationId)
    .eq('designer_id', user.id);
}

export type RedeemInviteSummary = Awaited<ReturnType<typeof redeemInviteCode>>;
