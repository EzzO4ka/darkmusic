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
  reconstructTransportAuthToken,
  formatCollaborationArtistsLabel,
  entityHasArtist,
  isVersionBlockedByForceUpdate,
  nextMonotonicTimestamp,
  shouldPopulateOwnerFormField,
  resolveViewportLayoutMode,
  computeQueuePreviewTracks,
  enqueuePlayNextTrack,
  dequeuePlayNextTrack,
  buildDeepLinkUrl,
  formatShareMessageWithLink,
  resolveCanonicalShareBaseUrl,
  parseDeepLinkParams,
  togglePersonalFavoriteTrack,
  buildTrackActionsDescriptor,
  resolveDesktopRightSidebarLayout,
  resolveDesktopLeftSidebarLayout,
  reorderScopedTracks,
  resolveNextTrackInContext,
  isValidGitHubTokenFormat,
  resolveFullscreenPlayerBackdropUrl,
  shouldProtectOwnerCatalogFromStaleSync,
  resolveRightSidebarArtistCards,
  resolveEffectiveAppTheme,
  resolveThemeOnSystemSchemeChange,
  cycleNextAppTheme,
  APP_THEMES
} from './ownerCatalogLogic';

test('generateArtistId transliterates Russian artist name into clean id', () => {
  const id = generateArtistId('МС ТЁМНЫЙ БАС', 1700000000000);
  assert.equal(id, 'art_ms_temnyy_bas_1700000000000');
});

