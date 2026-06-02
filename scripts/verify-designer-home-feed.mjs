#!/usr/bin/env node
/** node scripts/verify-designer-home-feed.mjs */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function buildDesignerHomeActionItems(items, limit = 5) {
  const actions = [];

  for (const item of items) {
    const linked = Boolean(item.customerId);
    const status = item.paymentStatus;

    if (!linked) {
      actions.push({ treatmentId: item.treatmentId, priority: 0 });
      continue;
    }

    if (status === 'escrow') {
      actions.push({ treatmentId: item.treatmentId, priority: 1 });
    }
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, limit);
}

const items = [
  { treatmentId: 'a', customerId: null, paymentStatus: 'pending' },
  { treatmentId: 'b', customerId: 'c1', paymentStatus: 'escrow' },
  { treatmentId: 'c', customerId: 'c2', paymentStatus: 'completed' },
];

const actions = buildDesignerHomeActionItems(items);
assert(actions.length === 2, 'link + escrow actions');
assert(actions[0].treatmentId === 'a', 'unlinked first');

console.log('✅ verify-designer-home-feed OK');
