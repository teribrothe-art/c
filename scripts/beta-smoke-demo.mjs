#!/usr/bin/env node
/**
 * 데모 모드 E2E 플로우 검증 (Node에서 순수 로직 시뮬레이션)
 * 실행: node scripts/beta-smoke-demo.mjs
 */

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(msg);
  }
};

function normalizeInviteCode(raw) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function resolveInvitationStatus(invitation) {
  if (invitation.status === 'used') return 'used';
  if (new Date(invitation.expires_at).getTime() < Date.now()) return 'expired';
  return invitation.status === 'expired' ? 'expired' : 'pending';
}

function simulateInviteRedeem({ invitation, customerId, treatments }) {
  if (resolveInvitationStatus(invitation) !== 'pending') {
    throw new Error('invalid invite');
  }

  invitation.status = 'used';
  invitation.used_by = customerId;

  const treatment = treatments.find((t) => t.id === invitation.treatment_id);

  if (treatment) {
    treatment.customer_id = customerId;
  }

  return { invitation, treatment };
}

function simulatePaymentRequest(treatment) {
  if (!treatment.customer_id) {
    throw new Error('customer not linked');
  }

  if (!treatment.price || treatment.price <= 0) {
    throw new Error('price missing');
  }

  treatment.payment_status = 'payment_requested';
  return treatment;
}

function simulateCustomerPay(treatment) {
  if (treatment.payment_status !== 'payment_requested') {
    throw new Error('not requested');
  }

  treatment.payment_status = 'escrow';
  treatment.paid_at = new Date().toISOString();
  return treatment;
}

function run() {
  const designerId = 'demo-designer-local';
  const customerId = 'demo-customer-new';

  const treatment = {
    id: 'demo-treatment-beta-1',
    designer_id: designerId,
    customer_id: null,
    customer_name: '베타고객',
    price: 180000,
    payment_status: 'pending',
  };

  const invitation = {
    id: 'inv-1',
    invite_code: 'BETA01',
    designer_id: designerId,
    treatment_id: treatment.id,
    customer_name: '베타고객',
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  const treatments = [treatment];

  assert(normalizeInviteCode(' beta-01 ') === 'BETA01', 'invite normalize');

  const redeemed = simulateInviteRedeem({ invitation, customerId, treatments });
  assert(redeemed.treatment.customer_id === customerId, 'treatment linked after redeem');
  assert(invitation.status === 'used', 'invitation used');

  const requested = simulatePaymentRequest(treatment);
  assert(requested.payment_status === 'payment_requested', 'payment requested');

  const paid = simulateCustomerPay(treatment);
  assert(paid.payment_status === 'escrow', 'payment escrow');

  console.log('✅ beta-smoke-demo: invite → link → payment request → pay OK');
}

try {
  run();
} catch (error) {
  console.error('❌ beta-smoke-demo failed:', error.message);
  process.exit(1);
}
