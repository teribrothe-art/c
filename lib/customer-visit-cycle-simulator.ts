import {
  dailyVisitTargetCount,
  daysUntilNextVisit,
  hashVisitSeed,
  newCustomersQuota,
  pickTreatmentTemplateForVisit,
} from './customer-treatment-patterns';
import {
  getTreatmentTemplatesForRegion,
  priceForRegionalTreatment,
} from './regional-treatment-pricing';

export type SimulatedVisit = {
  date: string;
  customerId: string;
  customerIndex: number;
  treatmentType: string;
  treatmentTitle: string;
  price: number;
  visitIndex: number;
};

export type VisitCycleSimulationOptions = {
  customerIds: string[];
  historyYears: number;
  dailyMin: number;
  dailyMax: number;
  priceRegion?: string;
  referenceDate?: Date;
};

type CustomerVisitState = {
  customerId: string;
  customerIndex: number;
  lastTreatmentType: string | null;
  nextDueDate: string | null;
  visitCount: number;
  isRegular: boolean;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function monthsBetween(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function getSeedStartDate(historyYears: number, reference: Date) {
  const start = new Date(reference);
  start.setFullYear(start.getFullYear() - historyYears);
  start.setHours(12, 0, 0, 0);

  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function visitPriority(state: CustomerVisitState, today: string) {
  if (!state.isRegular) {
    return `0-${String(state.customerIndex).padStart(4, '0')}`;
  }

  const due = state.nextDueDate ?? '9999-12-31';

  if (due <= today) {
    const overdueDays = Math.max(
      0,
      Math.floor(
        (new Date(`${today}T12:00:00`).getTime() - new Date(`${due}T12:00:00`).getTime()) / 86400000,
      ),
    );

    return `1-${String(999 - Math.min(overdueDays, 999)).padStart(3, '0')}-${due}`;
  }

  return `2-${due}`;
}

function sortByVisitPriority(states: CustomerVisitState[], today: string) {
  return [...states].sort((a, b) => visitPriority(a, today).localeCompare(visitPriority(b, today)));
}

function recordVisit(
  state: CustomerVisitState,
  treatmentDate: string,
  template: { type: string; title: string },
  price: number,
  visitSeq: number,
): SimulatedVisit {
  const revisitDays = daysUntilNextVisit(state.customerId, state.visitCount + 1, template.type);
  const nextDue = addDays(new Date(`${treatmentDate}T12:00:00`), revisitDays);

  state.lastTreatmentType = template.type;
  state.nextDueDate = formatDate(nextDue);
  state.visitCount += 1;
  state.isRegular = true;

  return {
    date: treatmentDate,
    customerId: state.customerId,
    customerIndex: state.customerIndex,
    treatmentType: template.type,
    treatmentTitle: template.title,
    price,
    visitIndex: visitSeq,
  };
}

/** 고객 시술·재방문 주기를 반영한 일별 방문 시뮬레이션 (시드·전국 집계 공통) */
export function forEachVisitInCycle(
  options: VisitCycleSimulationOptions,
  onVisit: (visit: SimulatedVisit) => void,
) {
  const referenceDate = options.referenceDate ?? new Date();
  const seedStartDate = getSeedStartDate(options.historyYears, referenceDate);
  const endDate = new Date(referenceDate);
  const templates = getTreatmentTemplatesForRegion(options.priceRegion ?? '전국');
  const priceRegion = options.priceRegion ?? '전국';

  const states: CustomerVisitState[] = options.customerIds.map((customerId, customerIndex) => ({
    customerId,
    customerIndex,
    lastTreatmentType: null,
    nextDueDate: null,
    visitCount: 0,
    isRegular: false,
  }));

  const inactiveQueue = [...states];
  let visitSeq = 0;
  let dayIndex = 0;

  for (let day = new Date(seedStartDate); day.getTime() <= endDate.getTime(); day = addDays(day, 1)) {
    const today = formatDate(day);
    const targetCount = dailyVisitTargetCount(dayIndex, options.dailyMin, options.dailyMax, today);
    const monthsElapsed = monthsBetween(seedStartDate, day);
    const scheduled: CustomerVisitState[] = [];
    const usedToday = new Set<string>();

    const scheduleCustomer = (state: CustomerVisitState) => {
      if (usedToday.has(state.customerId)) {
        return false;
      }

      scheduled.push(state);
      usedToday.add(state.customerId);

      return true;
    };

    for (const state of sortByVisitPriority(
      states.filter((item) => item.isRegular && item.nextDueDate && item.nextDueDate <= today),
      today,
    )) {
      if (scheduled.length >= targetCount) {
        break;
      }

      scheduleCustomer(state);
    }

    let newQuota = newCustomersQuota(dayIndex, monthsElapsed);

    while (newQuota > 0 && scheduled.length < targetCount && inactiveQueue.length > 0) {
      const state = inactiveQueue.shift();

      if (!state) {
        newQuota -= 1;
        continue;
      }

      if (scheduleCustomer(state)) {
        newQuota -= 1;
      }
    }

    for (const state of sortByVisitPriority(
      states.filter((item) => !usedToday.has(item.customerId)),
      today,
    )) {
      if (scheduled.length >= targetCount) {
        break;
      }

      scheduleCustomer(state);
    }

    scheduled.forEach((state, slotInDay) => {
      const template = pickTreatmentTemplateForVisit(templates, {
        customerId: state.customerId,
        visitCount: state.visitCount,
        globalSeq: visitSeq,
        lastTreatmentType: state.lastTreatmentType,
        isRegular: state.isRegular,
      });
      const price =
        priceForRegionalTreatment(priceRegion, [
          state.customerId,
          visitSeq,
          slotInDay,
          template.type,
        ]) + (hashVisitSeed(state.customerId, visitSeq) % 4) * 5_000;

      onVisit(recordVisit(state, today, template, price, visitSeq));
      visitSeq += 1;
    });

    dayIndex += 1;
  }
}

export function collectVisitsInCycle(options: VisitCycleSimulationOptions): SimulatedVisit[] {
  const visits: SimulatedVisit[] = [];

  forEachVisitInCycle(options, (visit) => {
    visits.push(visit);
  });

  return visits;
}
