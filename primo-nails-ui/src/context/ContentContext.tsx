import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import initialContent from '../content.json';

// Text fields are in translation files (src/i18n/).
// ContentData holds layout config, images, and seasons data only.
interface ContentData {
  hero: {
    images: string[];
    layout: {
      paddingTop: string;
      paddingBottom: string;
      textAlign: 'left' | 'center' | 'right';
      imageHeight: string;
      imageObjectFit: 'cover' | 'contain';
      contentMaxWidth: string;
    };
  };
  explore: {
    bestSellers: {
      layout: {
        paddingTop: string;
        paddingBottom: string;
        gap: string;
      };
    };
    newArrivals: {
      layout: {
        paddingTop: string;
        paddingBottom: string;
        gap: string;
      };
    };
  };
  about: {
    image: string;
    layout: {
      paddingTop: string;
      paddingBottom: string;
      imageSize: string;
      imageBorderRadius: string;
    };
  };
  courses: {
    layout: {
      paddingTop: string;
      paddingBottom: string;
      borderRadius: string;
    };
  };
  footer: {
    layout: {
      paddingTop: string;
      paddingBottom: string;
    };
  };
  gallery: {
    images: string[];
    layout: {
      paddingTop: string;
      paddingBottom: string;
      gridGap: string;
      borderRadius: string;
    };
  };
  seasons: {
    [key: string]: {
      mainImage: string;
      gallery: string[];
      multiply?: boolean;
    };
  };
}

interface ContentContextType {
  content: ContentData;
  updateContent: (newContent: ContentData) => void;
  resetContent: () => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

// `source` is untrusted localStorage JSON of unknown shape at runtime, so the
// params stay intentionally loose (a generic DeepPartial<ContentData> would be
// misleading and force `as unknown as` casts at the call site). We DO harden the
// recursion so a non-object target slot can't be merged into (LB155-5).
const deepMerge = (target: any, source: any) => {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
};

const getFreshContent = (): ContentData =>
  JSON.parse(JSON.stringify(initialContent)) as ContentData;

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<ContentData>(() => {
    const base: ContentData = getFreshContent();
    // `localStorage` access itself can throw (Safari private mode, disabled
    // storage, sandboxed iframe) — not just JSON.parse. Guard the whole read so
    // the provider still mounts with fresh content instead of crashing the app.
    try {
      const saved = localStorage.getItem('site_content');
      if (saved) return deepMerge(base, JSON.parse(saved)) as ContentData;
    } catch { /* storage unavailable or corrupt — fall back to fresh content */ }
    return base;
  });

  const updateContent = useCallback((newContent: ContentData) => {
    setContent(newContent);
    try {
      localStorage.setItem('site_content', JSON.stringify(newContent));
    } catch { /* storage unavailable — keep the in-memory update */ }
  }, []);

  const resetContent = useCallback(() => {
    setContent(getFreshContent());
    try {
      localStorage.removeItem('site_content');
    } catch { /* storage unavailable — nothing to clear */ }
  }, []);

  const value = useMemo(
    () => ({ content, updateContent, resetContent }),
    [content, updateContent, resetContent]
  );

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
