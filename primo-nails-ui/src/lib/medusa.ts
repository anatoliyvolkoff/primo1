import Medusa from "@medusajs/js-sdk"

export const MEDUSA_BACKEND_URL =
  import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000"

const PUBLISHABLE_KEY = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY || ""
if (!PUBLISHABLE_KEY && import.meta.env.PROD) {
  // A missing key makes every store API call 401 — surface it loudly at boot
  // rather than failing silently on every request (LB185-1).
  // eslint-disable-next-line no-console
  console.error(
    "VITE_MEDUSA_PUBLISHABLE_KEY is not set — all store API calls will fail."
  )
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
})
