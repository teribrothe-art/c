import { getCurrentUser } from './auth';
import {
  getDesignerClientListItems,
  type DesignerClientListItem,
} from './customer-invitations';
import { invalidateDesignerWorkspaceCache } from './designer-workspace-cache';
import {
  classifyReservationStatus,
  countReservationsByFilter,
  formatReservationDate,
  matchesReservationFilter,
  todayDateKey,
  type ReservationFilter,
  type ReservationStatus,
} from './org-reservations';
import { getTreatmentById, updateTreatment, type Treatment } from './treatments';

export type DesignerReservationItem = {
  key: string;
  treatmentId: string;
  customerName: string;
  treatmentTitle: string;
  treatmentDate: string;
  treatmentType: string;
  bookingTimeLabel: string | null;
  isCustomerBooking: boolean;
  isCancelled: boolean;
  reservationStatus: ReservationStatus;
  statusLabel: string;
  treatment: Treatment;
};

export {
  countReservationsByFilter,
  formatReservationDate,
  matchesReservationFilter,
  todayDateKey,
  type ReservationFilter,
};

const BOOKING_NOTE_PREFIX = '고객 예약 ·';
const BOOKING_CANCEL_MARKER = '[예약 취소]';

export function isCustomerBookingTreatment(treatment: Treatment | null | undefined) {
  return Boolean(treatment?.notes?.includes(BOOKING_NOTE_PREFIX));
}

export function isCancelledBookingTreatment(treatment: Treatment | null | undefined) {
  return Boolean(treatment?.notes?.includes(BOOKING_CANCEL_MARKER));
}

export function parseBookingTimeLabel(notes?: string | null) {
  const match = notes?.match(/고객 예약 · (\d{2}:\d{2})/);

  return match?.[1] ?? null;
}

function toReservationItem(
  item: DesignerClientListItem,
  todayKey: string,
): DesignerReservationItem | null {
  const treatment = item.treatment;

  if (!treatment || !item.treatmentId || !item.isRegistered) {
    return null;
  }

  if (isCancelledBookingTreatment(treatment)) {
    return null;
  }

  const { reservationStatus, statusLabel } = classifyReservationStatus(
    item.treatmentDate,
    treatment.payment_status,
    todayKey,
  );

  return {
    key: item.key,
    treatmentId: item.treatmentId,
    customerName: item.customerName,
    treatmentTitle: item.treatmentTitle,
    treatmentDate: item.treatmentDate,
    treatmentType: treatment.treatment_type,
    bookingTimeLabel: parseBookingTimeLabel(treatment.notes),
    isCustomerBooking: isCustomerBookingTreatment(treatment),
    isCancelled: false,
    reservationStatus,
    statusLabel,
    treatment,
  };
}

export async function getDesignerReservationItems(): Promise<DesignerReservationItem[]> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    return [];
  }

  const todayKey = todayDateKey();
  const clientItems = await getDesignerClientListItems();

  return clientItems
    .map((item) => toReservationItem(item, todayKey))
    .filter((item): item is DesignerReservationItem => Boolean(item))
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

export function countTodayReservations(items: DesignerReservationItem[]) {
  const todayKey = todayDateKey();

  return items.filter((item) => item.treatmentDate === todayKey).length;
}

export function countUpcomingCustomerBookings(items: DesignerReservationItem[]) {
  const todayKey = todayDateKey();

  return items.filter(
    (item) => item.isCustomerBooking && item.treatmentDate >= todayKey,
  ).length;
}

export async function cancelDesignerReservation(treatmentId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    throw new Error('디자이너만 예약을 취소할 수 있습니다.');
  }

  const { treatment } = await getTreatmentById(treatmentId);

  if (!treatment || treatment.designer_id !== user.id) {
    throw new Error('예약을 찾을 수 없습니다.');
  }

  if (!isCustomerBookingTreatment(treatment)) {
    throw new Error('고객 앱 예약만 취소할 수 있어요.');
  }

  if (isCancelledBookingTreatment(treatment)) {
    throw new Error('이미 취소된 예약이에요.');
  }

  const todayKey = todayDateKey();

  if (treatment.treatment_date < todayKey) {
    throw new Error('지난 예약은 취소할 수 없어요.');
  }

  const nextNotes = `${treatment.notes ?? BOOKING_NOTE_PREFIX} · ${BOOKING_CANCEL_MARKER}`;

  await updateTreatment(treatmentId, { notes: nextNotes });
  invalidateDesignerWorkspaceCache();
}
