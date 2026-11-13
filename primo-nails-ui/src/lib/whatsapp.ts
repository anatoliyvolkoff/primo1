/**
 * Compose a WhatsApp click-to-chat link from an admin-configured base and an
 * optional prefilled message.
 *
 * `base` may be a full URL (`https://wa.me/393893193049`) or a bare number in
 * any human format (`+39 389 319 3049`) — non-digits are stripped for the bare
 * form. Returns "" for an empty base so callers can hide the CTA. Any prefilled
 * `message` is url-encoded into the `text` query param (WhatsApp's own param),
 * replacing one already present.
 */
/**
 * Shop contact for B2B / bulk enquiries — the same wholesale address shown in
 * the footer and the PDP/QuickView wholesale boxes.
 */
export const WHOLESALE_EMAIL = "primonailspro@gmail.com";

/**
 * WhatsApp base used as the fallback for the wholesale / contact boxes when the
 * admin-configured `course_whatsapp_url` store setting is empty, so the link is
 * always present.
 */
export const WHATSAPP_FALLBACK = "https://wa.me/393893193049";

export function waLinkWithText(base: string, message?: string): string {
  const raw = (base || "").trim();
  if (!raw) return "";
  // Bare-number form with no digits (e.g. "abc") would yield a numberless
  // `https://wa.me/` link. Treat it like an empty base so callers hide the CTA.
  const digits = raw.replace(/[^\d]/g, "");
  if (!raw.startsWith("http") && !digits) return "";
  try {
    const url = new URL(
      raw.startsWith("http") ? raw : `https://wa.me/${digits}`
    );
    if (message) url.searchParams.set("text", message);
    return url.toString();
  } catch {
    // Malformed base — hand it back untouched rather than break the button.
    return raw;
  }
}
