export interface SeasonMeta {
  nameKey: string;
  accent: string;
  descriptionKey: string;
}

export const SEASON_META: Record<string, SeasonMeta> = {
  AUTUMN: { nameKey: 'collections.season.autumn', accent: '#C17A4A', descriptionKey: 'collections.season.autumn.description' },
  WINTER: { nameKey: 'collections.season.winter', accent: '#6B8CAE', descriptionKey: 'collections.season.winter.description' },
  SPRING: { nameKey: 'collections.season.spring', accent: '#D8829D', descriptionKey: 'collections.season.spring.description' },
  SUMMER: { nameKey: 'collections.season.summer', accent: '#E8943A', descriptionKey: 'collections.season.summer.description' },
};

/**
 * Each season's glow colour (Primo1 "The Seasons"), keyed by lower-case season id.
 * One source for the season cards and the quick-view season tabs.
 */
export const SEASON_GLOW: Record<string, string> = {
  autumn: '#c8742d',
  winter: '#2f80e9',
  spring: '#e5668f',
  summer: '#44c232',
};

/** Glow colour for a seasonal kit handle (`kit-<season>-collection`), if any. */
export const seasonGlowForKit = (handle?: string): string | undefined => {
  const m = /^kit-(autumn|winter|spring|summer)-collection$/.exec(handle ?? '');
  return m ? SEASON_GLOW[m[1]] : undefined;
};
