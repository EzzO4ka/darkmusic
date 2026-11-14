export interface ArtistRecord {
  id: string;
  name: string;
  role: string;
  gradient: string;
  icon: string;
  avatarFile: string;
  bannerFile?: string;
  bio: string;
  facts: string[];
  isCustom?: boolean;
  createdAt?: number;
}

export interface SystemPushBroadcast {
  id: string;
  title: string;
  message: string;
  imageFile: string;
  active: boolean;
  createdAt: number;
}

export interface TempBroadcast {
  id: string;
  title: string;
  message: string;
  active: boolean;
  createdAt: number;
}

export interface PinnedBroadcast {
  id: string;
  title: string;
  message: string;
  active: boolean;
  updatedAt: number;
}

export interface BackgroundNotificationDescriptor {
  id: string;
  kind: 'system_push' | 'temp_broadcast' | 'pinned_broadcast';
  title: string;
  message: string;
  imageFile: string;
}

export interface DeleteConfirmDescriptor {
  entityType: 'artist' | 'album' | 'track' | 'video' | 'news' | 'fact';
  entityId: string;
  typeBadge: string;
  title: string;
  description: string;
}

export function generateArtistId(name: string, now: number = Date.now()): string {
  const translitMap: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  const clean = String(name || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => (translitMap[ch] !== undefined ? translitMap[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const slug = clean || 'artist';
  return `art_${slug}_${now}`;
}

export function createCustomArtistRecord(input: {
  id?: string;
  name: string;
  role?: string;
  gradient?: string;
  icon?: string;
  avatarFile?: string;
  bannerFile?: string;
  bio?: string;
  facts?: string[];
  now?: number;
}): ArtistRecord {
  const now = input.now || Date.now();
  const trimmedName = String(input.name || '').trim();
  if (!trimmedName) {
    throw new Error('Artist name is required');
  }
  const id = input.id || generateArtistId(trimmedName, now);
  const cleanFacts = Array.isArray(input.facts)
    ? input.facts.map((f) => String(f || '').trim()).filter(Boolean)
    : [];

  return {
    id,
    name: trimmedName,
    role: String(input.role || '').trim() || 'Эксклюзивный артист • Dark Music',
    gradient: String(input.gradient || '').trim() || 'from-purple-600 via-indigo-900 to-zinc-950',
    icon: String(input.icon || '').trim() || 'fa-microphone-lines',
    avatarFile: String(input.avatarFile || '').trim() || `avatars/${id}.jpg`,
    bannerFile: String(input.bannerFile || '').trim(),
    bio:
      String(input.bio || '').trim() ||
      `${trimmedName} — резидент и исполнитель закрытого каталога Dark Music.`,
    facts:
      cleanFacts.length > 0
        ? cleanFacts
        : [`${trimmedName} записывает эксклюзивные треки специально для каталога Dark Music.`],
    isCustom: true,
    createdAt: now
  };
}

export function buildDeleteConfirmDescriptor(
  entityType: DeleteConfirmDescriptor['entityType'],
  entityId: string,
  itemTitle: string
): DeleteConfirmDescriptor {
  const cleanTitle = String(itemTitle || '').trim() || 'Без названия';
  switch (entityType) {
    case 'artist':
      return {
        entityType,
        entityId,
        typeBadge: 'УДАЛЕНИЕ АРТИСТА',
        title: `Удалить артиста «${cleanTitle}»?`,
        description:
          'Профиль исполнителя будет удалён из каталога на всех устройствах. Вы уверены, что хотите продолжить?'
      };
    case 'album':
      return {
        entityType,
        entityId,
        typeBadge: 'УДАЛЕНИЕ РЕЛИЗА',
        title: `Удалить альбом «${cleanTitle}»?`,
        description:
          'Альбом/сингл будет удалён из каталога Dark Music на всех синхронизированных устройствах.'
      };
    case 'track':
      return {
        entityType,
        entityId,
        typeBadge: 'УДАЛЕНИЕ ТРЕКА',
        title: `Удалить трек «${cleanTitle}»?`,
        description:
          'Трек исчезнет из плейлистов, чарта и профилей артистов на всех устройствах.'
      };
    case 'video':
      return {
        entityType,
        entityId,
        typeBadge: 'УДАЛЕНИЕ КЛИПА',
        title: `Удалить видеоклип «${cleanTitle}»?`,
        description:
          'Видеоклип будет удалён с главной страницы и из профиля артиста.'
      };
    case 'news':
      return {
        entityType,
        entityId,
        typeBadge: 'УДАЛЕНИЕ НОВОСТИ',
        title: `Удалить новость «${cleanTitle}»?`,
        description:
          'Публикация будет удалена из ленты новостей и анонсов.'
      };
    case 'fact':
      return {
        entityType,
        entityId,
        typeBadge: 'УДАЛЕНИЕ ФАКТА',
        title: `Удалить интересный факт?`,
        description: `Факт «${cleanTitle}» будет удалён из списка фактов артиста.`
      };
  }
}

export function createSystemPushBroadcast(input: {
  title?: string;
  message: string;
  imageFile?: string;
  enable: boolean;
  now?: number;
}): SystemPushBroadcast {
  const now = input.now || Date.now();
  const title = String(input.title || '').trim() || 'Dark Music';
  const message = String(input.message || '').trim();
  const imageFile = String(input.imageFile || '').trim() || 'logo.png';

  if (input.enable && !message) {
    throw new Error('Push message is required when enabling broadcast');
  }

  return {
    id: input.enable ? `push_${now}` : '',
    title,
    message,
    imageFile,
    active: Boolean(input.enable),
    createdAt: now
  };
}

export function shouldTriggerSystemPush(
  broadcast: Partial<SystemPushBroadcast> | null | undefined,
  seenPushIds: Set<string>
): boolean {
  if (!broadcast || !broadcast.active || !broadcast.id || !broadcast.message) {
    return false;
  }
  if (seenPushIds.has(broadcast.id)) {
    return false;
  }
  return true;
}

export function extractUnseenBackgroundNotifications(
  catalog: {
    systemPushBroadcast?: Partial<SystemPushBroadcast> | null;
    tempBroadcast?: Partial<TempBroadcast> | null;
    pinnedBroadcast?: Partial<PinnedBroadcast> | null;
  } | null | undefined,
  seenIds: Set<string>,
  isAppInactive: boolean
): BackgroundNotificationDescriptor[] {
  if (!catalog || typeof catalog !== 'object') return [];
  const results: BackgroundNotificationDescriptor[] = [];

  const sys = catalog.systemPushBroadcast;
  if (sys && sys.active && sys.id && sys.message && !seenIds.has(sys.id)) {
    results.push({
      id: sys.id,
      kind: 'system_push',
      title: String(sys.title || 'Dark Music').trim() || 'Dark Music',
      message: String(sys.message).trim(),
      imageFile: String(sys.imageFile || 'logo.png').trim() || 'logo.png'
    });
  }

  if (isAppInactive) {
    const tmp = catalog.tempBroadcast;
    if (tmp && tmp.active && tmp.id && tmp.message && !seenIds.has(`bg_${tmp.id}`)) {
      results.push({
        id: `bg_${tmp.id}`,
        kind: 'temp_broadcast',
        title: String(tmp.title || 'Объявление Dark Music').trim() || 'Объявление Dark Music',
        message: String(tmp.message).trim(),
        imageFile: 'logo.png'
      });
    }

    const pin = catalog.pinnedBroadcast;
    const pinId = pin?.id || (pin?.updatedAt ? `pin_${pin.updatedAt}` : '');
    if (pin && pin.active && pinId && pin.message && !seenIds.has(`bg_${pinId}`)) {
      results.push({
        id: `bg_${pinId}`,
        kind: 'pinned_broadcast',
        title: String(pin.title || 'Важная информация Dark Music').trim() || 'Важная информация Dark Music',
        message: String(pin.message).trim(),
        imageFile: 'logo.png'
      });
    }
  }

  return results;
}

export function shouldApplyAuthoritativeRemoteCatalog(
  localFingerprint: string,
  remoteFingerprint: string
): boolean {
  if (!remoteFingerprint) return false;
  return localFingerprint !== remoteFingerprint;
}

function rotl32(x: number, r: number): number {
  return ((x << r) | (x >>> (32 - r))) | 0;
}

function chachaQuarterRound(s: Int32Array, a: number, b: number, c: number, d: number): void {
  s[a] = (s[a] + s[b]) | 0;
  s[d] = rotl32(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) | 0;
  s[b] = rotl32(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) | 0;
  s[d] = rotl32(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) | 0;
  s[b] = rotl32(s[b] ^ s[c], 7);
}

const OWNER_KDF_TAG = new Int32Array([
  -863311829, 1921493137, 1539174569, 1684649951,
  -1275023258, -1572565891, 643353153, -1000273452
]);

export function verifyOwnerAccessPin(
  pinInput: string,
  domainSalt: string = 'dm_owner_kdf_v3::mc_geich:mc_makaka:mc_ezdit:mc_oparysh',
  expectedTag: Int32Array | number[] = OWNER_KDF_TAG
): boolean {
  const clean = String(pinInput || '').trim();
  if (clean.length !== 4) return false;

  const s = new Int32Array(16);
  let seed = -1640531527;
  for (let i = 0; i < 16; i++) {
    seed = (seed + -1640531527) | 0;
    let z = seed ^ (seed >>> 16);
    z = Math.imul(z, -2048144789);
    z = z ^ (z >>> 13);
    s[i] = Math.imul(z, -1028477387);
  }

  const combined = `${clean}|${domainSalt}`;
  for (let i = 0; i < combined.length; i++) {
    const c = combined.charCodeAt(i) & 0xffff;
    s[i & 15] = (s[i & 15] ^ Math.imul(c + 0x517cc1b7, -2048144789)) | 0;
    s[(i + 5) & 15] = (s[(i + 5) & 15] + rotl32(c ^ 0x27d4eb2d, (i * 7) & 31)) | 0;
  }

  for (let r = 0; r < 65536; r++) {
    chachaQuarterRound(s, 0, 4, 8, 12);
    chachaQuarterRound(s, 1, 5, 9, 13);
    chachaQuarterRound(s, 2, 6, 10, 14);
    chachaQuarterRound(s, 3, 7, 11, 15);
    chachaQuarterRound(s, 0, 5, 10, 15);
    chachaQuarterRound(s, 1, 6, 11, 12);
    chachaQuarterRound(s, 2, 7, 8, 13);
    chachaQuarterRound(s, 3, 4, 9, 14);
    const idx = r & 15;
    s[idx] = (Math.imul(s[idx] ^ (s[(idx + 9) & 15] >>> 11), -1028477387) + (r ^ -1640531527)) | 0;
  }

  let diff = 0;
  for (let i = 0; i < 8; i++) {
    diff |= s[i] ^ expectedTag[i];
  }
  return diff === 0;
}

export interface SealedOwnerVaultPayload {
  cipherBytes: Uint8Array;
  macTag: Int32Array;
}

export interface DecryptedOwnerVaultResult {
  panelHtml: string;
  transportToken: string;
}

function deriveSealedVaultKeys(
  pinStr: string,
  integrityGuard: number = 0x444d5634,
  salt: string = 'dm_sealed_vault_v4.2::EzzO4ka/darkmusic::chacha20_sponge_argon_hybrid'
): { streamKey: Int32Array; tokenSubKey: Int32Array } {
  const raw = String(pinStr || '').trim();
  const st = new Int32Array(16);
  let h = (0x811c9dc5 ^ integrityGuard) | 0;
  const input = `${raw}::${raw.length}::${salt}::${integrityGuard | 0}`;
  for (let i = 0; i < 16; i++) {
    h = Math.imul(h ^ (i + 0x9e3779b9), 0x01000193) | 0;
    st[i] = (h ^ Math.imul(i + 1, -1640531527)) | 0;
  }
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i) & 0xffff;
    st[i & 15] = (st[i & 15] ^ Math.imul(c + 0x517cc1b7, -2048144789)) | 0;
    st[(i + 7) & 15] = (st[(i + 7) & 15] + rotl32(c ^ st[i & 15], (i * 5 + 3) & 31)) | 0;
  }
  const mem = new Int32Array(16384);
  for (let i = 0; i < 16384; i += 16) {
    chachaQuarterRound(st, 0, 4, 8, 12);
    chachaQuarterRound(st, 1, 5, 9, 13);
    chachaQuarterRound(st, 2, 6, 10, 14);
    chachaQuarterRound(st, 3, 7, 11, 15);
    chachaQuarterRound(st, 0, 5, 10, 15);
    chachaQuarterRound(st, 1, 6, 11, 12);
    chachaQuarterRound(st, 2, 7, 8, 13);
    chachaQuarterRound(st, 3, 4, 9, 14);
    for (let j = 0; j < 16; j++) {
      mem[i + j] = (st[j] ^ Math.imul(i + j + 1, -1028477387)) | 0;
    }
  }
  for (let r = 0; r < 65536; r++) {
    const mIdx = (st[r & 15] ^ r) & 16383;
    const mVal = mem[mIdx];
    st[r & 15] = (st[r & 15] + mVal + Math.imul(r + 1, -1640531527)) | 0;
    mem[mIdx] = (st[(r + 5) & 15] ^ rotl32(mVal, (r & 15) + 1)) | 0;
    if ((r & 7) === 7) {
      chachaQuarterRound(st, 0, 4, 8, 12);
      chachaQuarterRound(st, 1, 5, 9, 13);
      chachaQuarterRound(st, 2, 6, 10, 14);
      chachaQuarterRound(st, 3, 7, 11, 15);
      chachaQuarterRound(st, 0, 5, 10, 15);
      chachaQuarterRound(st, 1, 6, 11, 12);
      chachaQuarterRound(st, 2, 7, 8, 13);
      chachaQuarterRound(st, 3, 4, 9, 14);
    }
  }
  for (let i = 0; i < 16384; i += 16) {
    for (let j = 0; j < 16; j++) {
      st[j] = (st[j] ^ mem[i + j]) | 0;
    }
    chachaQuarterRound(st, 0, 5, 10, 15);
    chachaQuarterRound(st, 1, 6, 11, 12);
    chachaQuarterRound(st, 2, 7, 8, 13);
    chachaQuarterRound(st, 3, 4, 9, 14);
  }
  mem.fill(0);
  return {
    streamKey: st.slice(0, 8),
    tokenSubKey: st.slice(8, 16)
  };
}

function computeScatteredTokenSlots(tokenSubKey: Int32Array, totalLen: number, tokenLen: number = 40): number[] {
  const slots: number[] = [];
  const used = new Set<number>();
  const s = new Int32Array(tokenSubKey);
  for (let i = 0; i < tokenLen; i++) {
    let step = 0;
    while (true) {
      const w = s[(i + step) & 7] ^ Math.imul(i * 131 + step + 1, -1640531527);
      s[i & 7] = (rotl32(w, 11) + s[(i + 3) & 7]) | 0;
      const pos = (s[i & 7] >>> 0) % totalLen;
      if (!used.has(pos)) {
        used.add(pos);
        slots.push(pos);
        break;
      }
      step++;
    }
  }
  return slots;
}

export function encryptAndAuthenticateOwnerVault(
  pinInput: string,
  panelHtml: string,
  transportToken: string,
  integrityGuard: number = 0x444d5634
): SealedOwnerVaultPayload {
  const cleanPin = String(pinInput || '').trim();
  const tokenBytes = new TextEncoder().encode(String(transportToken || '').padEnd(40, '_').slice(0, 40));
  const htmlBytes = new TextEncoder().encode(String(panelHtml || ''));
  const totalLen = htmlBytes.length + 40;
  const { streamKey, tokenSubKey } = deriveSealedVaultKeys(cleanPin, integrityGuard);
  const slots = computeScatteredTokenSlots(tokenSubKey, totalLen, 40);
  const slotSet = new Set(slots);

  const muxPlain = new Uint8Array(totalLen);
  for (let i = 0; i < 40; i++) {
    const kw = tokenSubKey[i & 7];
    const mask = ((kw >>> ((i & 3) * 8)) ^ Math.imul(i + 53, -2048144789)) & 0xff;
    muxPlain[slots[i]] = (tokenBytes[i] ^ mask) & 0xff;
  }
  let hPtr = 0;
  for (let pos = 0; pos < totalLen; pos++) {
    if (!slotSet.has(pos)) {
      muxPlain[pos] = htmlBytes[hPtr++];
    }
  }

  const cipherBytes = new Uint8Array(totalLen);
  const blockState = new Int32Array(16);
  for (let i = 0; i < 8; i++) {
    blockState[i] = streamKey[i];
    blockState[i + 8] = tokenSubKey[i] ^ Math.imul(i + 1, -1640531527);
  }
  let fbk = 0x9d;
  for (let i = 0; i < totalLen; i++) {
    if ((i & 63) === 0) {
      blockState[12] = (blockState[12] + (i >>> 6) + 1) | 0;
      blockState[13] = (blockState[13] ^ fbk) | 0;
      for (let r = 0; r < 10; r++) {
        chachaQuarterRound(blockState, 0, 4, 8, 12);
        chachaQuarterRound(blockState, 1, 5, 9, 13);
        chachaQuarterRound(blockState, 2, 6, 10, 14);
        chachaQuarterRound(blockState, 3, 7, 11, 15);
        chachaQuarterRound(blockState, 0, 5, 10, 15);
        chachaQuarterRound(blockState, 1, 6, 11, 12);
        chachaQuarterRound(blockState, 2, 7, 8, 13);
        chachaQuarterRound(blockState, 3, 4, 9, 14);
      }
    }
    const lane = (i >> 2) & 15;
    const shift = (i & 3) << 3;
    const ks = ((blockState[lane] >>> shift) ^ fbk ^ ((i * 37) & 0xff)) & 0xff;
    const p = muxPlain[i];
    const c = (p ^ ks) & 0xff;
    cipherBytes[i] = c;
    fbk = ((c * 67) ^ p ^ ks ^ (i & 0xff)) & 0xff;
  }

  const macState = new Int32Array(16);
  for (let i = 0; i < 8; i++) {
    macState[i] = streamKey[i] ^ 0x36363636;
    macState[i + 8] = tokenSubKey[i] ^ 0x5c5c5c5c;
  }
  for (let i = 0; i < totalLen; i++) {
    macState[i & 15] = (macState[i & 15] + Math.imul(muxPlain[i] + i + 1, -2048144789)) | 0;
    if ((i & 255) === 255) {
      chachaQuarterRound(macState, 0, 5, 10, 15);
      chachaQuarterRound(macState, 1, 6, 11, 12);
      chachaQuarterRound(macState, 2, 7, 8, 13);
      chachaQuarterRound(macState, 3, 4, 9, 14);
    }
  }
  for (let r = 0; r < 64; r++) {
    chachaQuarterRound(macState, 0, 4, 8, 12);
    chachaQuarterRound(macState, 1, 5, 9, 13);
    chachaQuarterRound(macState, 2, 6, 10, 14);
    chachaQuarterRound(macState, 3, 7, 11, 15);
    chachaQuarterRound(macState, 0, 5, 10, 15);
    chachaQuarterRound(macState, 1, 6, 11, 12);
    chachaQuarterRound(macState, 2, 7, 8, 13);
    chachaQuarterRound(macState, 3, 4, 9, 14);
  }

  return {
    cipherBytes,
    macTag: macState.slice(0, 8)
  };
}

export function decryptAndAuthenticateOwnerVault(
  pinInput: string,
  cipherBytes: Uint8Array,
  expectedMacTag: Int32Array | number[],
  integrityGuard: number = 0x444d5634
): DecryptedOwnerVaultResult | null {
  const cleanPin = String(pinInput || '').trim();
  if (!cleanPin || !cipherBytes || cipherBytes.length <= 40) return null;
  const totalLen = cipherBytes.length;
  const { streamKey, tokenSubKey } = deriveSealedVaultKeys(cleanPin, integrityGuard);

  const muxPlain = new Uint8Array(totalLen);
  const blockState = new Int32Array(16);
  for (let i = 0; i < 8; i++) {
    blockState[i] = streamKey[i];
    blockState[i + 8] = tokenSubKey[i] ^ Math.imul(i + 1, -1640531527);
  }
  let fbk = 0x9d;
  for (let i = 0; i < totalLen; i++) {
    if ((i & 63) === 0) {
      blockState[12] = (blockState[12] + (i >>> 6) + 1) | 0;
      blockState[13] = (blockState[13] ^ fbk) | 0;
      for (let r = 0; r < 10; r++) {
        chachaQuarterRound(blockState, 0, 4, 8, 12);
        chachaQuarterRound(blockState, 1, 5, 9, 13);
        chachaQuarterRound(blockState, 2, 6, 10, 14);
        chachaQuarterRound(blockState, 3, 7, 11, 15);
        chachaQuarterRound(blockState, 0, 5, 10, 15);
        chachaQuarterRound(blockState, 1, 6, 11, 12);
        chachaQuarterRound(blockState, 2, 7, 8, 13);
        chachaQuarterRound(blockState, 3, 4, 9, 14);
      }
    }
    const lane = (i >> 2) & 15;
    const shift = (i & 3) << 3;
    const ks = ((blockState[lane] >>> shift) ^ fbk ^ ((i * 37) & 0xff)) & 0xff;
    const c = cipherBytes[i] & 0xff;
    const p = (c ^ ks) & 0xff;
    muxPlain[i] = p;
    fbk = ((c * 67) ^ p ^ ks ^ (i & 0xff)) & 0xff;
  }

  const macState = new Int32Array(16);
  for (let i = 0; i < 8; i++) {
    macState[i] = streamKey[i] ^ 0x36363636;
    macState[i + 8] = tokenSubKey[i] ^ 0x5c5c5c5c;
  }
  for (let i = 0; i < totalLen; i++) {
    macState[i & 15] = (macState[i & 15] + Math.imul(muxPlain[i] + i + 1, -2048144789)) | 0;
    if ((i & 255) === 255) {
      chachaQuarterRound(macState, 0, 5, 10, 15);
      chachaQuarterRound(macState, 1, 6, 11, 12);
      chachaQuarterRound(macState, 2, 7, 8, 13);
      chachaQuarterRound(macState, 3, 4, 9, 14);
    }
  }
  for (let r = 0; r < 64; r++) {
    chachaQuarterRound(macState, 0, 4, 8, 12);
    chachaQuarterRound(macState, 1, 5, 9, 13);
    chachaQuarterRound(macState, 2, 6, 10, 14);
    chachaQuarterRound(macState, 3, 7, 11, 15);
    chachaQuarterRound(macState, 0, 5, 10, 15);
    chachaQuarterRound(macState, 1, 6, 11, 12);
    chachaQuarterRound(macState, 2, 7, 8, 13);
    chachaQuarterRound(macState, 3, 4, 9, 14);
  }

  let diff = 0;
  for (let i = 0; i < 8; i++) {
    diff |= macState[i] ^ expectedMacTag[i];
  }
  if (diff !== 0) {
    muxPlain.fill(0);
    return null;
  }

  const slots = computeScatteredTokenSlots(tokenSubKey, totalLen, 40);
  const slotSet = new Set(slots);
  let transportToken = '';
  for (let i = 0; i < 40; i++) {
    const kw = tokenSubKey[i & 7];
    const mask = ((kw >>> ((i & 3) * 8)) ^ Math.imul(i + 53, -2048144789)) & 0xff;
    transportToken += String.fromCharCode((muxPlain[slots[i]] ^ mask) & 0xff);
  }

  const htmlBytes = new Uint8Array(totalLen - 40);
  let hPtr = 0;
  for (let pos = 0; pos < totalLen; pos++) {
    if (!slotSet.has(pos)) {
      htmlBytes[hPtr++] = muxPlain[pos];
    }
  }
  const panelHtml = new TextDecoder().decode(htmlBytes);
  muxPlain.fill(0);
  return { panelHtml, transportToken };
}

export function reconstructTransportAuthToken(
  pinInput?: string,
  cipherBytes?: Uint8Array,
  expectedMacTag?: Int32Array | number[]
): string {
  if (!pinInput || !cipherBytes || !expectedMacTag) return '';
  const decrypted = decryptAndAuthenticateOwnerVault(pinInput, cipherBytes, expectedMacTag);
  return decrypted ? decrypted.transportToken : '';
}

export function formatCollaborationArtistsLabel(
  mainArtistName: string,
  featArtistName?: string | null
): string {
  const main = String(mainArtistName || '').trim() || 'Dark Music';
  const feat = String(featArtistName || '').trim();
  if (!feat || feat === main) return main;
  return `${main}, ${feat}`;
}

export function entityHasArtist(
  entity: { artistId?: string; featArtistId?: string } | null | undefined,
  artistId: string
): boolean {
  if (!entity || !artistId) return false;
  return entity.artistId === artistId || (Boolean(entity.featArtistId) && entity.featArtistId === artistId);
}

export function isVersionBlockedByForceUpdate(
  currentVersion: number,
  forceUpdate: {
    active?: boolean;
    requiredVersion?: number;
    blockedVersions?: number[];
  } | null | undefined,
  isOwnerUnlocked: boolean = false
): boolean {
  if (!forceUpdate || !forceUpdate.active || isOwnerUnlocked) {
    return false;
  }
  const reqVer = Number(forceUpdate.requiredVersion) || 4.3;
  const blockedList = Array.isArray(forceUpdate.blockedVersions)
    ? forceUpdate.blockedVersions.map((v) => Number(v)).filter((v) => !Number.isNaN(v) && v < reqVer - 0.0001)
    : [];
  const isExplicitlyBlocked = blockedList.some((bv) => Math.abs(bv - currentVersion) < 0.0001);
  return currentVersion < reqVer - 0.0001 || isExplicitlyBlocked;
}

export function nextMonotonicTimestamp(
  now: number,
  ...knownTimestamps: Array<number | undefined | null>
): number {
  let maxKnown = 0;
  for (const ts of knownTimestamps) {
    const num = Number(ts) || 0;
    if (num > maxKnown) {
      maxKnown = num;
    }
  }
  return now > maxKnown ? now : maxKnown + 1000;
}

export function shouldPopulateOwnerFormField(params: {
  isFocused: boolean;
  isUserDirty: boolean;
  isOwnerUnlockedAndInitialized: boolean;
  lastSyncedSignature: string;
  incomingSignature: string;
}): boolean {
  if (params.isFocused) return false;
  if (params.isUserDirty) return false;
  if (params.isOwnerUnlockedAndInitialized) return false;
  if (params.lastSyncedSignature && params.lastSyncedSignature === params.incomingSignature) {
    return false;
  }
  return true;
}

export type ViewportLayoutMode = 'mobile' | 'desktop-2col' | 'desktop-3pane';

export function resolveViewportLayoutMode(viewportWidth: number): ViewportLayoutMode {
  const w = Number(viewportWidth) || 0;
  if (w < 1024) return 'mobile';
  if (w < 1280) return 'desktop-2col';
  return 'desktop-3pane';
}

export function computeQueuePreviewTracks<T extends { id: string }>(
  tracks: T[],
  currentTrackId: string | null | undefined,
  limit: number = 3,
  playNextQueueIds: string[] = []
): T[] {
  if (!Array.isArray(tracks) || tracks.length === 0 || limit <= 0) return [];
  const result: T[] = [];
  const seen = new Set<string>();

  for (const qId of playNextQueueIds) {
    if (result.length >= limit) break;
    const found = tracks.find((t) => t.id === qId);
    if (found && !seen.has(found.id)) {
      seen.add(found.id);
      result.push(found);
    }
  }

  const maxItems = Math.min(limit, Math.max(result.length, tracks.length - 1));
  if (maxItems === 0) return tracks.slice(0, 1);

  const curIdx = currentTrackId ? tracks.findIndex((t) => t.id === currentTrackId) : -1;
  const startIdx = curIdx >= 0 ? (curIdx + 1) % tracks.length : 0;
  for (let i = 0; i < tracks.length && result.length < maxItems; i++) {
    const candidate = tracks[(startIdx + i) % tracks.length];
    if (candidate && candidate.id !== currentTrackId && !seen.has(candidate.id)) {
      seen.add(candidate.id);
      result.push(candidate);
    }
  }
  return result;
}

export function enqueuePlayNextTrack(
  queue: string[],
  trackId: string
): string[] {
  const cleanId = String(trackId || '').trim();
  if (!cleanId) return Array.isArray(queue) ? [...queue] : [];
  const existing = Array.isArray(queue) ? queue.filter((id) => id !== cleanId) : [];
  return [cleanId, ...existing];
}

export function dequeuePlayNextTrack(
  queue: string[],
  validTrackIds: Set<string>
): { nextTrackId: string | null; remainingQueue: string[] } {
  if (!Array.isArray(queue) || queue.length === 0) {
    return { nextTrackId: null, remainingQueue: [] };
  }
  const remaining = [...queue];
  while (remaining.length > 0) {
    const candidate = remaining.shift()!;
    if (validTrackIds.has(candidate)) {
      return { nextTrackId: candidate, remainingQueue: remaining };
    }
  }
  return { nextTrackId: null, remainingQueue: [] };
}

export type ShareEntityType = 'track' | 'album' | 'artist';

export const DEFAULT_PUBLIC_SHARE_ORIGIN = 'https://ezzo4ka.github.io/darkmusic/';

export function resolveCanonicalShareBaseUrl(
  currentHref: string,
  defaultPublicOrigin: string = DEFAULT_PUBLIC_SHARE_ORIGIN
): string {
  const raw = String(currentHref || '').trim();
  if (!raw) return defaultPublicOrigin;
  if (/^(file:|capacitor:|ionic:|app:|about:|data:|blob:)/i.test(raw)) {
    return defaultPublicOrigin;
  }
  try {
    const u = new URL(raw);
    if (
      u.protocol !== 'http:' &&
      u.protocol !== 'https:'
    ) {
      return defaultPublicOrigin;
    }
    if (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '0.0.0.0' ||
      u.hostname.endsWith('.local')
    ) {
      return defaultPublicOrigin;
    }
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return defaultPublicOrigin;
  }
}

export function buildDeepLinkUrl(
  baseUrl: string,
  entityType: ShareEntityType,
  entityId: string
): string {
  const canonicalBase = resolveCanonicalShareBaseUrl(baseUrl);
  const cleanBase = String(canonicalBase || DEFAULT_PUBLIC_SHARE_ORIGIN).split('?')[0].split('#')[0];
  const cleanId = encodeURIComponent(String(entityId || '').trim());
  return `${cleanBase}?${entityType}=${cleanId}`;
}

export function formatShareMessageWithLink(params: {
  entityType: ShareEntityType;
  entityId: string;
  title: string;
  artistLabel?: string | null;
  currentHref: string;
  defaultPublicOrigin?: string;
}): { url: string; shareText: string } {
  const base = resolveCanonicalShareBaseUrl(
    params.currentHref,
    params.defaultPublicOrigin || DEFAULT_PUBLIC_SHARE_ORIGIN
  );
  const url = buildDeepLinkUrl(base, params.entityType, params.entityId);
  const cleanTitle = String(params.title || '').trim() || 'Dark Music';
  const cleanArtist = String(params.artistLabel || '').trim();

  if (params.entityType === 'track') {
    const label = cleanArtist ? `${cleanArtist} — ${cleanTitle}` : cleanTitle;
    return {
      url,
      shareText: `🎧 Слушайте в Dark Music: ${label}\n${url}`
    };
  }
  if (params.entityType === 'album') {
    const label = cleanArtist ? `${cleanArtist} — ${cleanTitle}` : cleanTitle;
    return {
      url,
      shareText: `🎧 Слушайте релиз в Dark Music: ${label}\n${url}`
    };
  }
  return {
    url,
    shareText: `🎧 Слушайте артиста в Dark Music: ${cleanTitle}\n${url}`
  };
}

export function parseDeepLinkParams(
  searchStr: string
): { entityType: ShareEntityType; entityId: string } | null {
  const raw = String(searchStr || '').trim();
  if (!raw) return null;
  let queryPart = raw;
  if (raw.includes('?')) {
    queryPart = raw.slice(raw.indexOf('?') + 1);
  }
  queryPart = queryPart.split('#')[0].replace(/^\?/, '').trim();
  if (!queryPart) return null;
  const params = new URLSearchParams(queryPart);
  const track = params.get('track')?.trim();
  if (track) return { entityType: 'track', entityId: track };
  const album = params.get('album')?.trim();
  if (album) return { entityType: 'album', entityId: album };
  const artist = params.get('artist')?.trim();
  if (artist) return { entityType: 'artist', entityId: artist };
  return null;
}

export function togglePersonalFavoriteTrack(
  favorites: Iterable<string>,
  trackId: string
): { updated: string[]; isAdded: boolean } {
  const cleanId = String(trackId || '').trim();
  const set = new Set(Array.from(favorites || []).filter(Boolean));
  if (!cleanId) {
    return { updated: Array.from(set), isAdded: false };
  }
  if (set.has(cleanId)) {
    set.delete(cleanId);
    return { updated: Array.from(set), isAdded: false };
  }
  const nextList = [cleanId, ...Array.from(set)];
  return { updated: nextList, isAdded: true };
}

export interface TrackActionOption {
  id: 'play_next' | 'toggle_favorite' | 'share_track' | 'go_artist' | 'go_feat_artist' | 'go_album';
  label: string;
}

export function buildTrackActionsDescriptor(params: {
  trackId: string;
  isLiked: boolean;
  artistName: string;
  featArtistName?: string | null;
  albumTitle?: string | null;
}): TrackActionOption[] {
  const items: TrackActionOption[] = [
    { id: 'play_next', label: 'Играть следующим' },
    {
      id: 'toggle_favorite',
      label: params.isLiked ? 'Убрать из Любимых треков' : 'Добавить в Любимые треки'
    },
    { id: 'share_track', label: 'Поделиться треком' },
    { id: 'go_artist', label: `Перейти к артисту (${params.artistName || 'Артист'})` }
  ];
  if (params.featArtistName && params.featArtistName.trim()) {
    items.push({
      id: 'go_feat_artist',
      label: `Перейти к артисту (${params.featArtistName.trim()})`
    });
  }
  if (params.albumTitle && params.albumTitle.trim()) {
    items.push({
      id: 'go_album',
      label: `Перейти к релизу «${params.albumTitle.trim()}»`
    });
  }
  return items;
}

export function resolveDesktopRightSidebarLayout(isCollapsed: boolean): {
  sidebarState: 'collapsed' | 'open';
  sidebarHidden: boolean;
  centerWorkspaceExpanded: boolean;
} {
  const collapsed = Boolean(isCollapsed);
  return {
    sidebarState: collapsed ? 'collapsed' : 'open',
    sidebarHidden: collapsed,
    centerWorkspaceExpanded: collapsed
  };
}

export function resolveDesktopLeftSidebarLayout(isCollapsed: boolean): {
  sidebarState: 'collapsed' | 'open';
  isMiniRail: boolean;
  widthPx: number;
} {
  const collapsed = Boolean(isCollapsed);
  return {
    sidebarState: collapsed ? 'collapsed' : 'open',
    isMiniRail: collapsed,
    widthPx: collapsed ? 76 : 290
  };
}

export function reorderScopedTracks<T extends { id: string }>(
  tracks: T[],
  targetId: string,
  direction: 'up' | 'down',
  predicate?: (track: T) => boolean
): { reordered: T[]; moved: boolean } {
  if (!Array.isArray(tracks) || tracks.length < 2) {
    return { reordered: Array.isArray(tracks) ? [...tracks] : [], moved: false };
  }
  const matchIndices: number[] = [];
  for (let i = 0; i < tracks.length; i++) {
    if (!predicate || predicate(tracks[i])) {
      matchIndices.push(i);
    }
  }
  const posInScope = matchIndices.findIndex((idx) => tracks[idx]?.id === targetId);
  if (posInScope === -1) {
    return { reordered: [...tracks], moved: false };
  }
  const neighborPosInScope = direction === 'up' ? posInScope - 1 : posInScope + 1;
  if (neighborPosInScope < 0 || neighborPosInScope >= matchIndices.length) {
    return { reordered: [...tracks], moved: false };
  }
  const actualIdxA = matchIndices[posInScope];
  const actualIdxB = matchIndices[neighborPosInScope];
  const copy = [...tracks];
  const temp = copy[actualIdxA];
  copy[actualIdxA] = copy[actualIdxB];
  copy[actualIdxB] = temp;
  return { reordered: copy, moved: true };
}

export function resolveNextTrackInContext(params: {
  contextTrackIds: string[];
  allTrackIds: string[];
  currentTrackId: string | null | undefined;
  playNextQueue: string[];
  isShuffle: boolean;
  direction?: 'next' | 'prev';
  randomIndexFn?: (length: number) => number;
}): { nextTrackId: string | null; remainingQueue: string[] } {
  const allValid = new Set(params.allTrackIds || []);
  const dir = params.direction || 'next';

  if (dir === 'next' && Array.isArray(params.playNextQueue) && params.playNextQueue.length > 0) {
    const dequeued = dequeuePlayNextTrack(params.playNextQueue, allValid);
    if (dequeued.nextTrackId) {
      return dequeued;
    }
  }

  const activePool = (Array.isArray(params.contextTrackIds) ? params.contextTrackIds : []).filter((id) =>
    allValid.has(id)
  );
  const pool = activePool.length > 0 ? activePool : Array.from(allValid);
  if (pool.length === 0) {
    return { nextTrackId: null, remainingQueue: params.playNextQueue || [] };
  }

  const curId = params.currentTrackId || null;
  if (params.isShuffle && pool.length > 1 && dir === 'next') {
    const candidates = pool.filter((id) => id !== curId);
    const pickFn = params.randomIndexFn || ((len: number) => Math.floor(Math.random() * len));
    const chosen = candidates[Math.max(0, Math.min(candidates.length - 1, pickFn(candidates.length)))];
    return { nextTrackId: chosen || pool[0], remainingQueue: params.playNextQueue || [] };
  }

  const idx = curId ? pool.indexOf(curId) : -1;
  if (idx === -1) {
    return { nextTrackId: pool[0], remainingQueue: params.playNextQueue || [] };
  }
  const nextIdx = dir === 'prev' ? (idx - 1 + pool.length) % pool.length : (idx + 1) % pool.length;
  return {
    nextTrackId: pool[nextIdx],
    remainingQueue: params.playNextQueue || []
  };
}

export function isValidGitHubTokenFormat(tokenStr?: string | null): boolean {
  if (!tokenStr || typeof tokenStr !== 'string') return false;
  const clean = tokenStr.trim();
  return /^(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|gho_[A-Za-z0-9]{30,})$/.test(clean);
}

export function resolveFullscreenPlayerBackdropUrl(params: {
  mainArtistBanner?: string | null;
  featArtistBanner?: string | null;
  mainArtistAvatar?: string | null;
  trackCover?: string | null;
}): string {
  const candidates = [
    params.mainArtistBanner,
    params.mainArtistAvatar,
    params.trackCover
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return '';
}

export function shouldProtectOwnerCatalogFromStaleSync(params: {
  isOwnerUnlocked: boolean;
  activeGitHubPushCount: number;
  lastLocalOwnerEditTime: number;
  now: number;
  incomingUpdatedAt?: number | null;
  localUpdatedAt?: number | null;
}): boolean {
  if (params.activeGitHubPushCount > 0) return true;
  if (params.isOwnerUnlocked) return true;
  if (params.lastLocalOwnerEditTime > 0 && params.now - params.lastLocalOwnerEditTime < 45000) {
    return true;
  }
  const incTs = Number(params.incomingUpdatedAt) || 0;
  const locTs = Number(params.localUpdatedAt) || 0;
  if (params.lastLocalOwnerEditTime > 0 && locTs > 0 && incTs > 0 && incTs < locTs) {
    return true;
  }
  return false;
}

export function resolveRightSidebarArtistCards<T extends { id: string }>(
  mainArtist: T | null | undefined,
  featArtist?: T | null | undefined
): T[] {
  const cards: T[] = [];
  if (mainArtist && mainArtist.id) {
    cards.push(mainArtist);
  }
  if (featArtist && featArtist.id && (!mainArtist || featArtist.id !== mainArtist.id)) {
    cards.push(featArtist);
  }
  return cards;
}

export type AppThemeId = 'dark' | 'ps5' | 'light';

export interface AppThemeDescriptor {
  id: AppThemeId;
  shortLabel: string;
  fullLabel: string;
  description: string;
  icon: string;
}

export const APP_THEMES: Record<AppThemeId, AppThemeDescriptor> = {
  dark: {
    id: 'dark',
    shortLabel: 'Тёмная',
    fullLabel: 'Обычная тёмная',
    description: 'Классическая фирменная тёмная тема Dark Music',
    icon: 'fa-moon'
  },
  ps5: {
    id: 'ps5',
    shortLabel: 'Неон',
    fullLabel: 'Неоновая (Стеклянная)',
    description: 'Полупрозрачный стеклянный интерфейс и плавно пульсирующий фиолетовый фон',
    icon: 'fa-wand-magic-sparkles'
  },
  light: {
    id: 'light',
    shortLabel: 'Светлая',
    fullLabel: 'Светлая (Белая)',
    description: 'Чистая дневная белая тема с высокой контрастностью',
    icon: 'fa-sun'
  }
};

export function resolveEffectiveAppTheme(params: {
  savedTheme?: string | null;
  systemPrefersLight: boolean;
  previousOsScheme?: 'light' | 'dark' | null;
}): AppThemeId {
  const currentOsScheme: AppThemeId = params.systemPrefersLight ? 'light' : 'dark';
  if (params.previousOsScheme && params.previousOsScheme !== currentOsScheme) {
    return currentOsScheme;
  }
  const cleanSaved = String(params.savedTheme || '').trim().toLowerCase();
  if (cleanSaved === 'dark' || cleanSaved === 'ps5' || cleanSaved === 'light') {
    return cleanSaved as AppThemeId;
  }
  return currentOsScheme;
}

export function resolveThemeOnSystemSchemeChange(
  systemPrefersLight: boolean
): AppThemeId {
  return systemPrefersLight ? 'light' : 'dark';
}

export function cycleNextAppTheme(currentTheme: AppThemeId): AppThemeId {
  if (currentTheme === 'dark') return 'ps5';
  if (currentTheme === 'ps5') return 'light';
  return 'dark';
}
