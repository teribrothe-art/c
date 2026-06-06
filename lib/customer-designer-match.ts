import {
  getAdminDesignerRoster,
  type OrgDesignerRosterEntry,
} from './org-designer-roster';
import {
  inferCustomerHomeStoreIds,
  loadBookableDesignerProfile,
  type BookableDesignerProfile,
  type DesignerMatchResult,
} from './customer-booking';
import type { Treatment } from './treatments';

type CustomerStyleProfile = {
  typeCounts: Map<string, number>;
  titleTokens: Set<string>;
  primaryTypes: string[];
  summaryLabel: string;
};

function tokenizeTitle(title: string) {
  return title
    .split(/[\s·+/,-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildCustomerStyleProfile(treatments: Treatment[]): CustomerStyleProfile {
  const typeCounts = new Map<string, number>();
  const titleTokens = new Set<string>();

  for (const treatment of treatments) {
    const type = treatment.treatment_type?.trim();

    if (type) {
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }

    for (const token of tokenizeTitle(treatment.treatment_title ?? '')) {
      titleTokens.add(token.toLowerCase());
    }
  }

  const primaryTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  const summaryLabel =
    primaryTypes.length > 0 ? primaryTypes.join(' · ') : '기록된 시술 이력';

  return {
    typeCounts,
    titleTokens,
    primaryTypes,
    summaryLabel,
  };
}

function scoreDesignerMatch(
  customer: CustomerStyleProfile,
  designer: BookableDesignerProfile,
) {
  let score = 0;
  const matchedTypes: string[] = [];

  for (const type of customer.primaryTypes) {
    if (designer.specialtyTypes.includes(type)) {
      score += 40;
      matchedTypes.push(type);
    }
  }

  for (const type of customer.typeCounts.keys()) {
    if (designer.specialtyTypes.includes(type)) {
      score += 10;
    }
  }

  for (const title of designer.recentTitles) {
    for (const token of tokenizeTitle(title)) {
      if (customer.titleTokens.has(token.toLowerCase())) {
        score += 8;
      }
    }
  }

  score += Math.min(designer.treatmentCount, 120) / 10;

  const matchReason =
    matchedTypes.length > 0
      ? `최근 ${customer.summaryLabel} 스타일과 맞는 ${matchedTypes.join('·')} 경험이 많아요`
      : designer.specialtyTypes.length > 0
        ? `${designer.specialtyTypes.slice(0, 2).join('·')} 전문 디자이너예요`
        : '다양한 시술 이력을 보유하고 있어요';

  return { score, matchReason };
}

export type CustomerDesignerMatchSummary = {
  styleSummary: string;
  matches: DesignerMatchResult[];
};

export async function matchDesignersForCustomer(
  treatments: Treatment[],
  options?: { otherRegionsOnly?: boolean; limit?: number },
): Promise<CustomerDesignerMatchSummary> {
  const customerProfile = buildCustomerStyleProfile(treatments);
  const homeStoreIds = inferCustomerHomeStoreIds(treatments);
  const roster = getAdminDesignerRoster();
  const limit = options?.limit ?? 6;
  const otherRegionsOnly = options?.otherRegionsOnly ?? true;

  const candidates = roster.filter((designer) => {
    if (!otherRegionsOnly) {
      return true;
    }

    if (homeStoreIds.size === 0) {
      return true;
    }

    return !homeStoreIds.has(designer.storeId);
  });

  const profiles = await Promise.all(
    candidates.map(async (designer: OrgDesignerRosterEntry) => {
      const profile = await loadBookableDesignerProfile(designer);
      const { score, matchReason } = scoreDesignerMatch(customerProfile, profile);

      return {
        ...profile,
        matchScore: score,
        matchReason,
        isOtherRegion: homeStoreIds.size > 0 && !homeStoreIds.has(designer.storeId),
      } satisfies DesignerMatchResult;
    }),
  );

  const matches = profiles
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  const styleSummary =
    treatments.length === 0
      ? '아직 시술 기록이 없어 인기 디자이너를 추천해요'
      : `지금까지 ${customerProfile.summaryLabel} 위주로 관리하셨네요. 같은 스타일을 잘 다루는 디자이너를 골랐어요`;

  return {
    styleSummary,
    matches,
  };
}

export async function matchNearbyDesignersForStore(
  storeId: string,
  treatments: Treatment[],
  limit = 8,
) {
  const roster = getAdminDesignerRoster().filter((designer) => designer.storeId === storeId);
  const customerProfile = buildCustomerStyleProfile(treatments);

  const profiles = await Promise.all(
    roster.map(async (designer) => {
      const profile = await loadBookableDesignerProfile(designer);
      const { score, matchReason } = scoreDesignerMatch(customerProfile, profile);

      return {
        ...profile,
        matchScore: score,
        matchReason,
        isOtherRegion: false,
      } satisfies DesignerMatchResult;
    }),
  );

  return profiles.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
