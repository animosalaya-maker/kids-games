/* Bobo Land: shop billing interface.

   Billing.available()  → Promise<boolean>   can this app take a payment right now?
   Billing.products()   → Promise<[{ sku, title, price, currency }]>   prices from the store (localised by Google Play)
   Billing.buy(sku)     → Promise<{ ok, reason?, token? }>   reason: 'unavailable' | 'cancelled' | 'error'
   Billing.owned()      → Promise<[{ sku, token }]>   purchases the store says this account owns ("restore purchases")

   This version is stub-backed: available() is false, buy() answers { ok:false, reason:'unavailable' },
   and the shop shows «قريباً». Nothing is ever charged.

   How Google Play Billing plugs in (inside the Play Store app = a Trusted Web Activity):
   1. Detection: 'getDigitalGoodsService' in window, then
        const svc = await window.getDigitalGoodsService('https://play.google.com/billing');
      available() returns true only when svc exists (it does not in a plain browser or before the TWA has billing enabled).
   2. Products: svc.getDetails(SKUS) gives itemId, title, price.value / price.currency for each one-time product.
   3. Buying: new PaymentRequest([{ supportedMethods:'https://play.google.com/billing', data:{ sku } }], { total:{ label:'Total', amount:{ currency:'USD', value:'0' } } }),
      then request.show(); the response's details.purchaseToken goes to the server for verification BEFORE anything is unlocked,
      then response.complete('success').
   4. Verification (server): a Supabase Edge Function calls the Google Play Developer API
      (purchases.products.get with the package name, sku and token), checks purchaseState = 0, records the token against the kid,
      acknowledges the purchase (purchases.products.acknowledge), and only then answers ok. The page then calls
      Entitlements.grant(sku, 'play').
   5. Restore: svc.listPurchases() gives { itemId, purchaseToken } for this Google account; each token is verified the same way.
   The three functions below are the only places that change (STUB → PLAY); the shop and the maps use only this interface. */
(function(){
'use strict';
const SKUS = ['map_castle'];
const CATALOG = { map_castle:{ sku:'map_castle', price:'$1.99', currency:'USD', value:1.99 } };
const VERIFY_URL = null;                 // the server endpoint that verifies a purchase token (none yet)

const STUB = {
  async available(){ return false; },
  async products(){ return SKUS.map(s => Object.assign({}, CATALOG[s])); },
  async buy(){ return { ok:false, reason:'unavailable' }; },
  async owned(){ return []; }
};

window.Billing = {
  SKUS, CATALOG, VERIFY_URL,
  available: () => STUB.available(),
  products: () => STUB.products(),
  buy: sku => SKUS.includes(sku) ? STUB.buy(sku) : Promise.resolve({ ok:false, reason:'error' }),
  owned: () => STUB.owned(),
  price: sku => (CATALOG[sku] || {}).price || ''
};
})();
