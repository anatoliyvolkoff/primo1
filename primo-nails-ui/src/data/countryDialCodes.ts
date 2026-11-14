/**
 * ISO-3166 alpha-2 → international dial code, for the markets PriMo ships
 * to (27 EU + a few common neighbours). Used to make the checkout phone
 * placeholder follow the selected country.
 */
export const DIAL_CODES: Record<string, string> = {
  at: '+43', be: '+32', bg: '+359', hr: '+385', cy: '+357', cz: '+420',
  dk: '+45', ee: '+372', fi: '+358', fr: '+33', de: '+49', gr: '+30',
  hu: '+36', ie: '+353', it: '+39', lv: '+371', lt: '+370', lu: '+352',
  mt: '+356', nl: '+31', pl: '+48', pt: '+351', ro: '+40', sk: '+421',
  si: '+386', es: '+34', se: '+46',
  gb: '+44', ch: '+41', no: '+47', us: '+1',
};

/** Phone placeholder hint for a country, e.g. "+39 000 000 0000". */
export function phonePlaceholderFor(iso2: string | undefined): string {
  const dial = DIAL_CODES[(iso2 || '').toLowerCase()] ?? '+39';
  return `${dial} 000 000 0000`;
}
