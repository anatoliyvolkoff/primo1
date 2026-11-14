// The pretend backend behind the mock modes: answers every /store/* call the storefront makes from
// the fixtures, and keeps a make-believe cart → checkout → order going so the whole funnel can be
// clicked through with no API. Pure (no browser / Node APIs) because it runs in both places:
// plugin.ts hosts it inside the Vite dev server (`pnpm dev:mock`), browser.ts inside the page for
// the static demo (`pnpm build:pages`). Nothing here is real: no stock, no payment, no emails.

export interface MockData { products: any; regions: any; content: any; courses: any; categories: any }
export interface MockState { carts: Record<string, any>; orders: Record<string, any>; seq: number }
export interface MockRequest { method: string; path: string; query: URLSearchParams; body?: any }
export interface MockResponse { status: number; body: unknown }

export const emptyState = (): MockState => ({ carts: {}, orders: {}, seq: 0 });

const VAT = 0.22;
const DEMO_PROMOS: Record<string, number> = { PRIMO10: 10, WELCOME10: 10 }; // code → % off
const round = (n: number) => Math.round(n * 100) / 100;
const ok = (body: unknown): MockResponse => ({ status: 200, body });
const fail = (status: number, message: string): MockResponse => ({ status, body: { type: 'not_found', message } });

// Flat stand-in for the GLS price table: Italy vs rest of the EU, free above the threshold.
function shippingFor(cart: any) {
  const italy = (cart.shipping_address?.country_code ?? 'it').toLowerCase() === 'it';
  const freeThreshold = italy ? 99 : 199;
  const qualifies = cart.item_total >= freeThreshold;
  return {
    zoneKey: italy ? 'it_main' : 'eu1',
    zoneLabel: italy ? 'Italia continentale' : 'Europa · Zona 1',
    freeThreshold,
    qualifies,
    amount: qualifies ? 0 : italy ? 7 : 16,
  };
}

function recalc(cart: any) {
  for (const it of cart.items) {
    it.total = it.original_total = round(it.unit_price * it.quantity);
    it.subtotal = round(it.total / (1 + VAT));
    it.tax_total = round(it.total - it.subtotal);
  }
  const gross = round(cart.items.reduce((t: number, it: any) => t + it.total, 0));
  const pct = cart.promotions[0]?.application_method?.value ?? 0;
  cart.original_item_total = gross;
  cart.discount_total = round((gross * pct) / 100);
  cart.item_total = round(gross - cart.discount_total);
  // Re-price a chosen shipping method: the destination or the free-shipping status may have changed.
  for (const m of cart.shipping_methods) m.amount = m.total = shippingFor(cart).amount;
  cart.shipping_total = round(cart.shipping_methods.reduce((t: number, m: any) => t + m.amount, 0));
  cart.total = round(cart.item_total + cart.shipping_total);
  cart.subtotal = round(cart.total / (1 + VAT));
  cart.tax_total = round(cart.total - cart.subtotal);
  return cart;
}