test('createCustomArtistRecord builds complete artist object with defaults and bannerFile', () => {
  const artist = createCustomArtistRecord({
    name: 'МС КИБЕР',
    role: 'Cyber Phonk',
    bannerFile: 'covers/kiber_banner.jpg',
    now: 1700000000123
  });
  assert.equal(artist.id, 'art_ms_kiber_1700000000123');
  assert.equal(artist.name, 'МС КИБЕР');
  assert.equal(artist.role, 'Cyber Phonk');
  assert.equal(artist.bannerFile, 'covers/kiber_banner.jpg');
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

test('formatCollaborationArtistsLabel joins artists with a comma without feat and entityHasArtist matches video feats', () => {
  assert.equal(formatCollaborationArtistsLabel('МС ГЕИЧ', 'МС МАКАКА'), 'МС ГЕИЧ, МС МАКАКА');
  assert.equal(formatCollaborationArtistsLabel('МС ГЕИЧ', ''), 'МС ГЕИЧ');
  assert.equal(formatCollaborationArtistsLabel('МС ГЕИЧ', 'МС ГЕИЧ'), 'МС ГЕИЧ');

  const videoClip = { id: 'vid_1', artistId: 'mc_geich', featArtistId: 'mc_makaka' };
  assert.equal(entityHasArtist(videoClip, 'mc_geich'), true);
  assert.equal(entityHasArtist(videoClip, 'mc_makaka'), true);
  assert.equal(entityHasArtist(videoClip, 'mc_ezdit'), false);
});

test('isVersionBlockedByForceUpdate blocks v1.0, v2.0, v3.0, v3.1, v4.0, v4.1 and allows current v4.2', () => {
  const forceConfig = {
    active: true,
    requiredVersion: 4.2,
    blockedVersions: [1.0, 2.0, 3.0, 3.1, 4.0, 4.1]
  };
  assert.equal(isVersionBlockedByForceUpdate(1.0, forceConfig, false), true);
  assert.equal(isVersionBlockedByForceUpdate(2.0, forceConfig, false), true);
  assert.equal(isVersionBlockedByForceUpdate(3.0, forceConfig, false), true);
  assert.equal(isVersionBlockedByForceUpdate(3.1, forceConfig, false), true);
  assert.equal(isVersionBlockedByForceUpdate(4.0, forceConfig, false), true);
  assert.equal(isVersionBlockedByForceUpdate(4.1, forceConfig, false), true);
  assert.equal(isVersionBlockedByForceUpdate(4.2, forceConfig, false), false);
  assert.equal(isVersionBlockedByForceUpdate(4.1, forceConfig, true), false);
  assert.equal(APP_THEMES.ps5.shortLabel.includes('PS5'), false);
  assert.equal(APP_THEMES.ps5.fullLabel.includes('PS5'), false);
});

test('nextMonotonicTimestamp always advances past future catalog timestamps and shouldPopulateOwnerFormField never overwrites dirty or unlocked owner inputs', () => {
  // Real device clock (e.g., 1746000000000) vs catalog timestamp (1793614922360)
  const ts = nextMonotonicTimestamp(1746000000000, 1793614911364, 1793614922360);
  assert.equal(ts, 1793614923360);
  assert.ok(ts > 1793614922360);

  // Dirty input (user typed new push text) is never overwritten by background sync
  assert.equal(
    shouldPopulateOwnerFormField({
      isFocused: false,
      isUserDirty: true,
      isOwnerUnlockedAndInitialized: false,
      lastSyncedSignature: 'old_sig',
      incomingSignature: 'new_sig'
    }),
    false
  );

  // Unlocked and initialized owner field is never overwritten by background sync
  assert.equal(
    shouldPopulateOwnerFormField({
      isFocused: false,
      isUserDirty: false,
      isOwnerUnlockedAndInitialized: true,
      lastSyncedSignature: 'old_sig',
      incomingSignature: 'new_sig'
    }),
    false
  );

  // Clean uninitialized field is populated once on startup
  assert.equal(
    shouldPopulateOwnerFormField({
      isFocused: false,
      isUserDirty: false,
      isOwnerUnlockedAndInitialized: false,
      lastSyncedSignature: '',
      incomingSignature: 'init_sig'
    }),
    true
  );
});

test('resolveViewportLayoutMode and computeQueuePreviewTracks support mobile, Spotify desktop layouts, and Play Next priority', () => {
  assert.equal(resolveViewportLayoutMode(390), 'mobile');
  assert.equal(resolveViewportLayoutMode(768), 'mobile');
  assert.equal(resolveViewportLayoutMode(1024), 'desktop-2col');
  assert.equal(resolveViewportLayoutMode(1440), 'desktop-3pane');

  const sampleTracks = [
    { id: 't1', title: 'Track 1' },
    { id: 't2', title: 'Track 2' },
    { id: 't3', title: 'Track 3' },
    { id: 't4', title: 'Track 4' }
  ];
  const nextAfterT2 = computeQueuePreviewTracks(sampleTracks, 't2', 3);
  assert.deepEqual(
    nextAfterT2.map((t) => t.id),
    ['t3', 't4', 't1']
  );

  const withPriorityQueue = computeQueuePreviewTracks(sampleTracks, 't2', 3, ['t4']);
  assert.deepEqual(
    withPriorityQueue.map((t) => t.id),
    ['t4', 't3', 't1']
  );
});

test('enqueuePlayNextTrack, dequeuePlayNextTrack, buildDeepLinkUrl, parseDeepLinkParams, and togglePersonalFavoriteTrack work accurately', () => {
  let queue: string[] = [];
  queue = enqueuePlayNextTrack(queue, 'trk_10');
  queue = enqueuePlayNextTrack(queue, 'trk_20');
  // Most recently queued "Play Next" goes to the front of the queue
  assert.deepEqual(queue, ['trk_20', 'trk_10']);

  const validSet = new Set(['trk_10', 'trk_20', 'trk_30']);
  const step1 = dequeuePlayNextTrack(queue, validSet);
  assert.equal(step1.nextTrackId, 'trk_20');
  assert.deepEqual(step1.remainingQueue, ['trk_10']);

  const trackUrl = buildDeepLinkUrl('https://ezzo4ka.github.io/index.html?v=4.0', 'track', 'trk_123');
  assert.equal(trackUrl, 'https://ezzo4ka.github.io/index.html?track=trk_123');
  assert.deepEqual(parseDeepLinkParams('?track=trk_123'), { entityType: 'track', entityId: 'trk_123' });
  assert.deepEqual(parseDeepLinkParams('darkmusic://open?album=alb_55'), { entityType: 'album', entityId: 'alb_55' });
  assert.deepEqual(parseDeepLinkParams('?artist=mc_geich'), { entityType: 'artist', entityId: 'mc_geich' });
  assert.equal(parseDeepLinkParams('?v=4.0'), null);

  const fav1 = togglePersonalFavoriteTrack([], 'trk_10');
  assert.equal(fav1.isAdded, true);
  assert.deepEqual(fav1.updated, ['trk_10']);

  const fav2 = togglePersonalFavoriteTrack(fav1.updated, 'trk_10');
  assert.equal(fav2.isAdded, false);
  assert.deepEqual(fav2.updated, []);
});

test('buildTrackActionsDescriptor and resolveDesktopRightSidebarLayout return accurate 3-dots menu options and collapsible sidebar states', () => {
  const actions = buildTrackActionsDescriptor({
    trackId: 'trk_1',
    isLiked: false,
    artistName: 'МС ЕЗДИТЬ',
    featArtistName: 'МС ГЕИЧ',
    albumTitle: 'Лирика Житухи'
  });
  assert.deepEqual(
    actions.map((a) => a.id),
    ['play_next', 'toggle_favorite', 'share_track', 'go_artist', 'go_feat_artist', 'go_album']
  );
  assert.equal(actions[1].label, 'Добавить в Любимые треки');

  const likedActions = buildTrackActionsDescriptor({
    trackId: 'trk_1',
    isLiked: true,
    artistName: 'МС ГЕИЧ'
  });
  assert.equal(likedActions[1].label, 'Убрать из Любимых треков');
  assert.equal(likedActions.length, 4);

  assert.deepEqual(resolveDesktopRightSidebarLayout(false), {
    sidebarState: 'open',
    sidebarHidden: false,
    centerWorkspaceExpanded: false
  });
  assert.deepEqual(resolveDesktopRightSidebarLayout(true), {
    sidebarState: 'collapsed',
    sidebarHidden: true,
    centerWorkspaceExpanded: true
  });

  assert.deepEqual(resolveDesktopLeftSidebarLayout(false), {
    sidebarState: 'open',
    isMiniRail: false,
    widthPx: 290
  });
  assert.deepEqual(resolveDesktopLeftSidebarLayout(true), {
    sidebarState: 'collapsed',
    isMiniRail: true,
    widthPx: 76
  });

  assert.equal(isValidGitHubTokenFormat('ghp_1234567890abcdefghijklmnopqrstuvwx'), true);
  assert.equal(isValidGitHubTokenFormat('my_autofilled_password'), false);
  assert.equal(isValidGitHubTokenFormat('7291'), false);
  assert.equal(isValidGitHubTokenFormat(''), false);

  assert.equal(
    resolveFullscreenPlayerBackdropUrl({
      mainArtistBanner: 'banners/mc_geich2.jpg',
      featArtistBanner: 'banners/mc_ezdit.jpg',
      mainArtistAvatar: 'avatars/mc_geich.jpg',
      trackCover: 'covers/trk.jpg'
    }),
    'banners/mc_geich2.jpg'
  );
  assert.equal(
    resolveFullscreenPlayerBackdropUrl({
      mainArtistBanner: '',
      featArtistBanner: 'banners/mc_geich2.jpg',
      mainArtistAvatar: 'avatars/mc_ezdit.jpg'
    }),
    'avatars/mc_ezdit.jpg'
  );
  assert.equal(
    resolveFullscreenPlayerBackdropUrl({
      mainArtistBanner: '',
      featArtistBanner: '',
      mainArtistAvatar: 'avatars/mc_geich.jpg'
    }),
    'avatars/mc_geich.jpg'
  );

  assert.equal(
    shouldProtectOwnerCatalogFromStaleSync({
      isOwnerUnlocked: true,
      activeGitHubPushCount: 0,
      lastLocalOwnerEditTime: 0,
      now: 100000
    }),
    true
  );
  assert.equal(
    shouldProtectOwnerCatalogFromStaleSync({
      isOwnerUnlocked: false,
      activeGitHubPushCount: 0,
      lastLocalOwnerEditTime: 50000,
      now: 120000,
      incomingUpdatedAt: 1000,
      localUpdatedAt: 2000
    }),
    true
  );
  assert.equal(
    shouldProtectOwnerCatalogFromStaleSync({
      isOwnerUnlocked: false,
      activeGitHubPushCount: 0,
      lastLocalOwnerEditTime: 0,
      now: 120000,
      incomingUpdatedAt: 2000,
      localUpdatedAt: 1000
    }),
    false
  );

  const art1 = { id: 'mc_ezdit', name: 'МС ЕЗДИТЬ' };
  const art2 = { id: 'mc_geich', name: 'МС ГЕИЧ' };
  assert.deepEqual(
    resolveRightSidebarArtistCards(art1, null).map((a) => a.id),
    ['mc_ezdit']
  );
  assert.deepEqual(
    resolveRightSidebarArtistCards(art1, art1).map((a) => a.id),
    ['mc_ezdit']
  );
  assert.deepEqual(
    resolveRightSidebarArtistCards(art1, art2).map((a) => a.id),
    ['mc_ezdit', 'mc_geich']
  );
});

test('reorderScopedTracks moves tracks up and down within an artist or album scope without disturbing unrelated tracks', () => {
  const catalogTracks = [
    { id: 't1', artistId: 'mc_geich', albumId: 'a1' },
    { id: 't2', artistId: 'mc_makaka', albumId: 'a2' },
    { id: 't3', artistId: 'mc_geich', albumId: 'a1' },
    { id: 't4', artistId: 'mc_geich', albumId: 'a1' }
  ];

  // Move t3 up within mc_geich's tracks -> swaps t3 (index 2) with t1 (index 0), keeping t2 at index 1!
  const step1 = reorderScopedTracks(
    catalogTracks,
    't3',
    'up',
    (t) => t.artistId === 'mc_geich'
  );
  assert.equal(step1.moved, true);
  assert.deepEqual(
    step1.reordered.map((t) => t.id),
    ['t3', 't2', 't1', 't4']
  );

  // Move t1 down within mc_geich's tracks -> swaps t1 (index 2) with t4 (index 3)
  const step2 = reorderScopedTracks(
    step1.reordered,
    't1',
    'down',
    (t) => t.artistId === 'mc_geich'
  );
  assert.equal(step2.moved, true);
  assert.deepEqual(
    step2.reordered.map((t) => t.id),
    ['t3', 't2', 't4', 't1']
  );
});

test('formatShareMessageWithLink converts file:// and localhost paths into public https://ezzo4ka.github.io/darkmusic/ URLs with Russian message', () => {
  assert.equal(
    resolveCanonicalShareBaseUrl('file:///C:/Users/Admin/AppData/Local/Programs/dark-music/resources/app.asar/index.html'),
    'https://ezzo4ka.github.io/darkmusic/'
  );
  assert.equal(
    resolveCanonicalShareBaseUrl('http://localhost:3000/index.html'),
    'https://ezzo4ka.github.io/darkmusic/'
  );

  const shareTrack = formatShareMessageWithLink({
    entityType: 'track',
    entityId: 'trk_1793566754812',
    title: 'Лирика Житухи',
    artistLabel: 'МС ЕЗДИТЬ, МС ГЕИЧ',
    currentHref: 'file:///C:/DarkMusic/index.html'
  });
  assert.equal(shareTrack.url, 'https://ezzo4ka.github.io/darkmusic/?track=trk_1793566754812');
  assert.equal(
    shareTrack.shareText,
    '🎧 Слушайте в Dark Music: МС ЕЗДИТЬ, МС ГЕИЧ — Лирика Житухи\nhttps://ezzo4ka.github.io/darkmusic/?track=trk_1793566754812'
  );
});

test('resolveNextTrackInContext plays album and artist tracks sequentially instead of jumping to random global tracks', () => {
  const allIds = ['trk_global_1', 'trk_alb_1', 'trk_alb_2', 'trk_alb_3', 'trk_global_2'];
  const albumIds = ['trk_alb_1', 'trk_alb_2', 'trk_alb_3'];

  const next1 = resolveNextTrackInContext({
    contextTrackIds: albumIds,
    allTrackIds: allIds,
    currentTrackId: 'trk_alb_1',
    playNextQueue: [],
    isShuffle: false,
    direction: 'next'
  });
  assert.equal(next1.nextTrackId, 'trk_alb_2');

  const next2 = resolveNextTrackInContext({
    contextTrackIds: albumIds,
    allTrackIds: allIds,
    currentTrackId: 'trk_alb_3',
    playNextQueue: [],
    isShuffle: false,
    direction: 'next'
  });
  assert.equal(next2.nextTrackId, 'trk_alb_1');

  const prev1 = resolveNextTrackInContext({
    contextTrackIds: albumIds,
    allTrackIds: allIds,
    currentTrackId: 'trk_alb_1',
    playNextQueue: [],
    isShuffle: false,
    direction: 'prev'
  });
  assert.equal(prev1.nextTrackId, 'trk_alb_3');
});

test('resolveEffectiveAppTheme, resolveThemeOnSystemSchemeChange, and cycleNextAppTheme support all 3 themes and OS light/dark sync', () => {
  // When no manual theme is saved, system light -> 'light', system dark -> 'dark' (original dark theme)
  assert.equal(resolveEffectiveAppTheme({ savedTheme: null, systemPrefersLight: true }), 'light');
  assert.equal(resolveEffectiveAppTheme({ savedTheme: '', systemPrefersLight: false }), 'dark');

  // When a valid theme is explicitly selected, it is respected
  assert.equal(resolveEffectiveAppTheme({ savedTheme: 'ps5', systemPrefersLight: true }), 'ps5');
  assert.equal(resolveEffectiveAppTheme({ savedTheme: 'light', systemPrefersLight: false }), 'light');
  assert.equal(resolveEffectiveAppTheme({ savedTheme: 'dark', systemPrefersLight: true }), 'dark');

  // When OS color scheme changes between sessions or reloads, it automatically switches to the new OS theme
  assert.equal(
    resolveEffectiveAppTheme({ savedTheme: 'dark', systemPrefersLight: true, previousOsScheme: 'dark' }),
    'light'
  );
  assert.equal(
    resolveEffectiveAppTheme({ savedTheme: 'light', systemPrefersLight: false, previousOsScheme: 'light' }),
    'dark'
  );

  // When OS color scheme changes dynamically, light -> 'light', dark -> 'dark'
  assert.equal(resolveThemeOnSystemSchemeChange(true), 'light');
  assert.equal(resolveThemeOnSystemSchemeChange(false), 'dark');

  // Cycling through the 3 themes: dark -> ps5 -> light -> dark
  assert.equal(cycleNextAppTheme('dark'), 'ps5');
  assert.equal(cycleNextAppTheme('ps5'), 'light');
  assert.equal(cycleNextAppTheme('light'), 'dark');
  assert.equal(Object.keys(APP_THEMES).length, 3);
});
