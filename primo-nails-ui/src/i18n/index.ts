import { it } from './it';
import { en } from './en';

export type TranslationKey = keyof typeof it;
export type Language = 'it' | 'en';

export const translations: Record<Language, Record<TranslationKey, string>> = { it, en };