function findVariant(data: MockData, variantId: string) {
  for (const product of data.products.products) {
    const variant = (product.variants ?? []).find((v: any) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

export function handle(req: MockRequest, data: MockData, state: MockState): MockResponse {
  const { method, path: p, query, body = {} } = req;
  const seg = p.split('/').filter(Boolean); // ['store', 'carts', '<id>', ...]
  const nextId = (prefix: string) => `${prefix}_mock_${++state.seq}`;
  const now = () => new Date().toISOString();

  if (p === '/store/regions') return ok(data.regions);
  if (p === '/store/products') {
    const h = query.get('handle');
    const list = h ? data.products.products.filter((x: any) => x.handle === h) : data.products.products;
    return ok({ products: list, count: list.length, limit: 200, offset: 0 });
  }
  if (p === '/store/product-categories') return ok(data.categories);
  if (p === '/store/content') return ok(data.content);
  if (p === '/store/courses') return ok(data.courses);
  if (seg[1] === 'courses' && seg[2]) {
    const c = (data.courses.courses ?? []).find((x: any) => x.handle === decodeURIComponent(seg[2]));
    return c ? ok({ course: c }) : fail(404, 'not found');
  }
  // Forms that only need a "thanks": newsletter sign-up, course enrolment request.
  if (p === '/store/newsletter' || p === '/store/course-enrollment') return ok({ success: true });

  if (p === '/store/shipping-estimate') {
    const subtotal = Number(query.get('subtotal') ?? 0);
    const s = shippingFor({ item_total: subtotal, shipping_address: { country_code: query.get('country') } });
    return ok({ zoneKey: s.zoneKey, zoneLabel: s.zoneLabel, freeShippingEnabled: true, freeThreshold: s.freeThreshold,
      remaining: Math.max(0, round(s.freeThreshold - subtotal)), qualifies: s.qualifies });
  }

  if (seg[1] === 'carts') {
    if (seg.length === 2 && method === 'POST') {
      const id = nextId('cart');
      state.carts[id] = recalc({ id, region_id: body.region_id ?? data.regions.regions[0].id, currency_code: 'eur',
        email: null, shipping_address: null, billing_address: null, metadata: null, items: [], shipping_methods: [],
        promotions: [], created_at: now() });
      return ok({ cart: state.carts[id] });
    }
    const cart = state.carts[seg[2]];
    // 404 makes the storefront drop its stored cart id and start a fresh cart.
    if (!cart) return fail(404, `Cart with id: ${seg[2]} was not found`);

    if (seg.length === 3 && method === 'GET') return ok({ cart });
    if (seg.length === 3 && method === 'POST') {
      for (const k of ['email', 'shipping_address', 'billing_address', 'metadata'] as const) {
        if (k in body) cart[k] = body[k];
      }
      if (Array.isArray(body.promo_codes)) {
        const code = String(body.promo_codes[0] ?? '').trim().toUpperCase();
        if (code && !(code in DEMO_PROMOS)) return { status: 400, body: { type: 'invalid_data', message: `The promotion code ${code} is invalid` } };
        cart.promotions = code ? [{ id: `promo_${code}`, code, application_method: { type: 'percentage', value: DEMO_PROMOS[code] } }] : [];
      }
      return ok({ cart: recalc(cart) });
    }
    if (seg[3] === 'line-items' && seg.length === 4 && method === 'POST') {
      const found = findVariant(data, body.variant_id);
      if (!found) return fail(404, `Variant ${body.variant_id} was not found`);
      const { product, variant } = found;
      const quantity = Math.max(1, Number(body.quantity) || 1);
      const existing = cart.items.find((it: any) => it.variant_id === variant.id);
      if (existing) existing.quantity += quantity;
      else {
        cart.items.push({ id: nextId('cali'), cart_id: cart.id, variant_id: variant.id, product_id: product.id,
          title: variant.title, product_title: product.title, product_description: product.description,
          product_handle: product.handle, variant_title: variant.title, variant_sku: variant.sku,
          thumbnail: product.thumbnail, quantity, unit_price: variant.calculated_price?.calculated_amount ?? 0,
          created_at: now() });
      }
      return ok({ cart: recalc(cart) });
    }
    if (seg[3] === 'line-items' && seg.length === 5) {
      const item = cart.items.find((it: any) => it.id === seg[4]);
      if (!item) return fail(404, `Line item ${seg[4]} was not found`);
      if (method === 'DELETE') {
        cart.items = cart.items.filter((it: any) => it !== item);
        return ok({ id: seg[4], object: 'line-item', deleted: true, parent: recalc(cart) });
      }
      if (method === 'POST') {
        item.quantity = Math.max(1, Number(body.quantity) || 1);
        return ok({ cart: recalc(cart) });
      }
    }
    if (seg[3] === 'shipping-methods' && method === 'POST') {
      cart.shipping_methods = [{ id: nextId('casm'), shipping_option_id: body.option_id, name: 'GLS Standard', amount: 0, total: 0 }];
      return ok({ cart: recalc(cart) });
    }
    if (seg[3] === 'complete' && method === 'POST') {
      const id = nextId('order');
      const display_id = 1000 + Object.keys(state.orders).length + 1;
      state.orders[id] = { ...JSON.parse(JSON.stringify(cart)), id, display_id, status: 'pending', created_at: now() };
      delete state.carts[cart.id];
      return ok({ type: 'order', order: state.orders[id] });
    }
  }

  if (p === '/store/shipping-options') {
    const cart = state.carts[query.get('cart_id') ?? ''];
    if (!cart) return ok({ shipping_options: [] });
    return ok({ shipping_options: [{ id: 'so_mock_gls_standard', name: 'GLS Standard', price_type: 'flat',
      amount: shippingFor(cart).amount, type: { label: 'Standard', description: 'Consegna in 24/48h · 2–4 giorni lavorativi in UE' } }] });
  }
  if (seg[1] === 'shipping-options' && seg[3] === 'calculate') {
    const cart = state.carts[body.cart_id];
    return ok({ shipping_option: { id: seg[2], amount: cart ? shippingFor(cart).amount : 0 } });
  }

  // Payment: hand back a session whose hosted page says "mock-payment", which the checkout reads
  // as "no real gateway — complete the order in place".
  if (seg[1] === 'payment-collections' && method === 'POST') {
    const id = seg[2] ?? nextId('pay_col');
    const sessions = seg[3] === 'payment-sessions'
      ? [{ id: nextId('payses'), provider_id: body.provider_id, status: 'pending', data: { hostedPage: 'mock-payment' } }]
      : [];
    return ok({ payment_collection: { id, payment_sessions: sessions } });
  }

  if (seg[1] === 'orders' && seg[2]) {
    const order = state.orders[seg[2]];
    return order ? ok({ order }) : fail(404, `Order with id: ${seg[2]} was not found`);
  }

  return fail(404, 'mock: not implemented');
}
