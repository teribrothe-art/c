import type { OrgScope } from './org-access';
import { getOrgClientListItems, type OrgClientListItem } from './org-client-list';
import type { PaymentStatus } from './payment-status';

export type ReservationFilter = 'today' | 'upcoming' | 'completed' | 'all';

export type ReservationStatus = 'today' | 'upcoming' | 'completed' | 'pending';

export type OrgReservationItem = OrgClientListItem & {
  reservationStatus: ReservationStatus;
  statusLabel: string;
};

export function todayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isSettledPayment(status: PaymentStatus | null | undefined) {
  return status === 'completed' || status === 'escrow';
}

export function classifyReservationStatus(
  treatmentDate: string,
  paymentStatus: PaymentStatus | null | undefined,
  todayKey = todayDateKey(),
): { reservationStatus: ReservationStatus; statusLabel: string } {
  if (treatmentDate > todayKey) {
    return { reservationStatus: 'upcoming', statusLabel: '예정' };
  }

  if (treatmentDate === todayKey) {
    if (isSettledPayment(paymentStatus)) {
      return { reservationStatus: 'completed', statusLabel: '오늘 완료' };
    }

    return { reservationStatus: 'today', statusLabel: '오늘 예약' };
  }

  if (paymentStatus === 'payment_requested') {
    return { reservationStatus: 'pending', statusLabel: '결제 대기' };
  }

  if (isSettledPayment(paymentStatus)) {
    return { reservationStatus: 'completed', statusLabel: '완료' };
  }

  return { reservationStatus: 'completed', statusLabel: '지난 예약' };
}

export function matchesReservationFilter(
  item: OrgReservationItem,
  filter: ReservationFilter,
): boolean {
  switch (filter) {
    case 'today':
      return item.reservationStatus === 'today' || item.statusLabel === '오늘 완료';
    case 'upcoming':
      return item.reservationStatus === 'upcoming';
    case 'completed':
      return (
        item.reservationStatus === 'completed' ||
        item.reservationStatus === 'pending' ||
        item.statusLabel === '지난 예약'
      );
    case 'all':
      return true;
  }
}

export async function getOrgReservationItems(scope: OrgScope): Promise<OrgReservationItem[]> {
  const todayKey = todayDateKey();
  const rows = await getOrgClientListItems(scope);

  return rows
    .filter((item) => item.isRegistered && item.treatmentId)
    .map((item) => {
      const { reservationStatus, statusLabel } = classifyReservationStatus(
        item.treatmentDate,
        item.treatment?.payment_status,
        todayKey,
      );

      return {
        ...item,
        reservationStatus,
        statusLabel,
      };
    })
    .sort((a, b) => {
      const dateCompare = a.treatmentDate.localeCompare(b.treatmentDate);

      if (a.treatmentDate >= todayKey && b.treatmentDate >= todayKey) {
        return dateCompare;
      }

      if (a.treatmentDate < todayKey && b.treatmentDate < todayKey) {
        return b.treatmentDate.localeCompare(a.treatmentDate);
      }

      if (a.treatmentDate >= todayKey) {
        return -1;
      }

      if (b.treatmentDate >= todayKey) {
        return 1;
      }

      return dateCompare;
    });
}

export function countReservationsByFilter(items: OrgReservationItem[]) {
  return {
    today: items.filter((item) => matchesReservationFilter(item, 'today')).length,
    upcoming: items.filter((item) => matchesReservationFilter(item, 'upcoming')).length,
    completed: items.filter((item) => matchesReservationFilter(item, 'completed')).length,
    all: items.length,
  };
}

export function formatReservationDate(date: string) {
  return date.replaceAll('-', '.');
}
