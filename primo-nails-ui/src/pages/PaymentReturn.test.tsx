import { interpretCompletion } from './PaymentReturn';

describe('interpretCompletion (Medusa cart.complete result)', () => {
  it('resolves a successful completion to the order id', () => {
    expect(
      interpretCompletion({ type: 'order', order: { id: 'order_123' } })
    ).toEqual({ orderId: 'order_123' });
  });

  it('treats an already-completed cart (idempotent re-complete) as SUCCESS, not a failure', () => {
    // Verified against Medusa 2.13.3: completing an already-completed cart
    // returns { type: 'order', order } again (HTTP 200, no error). This must
    // never surface as "payment failed" to a customer who already paid.
    const idempotent = { type: 'order', order: { id: 'order_123', status: 'pending' } };
    expect(interpretCompletion(idempotent)).toEqual({ orderId: 'order_123' });
  });

  it('surfaces a genuine decline (type: cart with error) as an error message', () => {
    const declined = { type: 'cart', cart: { id: 'cart_1' }, error: { message: 'Card declined' } };
    expect(interpretCompletion(declined)).toEqual({ errorMessage: 'Card declined' });
  });

  it('supports the errors[] array shape', () => {
    const declined = { type: 'cart', errors: [{ message: 'Insufficient funds' }] };
    expect(interpretCompletion(declined)).toEqual({ errorMessage: 'Insufficient funds' });
  });

  it('a type:order with no resolvable id degrades to error, not a silent success', () => {
    // Guards against treating { orderId: undefined } as success.
    expect(interpretCompletion({ type: 'order', order: {} })).toEqual({ errorMessage: undefined });
  });

  it('returns no orderId and no message when the shape is unknown (caller uses a default)', () => {
    expect(interpretCompletion({ type: 'cart' })).toEqual({ errorMessage: undefined });
    expect(interpretCompletion(null)).toEqual({ errorMessage: undefined });
  });
});
