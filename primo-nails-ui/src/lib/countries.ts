import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string; // without leading "+"
  flag: string; // emoji
}

/** ISO 3166-1 alpha-2 → regional-indicator flag emoji (cross-platform, no assets). */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/**
 * All dial-able countries libphonenumber knows, with localized names (via the
 * built-in Intl.DisplayNames — no extra dependency). Sorted alphabetically by
 * localized name, then any `pinned` codes (default Italy) hoisted to the top.
 */
export function getCountryOptions(
  locale: string = 'it',
  pinned: CountryCode[] = ['IT']
): CountryOption[] {
  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    displayNames = undefined;
  }

  const options: CountryOption[] = getCountries().map((code) => ({
    code,
    name: displayNames?.of(code) || code,
    dialCode: getCountryCallingCode(code),
    flag: flagEmoji(code),
  }));

  options.sort((a, b) => a.name.localeCompare(b.name, locale));

  const pinnedSet = new Set(pinned);
  const top = pinned
    .map((code) => options.find((o) => o.code === code))
    .filter((o): o is CountryOption => !!o);
  const rest = options.filter((o) => !pinnedSet.has(o.code));
  return [...top, ...rest];
}
