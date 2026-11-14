/**
 * In-memory checkout draft. Lives at module scope so the half-filled
 * checkout form survives client-side navigation (leave to a product page,
 * come back) but is wiped on a full page reload — which reloads this
 * module and resets the draft. That's the exact behaviour requested:
 * persist within the session, empty on refresh. Deliberately NOT
 * sessionStorage/localStorage, both of which survive a reload.
 */
export type CheckoutDraft = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  countryCode: string;
  phone: string;
};

let draft: CheckoutDraft | null = null;

export function getCheckoutDraft(): CheckoutDraft | null {
  return draft;
}

export function setCheckoutDraft(next: CheckoutDraft): void {
  draft = next;
}

export function clearCheckoutDraft(): void {
  draft = null;
}
