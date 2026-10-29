import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateArtistId,
  createCustomArtistRecord,
  buildDeleteConfirmDescriptor,
  createSystemPushBroadcast,
  shouldTriggerSystemPush
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
