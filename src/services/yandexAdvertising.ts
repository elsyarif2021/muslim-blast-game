import type { HydratedUserState } from './api.ts';

export const YANDEX_PAGE_ID = '20500890';
export const YANDEX_AD_HOST = 'muslim-blast-game.vercel.app';
export const YANDEX_CONTEXT_SRC = 'https://yandex.ru/ads/system/context.js';
export const YANDEX_AUTOPLACEMENT_SRC = 'https://yandex.ru/ads/system/ap-loader.js';

/** Keep the existing player advertising preference and child-mode boundary. */
export function canUseYandexAds(user: HydratedUserState | null, localMode: boolean): boolean {
  return Boolean(localMode && user?.profile.role === 'player' && user.profile.ageMode === 'adult'
    && user.profile.ageConfirmed && user.parental.adsAllowed && !user.parental.childModeLocked);
}

interface AdvertisingEnvironment {
  document: Document;
  hostname: string;
  production: boolean;
  reload: () => void;
}

/** The supplied async tags are installed once, after the permitted player's UI has rendered. */
export function createYandexAdvertising(environment: AdvertisingEnvironment) {
  const { document, hostname, production, reload } = environment;
  let started = Boolean(document.querySelector(`script[src="${YANDEX_CONTEXT_SRC}"]`) || document.querySelector(`script[src="${YANDEX_AUTOPLACEMENT_SRC}"]`));
  let installed = false;
  let reloading = false;
  return {
    sync(allowed: boolean) {
      // Preview builds and local tests must not create live ad impressions.
      if (!production || hostname !== YANDEX_AD_HOST || reloading) return;
      if (!allowed) {
        // Removing script tags cannot undo a third-party SDK's listeners or outstanding requests.
        // A fresh document also protects logout and a restored child profile after adult use.
        if (started) { reloading = true; reload(); }
        return;
      }
      if (installed) return;
      const tags = [
        { id: 'muslim-blast-yandex-context', src: YANDEX_CONTEXT_SRC },
        { id: 'muslim-blast-yandex-autoplacement', src: YANDEX_AUTOPLACEMENT_SRC, pageId: YANDEX_PAGE_ID },
      ];
      for (const tag of tags) {
        if (document.querySelector(`script[src="${tag.src}"]`)) continue;
        const script = document.createElement('script');
        script.id = tag.id;
        script.src = tag.src;
        script.async = true;
        if (tag.pageId) script.setAttribute('data-page-id', tag.pageId);
        document.head.appendChild(script);
      }
      started = true;
      installed = true;
    },
  };
}
