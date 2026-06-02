import { getDesignerLinkedCustomerLoginSources } from './demo-designer-linked-customers';
import { searchRegisteredCustomers } from './registered-customers';

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

/** 디자이너 소속·데모 시드 고객 중 이름 일치 */
export function findLinkedCustomerForDesignerByName(
  designerId: string,
  customerName: string,
) {
  const normalized = normalizeName(customerName);

  if (!normalized) {
    return null;
  }

  for (const source of getDesignerLinkedCustomerLoginSources()) {
    if (source.designerId !== designerId) {
      continue;
    }

    for (const customer of source.customers) {
      const candidateName = customer.name?.trim() ?? '';

      if (normalizeName(candidateName) === normalized) {
        return {
          id: customer.id,
          name: candidateName || customerName,
          email: customer.email,
        };
      }
    }
  }

  return null;
}

/** 가입 고객 검색 + 시드 고객 이름 매칭 */
export async function resolveRegisteredCustomerForDesigner(
  designerId: string,
  customerName: string,
) {
  const seedMatch = findLinkedCustomerForDesignerByName(designerId, customerName);

  if (seedMatch) {
    return seedMatch;
  }

  const query = customerName.trim();

  if (!query) {
    return null;
  }

  const results = await searchRegisteredCustomers(query);
  const exact = results.find((item) => normalizeName(item.name) === normalizeName(query));

  if (exact) {
    return { id: exact.id, name: exact.name, email: exact.email };
  }

  return null;
}
