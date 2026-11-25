import { describe, expect, it, vi } from 'vitest';
import { LocalGameService } from './localGame.ts';
import type { HydratedUserState } from './api.ts';
import { canUseYandexAds, createYandexAdvertising, YANDEX_AD_HOST, YANDEX_AUTOPLACEMENT_SRC, YANDEX_CONTEXT_SRC } from './yandexAdvertising.ts';

function player(mode: 'child' | 'adult' = 'adult') {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const service = new LocalGameService(storage);
  const initial = service.request('/api/auth/guest', { body: JSON.stringify({ name: 'Ad integration test', ageMode: mode }) }) as { token: string; user: HydratedUserState };
  const change = (body: unknown) => service.request('/api/me/parental', { body: JSON.stringify(body) }, initial.token) as { user: HydratedUserState };
  return { service, storage, initial, change };
}

function fakePage(hostname = YANDEX_AD_HOST, production = true) {
  type Script = { id: string; src: string; async: boolean; attributes: Record<string, string>; setAttribute: (name: string, value: string) => void };
  const scripts: Script[] = [];
  const document = {
    querySelector: (selector: string) => scripts.find(script => selector === `script[src="${script.src}"]`) || null,
    createElement: (tag: string) => {
      expect(tag).toBe('script');
      const script: Script = { id: '', src: '', async: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
      return script;
    },
    head: { appendChild: (script: Script) => { scripts.push(script); } },
  };
  const reload = vi.fn();
  const environment = { document: document as unknown as Document, hostname, production, reload };
  return { scripts, document, reload, environment, controller: createYandexAdvertising(environment) };
}

describe('Yandex advertising eligibility', () => {
  it('keeps child, unknown and adult profiles with no permission free of SDK requests', () => {
    expect(canUseYandexAds(null, true)).toBe(false);
    expect(canUseYandexAds(player('child').initial.user, true)).toBe(false);
    expect(canUseYandexAds(player().initial.user, true)).toBe(false);
    const adult = player().change({ adsAllowed: true }).user;
    expect(canUseYandexAds(adult, true)).toBe(true);
    expect(canUseYandexAds(adult, false)).toBe(false);
    expect(canUseYandexAds({ ...adult, profile: { ...adult.profile, ageConfirmed: false } }, true)).toBe(false);
    expect(canUseYandexAds({ ...adult, profile: { ...adult.profile, role: 'admin' } }, true)).toBe(false);
    expect(canUseYandexAds({ ...adult, parental: { ...adult.parental, childModeLocked: true } }, true)).toBe(false);
  });

  it('persists the adult preference and allows it to be turned off', () => {
    const adult = player();
    expect(adult.change({ adsAllowed: true }).user.parental.adsAllowed).toBe(true);
    expect(new LocalGameService(adult.storage).getSavedUser()?.parental.adsAllowed).toBe(true);
    expect(adult.change({ adsAllowed: false }).user.parental.adsAllowed).toBe(false);
    expect(new LocalGameService(adult.storage).getSavedUser()?.parental.adsAllowed).toBe(false);
  });

  it('does not let requests enable child advertising or change unrelated parental settings', () => {
    const child = player('child');
    const before = child.service.getSavedUser();
    expect(child.change({ adsAllowed: true }).user.parental.adsAllowed).toBe(false);
    expect(child.service.getSavedUser()).toEqual(before);
    expect(() => child.change({ adsAllowed: 'true' })).toThrow(/tidak valid/);
    expect(() => child.change({ adsAllowed: true, childModeLocked: false })).toThrow(/tidak valid/);
    expect(child.service.getSavedUser()).toEqual(before);
  });

  it('keeps advertising off after a portable backup is restored', () => {
    const adult = player(); adult.change({ adsAllowed: true });
    const restored = player().service.importProgress(adult.service.exportProgress());
    expect(restored.parental.adsAllowed).toBe(false);
    expect(canUseYandexAds(restored, true)).toBe(false);
  });

  it('reports a storage failure without pretending that the advertising preference was saved', () => {
    const adult = player();
    const broken = new LocalGameService({ getItem: adult.storage.getItem, setItem: () => { throw new Error('quota'); } });
    expect(() => broken.request('/api/me/parental', { body: JSON.stringify({ adsAllowed: true }) }, adult.initial.token)).toThrow(/belum dapat disimpan/);
    expect(broken.getSavedUser()?.parental.adsAllowed).toBe(false);
    expect(new LocalGameService(adult.storage).getSavedUser()?.parental.adsAllowed).toBe(false);
  });
});

describe('Yandex Autoplacement lifecycle', () => {
  it('adds the two supplied async tags once, with exactly page ID 20500890', () => {
    const page = fakePage();
    page.controller.sync(false);
    expect(page.scripts).toEqual([]);
    page.controller.sync(true); page.controller.sync(true); page.controller.sync(true);
    expect(page.scripts.map(script => script.src)).toEqual([YANDEX_CONTEXT_SRC, YANDEX_AUTOPLACEMENT_SRC]);
    expect(page.scripts.every(script => script.async)).toBe(true);
    expect(page.scripts[1].attributes['data-page-id']).toBe('20500890');
    expect(page.reload).not.toHaveBeenCalled();
  });

  it('reuses an existing context loader and does not duplicate tags across controller remounts', () => {
    const page = fakePage();
    const context = page.document.createElement('script'); context.src = YANDEX_CONTEXT_SRC;
    page.document.head.appendChild(context);
    const remounted = createYandexAdvertising(page.environment);
    remounted.sync(true);
    createYandexAdvertising(page.environment).sync(true);
    expect(page.scripts).toHaveLength(2);
    expect(page.scripts[1].src).toBe(YANDEX_AUTOPLACEMENT_SRC);
  });

  it.each([
    ['localhost', false],
    ['localhost', true],
    ['muslim-blast-game-example-elsyarif2021s-projects.vercel.app', true],
    [YANDEX_AD_HOST, false],
  ])('does not make ad requests for test host %s, production=%s', (hostname, production) => {
    const page = fakePage(hostname as string, production as boolean);
    page.controller.sync(true); page.controller.sync(false);
    expect(page.scripts).toEqual([]); expect(page.reload).not.toHaveBeenCalled();
  });

  it('starts a clean document once when permission is revoked or the player leaves', () => {
    const page = fakePage(); page.controller.sync(true);
    page.controller.sync(false); page.controller.sync(false); page.controller.sync(true);
    expect(page.reload).toHaveBeenCalledOnce();
    expect(page.scripts).toHaveLength(2);
    const fresh = fakePage(); fresh.controller.sync(false);
    expect(fresh.scripts).toEqual([]); expect(fresh.reload).not.toHaveBeenCalled();
  });

  it('clears an existing runtime if a disallowed profile mounts after a component remount', () => {
    const page = fakePage(); page.controller.sync(true);
    createYandexAdvertising(page.environment).sync(false);
    expect(page.reload).toHaveBeenCalledOnce();
  });
});
