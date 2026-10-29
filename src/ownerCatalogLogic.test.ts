import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateArtistId,
  createCustomArtistRecord,
  buildDeleteConfirmDescriptor,
  createSystemPushBroadcast,
  shouldTriggerSystemPush,
  extractUnseenBackgroundNotifications,
  shouldApplyAuthoritativeRemoteCatalog,
  verifyOwnerAccessPin,
  reconstructTransportAuthToken
} from './ownerCatalogLogic';

test('generateArtistId transliterates Russian artist name into clean id', () => {
  const id = generateArtistId('МС ТЁМНЫЙ БАС', 1700000000000);
  assert.equal(id, 'art_ms_temnyy_bas_1700000000000');
});

test('createCustomArtistRecord builds complete artist object with defaults', () => {
  const artist = createCustomArtistRecord({
    name: 'МС КИБЕР',
    role: 'Cyber Phonk',
    now: 1700000000123
  });
  assert.equal(artist.id, 'art_ms_kiber_1700000000123');
  assert.equal(artist.name, 'МС КИБЕР');
  assert.equal(artist.role, 'Cyber Phonk');
  assert.equal(artist.isCustom, true);
  assert.equal(artist.facts.length, 1);
  assert.ok(artist.facts[0].includes('МС КИБЕР'));
});

test('buildDeleteConfirmDescriptor returns accurate Russian modal copy for each type', () => {
  const trackDesc = buildDeleteConfirmDescriptor('track', 'trk_1', 'Ночной Дрифт');
  assert.equal(trackDesc.typeBadge, 'УДАЛЕНИЕ ТРЕКА');
  assert.equal(trackDesc.title, 'Удалить трек «Ночной Дрифт»?');

  const artistDesc = buildDeleteConfirmDescriptor('artist', 'art_1', 'МС КИБЕР');
  assert.equal(artistDesc.typeBadge, 'УДАЛЕНИЕ АРТИСТА');
  assert.equal(artistDesc.title, 'Удалить артиста «МС КИБЕР»?');
});

test('createSystemPushBroadcast and shouldTriggerSystemPush deduplicate seen notifications', () => {
  const push = createSystemPushBroadcast({
    title: 'Новый релиз!',
    message: 'Слушайте новый трек в Dark Music',
    enable: true,
    now: 1700000000999
  });
  assert.equal(push.id, 'push_1700000000999');
  assert.equal(push.active, true);

  const seen = new Set<string>();
  assert.equal(shouldTriggerSystemPush(push, seen), true);

  seen.add(push.id);
  assert.equal(shouldTriggerSystemPush(push, seen), false);
});

test('extractUnseenBackgroundNotifications delivers system push and background broadcasts when inactive', () => {
  const seen = new Set<string>();
  const catalog = {
    systemPushBroadcast: {
      id: 'push_100',
      title: 'Dark Music Push',
      message: 'Вышел новый альбом!',
      imageFile: 'logo.png',
      active: true,
      createdAt: 100
    },
    tempBroadcast: {
      id: 'tmp_200',
      title: 'Срочное объявление',
      message: 'Стрим через 5 минут',
      active: true,
      createdAt: 200
    },
    pinnedBroadcast: {
      id: 'pin_300',
      title: 'Важно',
      message: 'Обновление каталога',
      active: true,
      updatedAt: 300
    }
  };

  // When app is active, only systemPushBroadcast is extracted for the OS shade
  const activeNotifs = extractUnseenBackgroundNotifications(catalog, seen, false);
  assert.equal(activeNotifs.length, 1);
  assert.equal(activeNotifs[0].id, 'push_100');

  // When app is inactive (minimized/background), all 3 notification types are routed to the OS shade
  const inactiveNotifs = extractUnseenBackgroundNotifications(catalog, seen, true);
  assert.equal(inactiveNotifs.length, 3);
  assert.deepEqual(
    inactiveNotifs.map((n) => n.id),
    ['push_100', 'bg_tmp_200', 'bg_pin_300']
  );

  // Once marked seen, they are not duplicated
  inactiveNotifs.forEach((n) => seen.add(n.id));
  const afterSeen = extractUnseenBackgroundNotifications(catalog, seen, true);
  assert.equal(afterSeen.length, 0);
});

test('shouldApplyAuthoritativeRemoteCatalog applies remote catalog regardless of clock skew when fingerprint changes', () => {
  assert.equal(shouldApplyAuthoritativeRemoteCatalog('fp_old', 'fp_new'), true);
  assert.equal(shouldApplyAuthoritativeRemoteCatalog('fp_same', 'fp_same'), false);
});

test('verifyOwnerAccessPin validates code via 65,536-round ChaCha20-ARX sponge and rejects wrong codes', () => {
  const dummyTag = [
    -545267346, -1904110289, -1031583527, -549424254,
    677446364, -504107950, 1783861268, 1080362546
  ];
  assert.equal(verifyOwnerAccessPin('0000', 'test_salt', dummyTag), false);
  assert.equal(verifyOwnerAccessPin('1234', 'test_salt', dummyTag), false);
  assert.equal(verifyOwnerAccessPin('7392', 'test_salt', dummyTag), true);

  const token = reconstructTransportAuthToken();
  assert.equal(token.length, 40);
});

