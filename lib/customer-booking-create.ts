import { isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { supabase } from './supabase';
import { DEFAULT_TREATMENT_DURATION } from './treatment-options';
import { insertDemoTreatment, type Treatment } from './treatments';

type CreatePayload = {
  customerId: string;
  customerName: string;
  designerId: string;
  designerName: string;
  treatmentDate: string;
  treatmentType: string;
  treatmentTitle: string;
  bookingTimeLabel: string;
  duration?: string;
};

export async function createCustomerBookingTreatment(input: CreatePayload): Promise<Treatment> {
  const notes = `고객 예약 · ${input.bookingTimeLabel}`;

  const baseRow = {
    customer_id: input.customerId,
    designer_id: input.designerId,
    designer_name: input.designerName,
    customer_name: input.customerName,
    treatment_date: input.treatmentDate,
    treatment_type: input.treatmentType,
    treatment_title: input.treatmentTitle,
    products: null as string[] | null,
    technique: null as string | null,
    damage_level: null as number | null,
    duration: input.duration?.trim() || DEFAULT_TREATMENT_DURATION,
    designer_diagnosis: null as string | null,
    home_care: null as string | null,
    ai_insight: null as string | null,
    notes,
    price: null as number | null,
    payment_status: 'pending' as const,
    feedback_completed: false,
  };

  if (isDemoAuthMode || !supabase) {
    const treatment: Treatment = {
      id: `customer-booking-${Date.now()}`,
      ...baseRow,
      created_at: new Date().toISOString(),
    };

    await insertDemoTreatment(treatment);

    return treatment;
  }

  const { data, error } = await supabase
    .from('treatments')
    .insert({
      ...baseRow,
    })
    .select('*')
    .single();

  if (error) {
    throw toAppError(error);
  }

  return data as Treatment;
}
