export interface ArtistRecord {
  id: string;
  name: string;
  role: string;
  gradient: string;
  icon: string;
  avatarFile: string;
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
