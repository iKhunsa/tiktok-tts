# Graph Report - .  (2026-08-27)

## Corpus Check
- Large corpus: 2790 files · ~7,336,638 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1594 nodes · 2818 edges · 102 communities (95 shown, 7 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 368 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 79
- Community 80
- Community 82
- Community 83
- Community 84
- Community 96

## God Nodes (most connected - your core abstractions)
1. `files` - 26 edges
2. `getConfigSnapshot()` - 25 edges
3. `register()` - 25 edges
4. `register()` - 23 edges
5. `register()` - 23 edges
6. `createModerationStore()` - 23 edges
7. `register()` - 22 edges
8. `applyModAction()` - 15 edges
9. `c()` - 15 edges
10. `broadcastOauthStatus()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `patchPlatformConfig()` --indirect_call--> `k()`  [INFERRED]
  configuracion/routes/patch-platform-config.js → public/vendor/driver.js
- `list()` --indirect_call--> `v()`  [INFERRED]
  moderacion/store/list.js → public/vendor/driver.js
- `load()` --indirect_call--> `v()`  [INFERRED]
  moderacion/store/load.js → public/vendor/driver.js
- `handleMusicRequest()` --indirect_call--> `k()`  [INFERRED]
  sonido/musica/handle-request.js → public/vendor/driver.js
- `extractYoutubeVideoId()` --indirect_call--> `re()`  [INFERRED]
  sonido/musica/extract-youtube-video-id.js → public/vendor/driver.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Secretos embebidos en build de CI, aceptados como riesgo, mitigados con rotacion** — claudemd_secrets_embebidos_riesgo_aceptado, claudemd_rotation_runbook [INFERRED 0.85]
- **Fases Fundacionales del Rebuild (Core, Configuracion, Idioma)** — fase_01_core, fase_02_configuracion, fase_03_idioma [EXTRACTED 0.75]
- **Primer Punto de Integracion Multi-Dominio (Chat depende de Moderacion y Canales)** — fase_07_chat, fase_05_moderacion, fase_06_canales [EXTRACTED 0.85]
- **Domains decoupled via bus/contract pattern (overlay, movil, clips, bot)** — fase08_overlay_contrato, fase10_bot_contrato, fase11_clips_contrato [INFERRED 0.85]
- **IPC contracts defined early, wired in Fase 12 electron-shell** — fase09_soundpad_shortcuts_ipc, fase11_global_shortcut, fase12_ipc_bridge [EXTRACTED 0.90]

## Communities (102 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (55): checkForUpdates(), fs, { runYtdlp }, commonArgs(), { checkForUpdates }, createMusicEngine(), { createStream }, { ensureReady } (+47 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (49): { disconnectTwitchOAuth }, oauthDisconnect(), oauthStart(), { startTwitchDeviceAuth }, oauthStatus(), { oauthStatusPayload }, { broadcastOauthStatus }, connectTwitchEventSubSocket() (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (29): Buffer, fs, path, CreatorCache, fs, path, crypto, machineId() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (36): cleanName(), { ADMIN_ANNOUNCE_TEXT, pickAnnounceText }, { cleanName }, emitChatMessage(), extractKickMessage(), extractTiktokMessage(), extractTwitchMessage(), extractYoutubeMessage() (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (48): build, appId, directories, extraResources, files, npmRebuild, nsis, productName (+40 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (43): electron, electron-builder, electron-updater, eslint, express, google-tts-api, multer, author (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (35): { addChannel }, { connect }, { createChannelState }, { createRateLimiterState, connectRateLimiter }, { disconnect }, { ensureTwitchAccessToken }, kickBrowserContract, { listChannels } (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (28): { DICT_FILTER_LANGS }, { GOOGLE_TTS_LANGS }, { VOICE_TO_DICT_LANG }, DICT_FILTER_LANGS, GOOGLE_TTS_LANGS, filtrar(), idiomaFiltrarContract, { messageMatchesDictLang } (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (33): evaluate(), createDuplicateTrackerState(), sweepDuplicateTracker(), { ban }, { blockedWordsExport }, { blockedWordsGet }, { blockedWordsImport }, { blockWord } (+25 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (39): overlay/compute-gift-usd.js, Contrato /movil: espejo de solo lectura + traductor de comandos, movil/routes/qr.js, movil/routes/command.js, movil/validate-request.js, Contrato /overlay: consumidor puro de estado visual, overlay/index.js register(), Fase 8 â€” /overlay y /movil (+31 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (35): { attachSoundpadShortcuts }, { ban }, { configGet }, { configPatch }, { createMusicEngine }, { createMusicState }, { createTtsRateLimiterState }, { DATA_BASE } (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (32): ATTACHMENT_SIZE_LADDER, fs, logExito(), logFalloFinal(), postToDiscordWebhook(), sendAndLog(), { sendDiscordAttempt }, fs (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (27): MOBILE_ALLOWED_ACTIONS, hasDesktopClient(), WebSocket, { command }, { createMobileState }, { localIp }, { mobilePage }, { qr } (+19 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (34): applyConfigPatch(), a(), ae(), b(), c(), d(), E(), ee() (+26 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (29): cleanKickSlug(), connectKick(), disconnectKick(), addChannel(), { broadcastChannels }, { cleanKickSlug }, { cleanTwitchChannel }, { connectKick } (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (27): fs, loadSounds(), del(), fs, { loadSounds }, path, { saveSounds }, { syncSoundPadsToMobileState } (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (27): cleanNick(), { cleanNick }, { computeGiftUsd }, { createOverlayState }, { deleteBg }, express, { extractFollowerCount }, { giftsList } (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (21): broadcastChannels(), { broadcastChannels }, { cleanTiktokUsername }, connect(), { connectTiktokChannel }, { broadcastChannels }, { cleanTiktokUsername }, { cleanupAfterLastTikTokChannel } (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (20): { createConfigStore }, { createPlatformConfigStore }, { getConfig }, { getLogs }, { getLogsDownloadAll }, { getPlatformConfig }, { getSessionLogFile }, { getStatus } (+12 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (20): getConfigSnapshot(), patchConfig(), { getConfigSnapshot }, musicBroadcastState(), ban(), { getConfigSnapshot, patchConfig }, configGet(), { getConfigSnapshot } (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (22): { broadcastChannels }, { cleanKickSlug }, { cleanTiktokUsername }, { cleanTwitchChannel }, { cleanupAfterLastTikTokChannel }, { clearReconnectTimer: clearTwitchReconnectTimer }, { clearReconnectTimer: clearYoutubeReconnectTimer, clearWatchdogTimer: clearYoutubeWatchdogTimer }, { disconnectKick } (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (17): animate(), colorsToRgb(), confettiCannon(), convert(), decorate(), ellipse(), getDefaultFire(), getOrigin() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (19): advanceMusicQueue(), { getConfigSnapshot }, { musicBroadcastState }, { resolveFullTrack }, extractYoutubeVideoId(), { advanceMusicQueue }, { getConfigSnapshot }, handleMusicRequest() (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (17): applyModAction(), isAdminIdentity(), isAdminTarget(), resolveModTarget(), resolveUntil(), ban(), { resolveUntil, applyModAction }, { applyModAction } (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (20): attachBroadcast(), WebSocket, http, startHttpServer(), app, { attachBroadcast }, bus, { createApp, attachFallbackStatus } (+12 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (21): { clearAll }, { clearPunishments }, { createState, SWEEP_MS }, { flush }, { get }, { getEffective }, { keyFor }, { list } (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (17): ensureSingleInstance(), { app, globalShortcut }, { attachIpcBridge }, { createTray, buildTrayMenu, showStartupError }, { createWindow, showMainWindow, waitForServer, PORT }, { ensureSingleInstance }, fs, { GLOBAL_SHORTCUT } (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (17): backupAndReset(), fs, { backupAndReset }, fs, load(), { normalizeRecord }, { parseKey }, { purge } (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (16): getEffective(), { isActive }, isActive(), { isActive }, list(), SORTS, { toDTO }, { isActive } (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.26
Nodes (21): Arquitectura Propuesta, Blocked Words List, Aislamiento de Fallos por Dominio, Contrato de Bus de Eventos, Fail-Open de Moderacion, Fase 00 - Archivar Backend Viejo, Fase 01 - Core, Fase 02 - Configuracion (+13 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (17): invalidateBlockedMatchers(), DEFAULT_BLOCKED_WORDS_FILE, fs, { invalidateBlockedMatchers }, loadBlockedWordsFromFile(), path, { RESOURCE_BASE, DATA_BASE }, saveBlockedWordsToFile() (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (17): attachIpcBridge(), FORBIDDEN_SHORTCUTS, { ipcMain }, isValidShortcut(), normalizeShortcut(), { registerUiohookShortcut, unregisterUiohookShortcut, isUiohookActive }, RENDERER_TELEMETRY_EVENTS, SPECIAL_PAUSE_SHORTCUTS (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (15): { collapseRepeats }, createBlockedMatchersState(), escapeRegex(), foldAccents(), getBlockedMatchers(), { collapseRepeats }, { foldAccents, getBlockedMatchers }, idiomaFiltrarContract (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (14): clearAll(), { markDirty }, ensure(), { keyFor }, { parseKey }, markDirty(), keyFor(), { PLATFORMS } (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (14): createModerationStore(), clearTimers(), flush(), fs, { purge }, { SCHEMA_VERSION, DEBOUNCE_MS, MAX_DELAY_MS }, { isActive }, purge() (+6 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (13): connectObs(), crypto, WebSocket, { clearObsReconnect }, disconnectObs(), clearObsReconnect(), { MAX_RECONNECT_ATTEMPTS }, scheduleObsReconnect() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (12): clearPunishments(), { mutate }, { ensure }, { markDirty }, mutate(), { toDTO }, { mutate }, setBan() (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (12): { CONFIG_VALIDATORS }, DEFAULT_CONFIG, DICT_FILTER_LANGS, GOOGLE_TTS_LANGS, { applyConfigPatch }, CONFIG_FILE, { DATA_BASE }, { DEFAULT_CONFIG } (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.19
Nodes (9): ACCESIBILIDAD_KEYS, FEATURES, { ACCESIBILIDAD_KEYS }, { FEATURES }, { FEATURES }, getConfigSnapshot(), { parseCommand }, register() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.24
Nodes (11): isLocalHostname(), isPrivateIP(), createWsServer(), crypto, { getRequestHostname, isLocalHostname }, isAllowedWsClient(), { isPrivateIP }, WebSocket (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (12): deleteBg(), fs, path, { UPLOADS_DIR }, { DATA_BASE }, fs, multer, path (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (9): register(), { extractYoutubeVideoId }, { musicBroadcastState }, { patchConfig }, resolveAndSavePlaylist(), playlistPut(), { resolveAndSavePlaylist }, attachSoundpadShortcuts() (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (9): { armKickWatchdog, clearKickWatchdog, WATCHDOG_TIMEOUT_MS }, { cleanKickSlug }, { handleKickWindowMessage }, kickBrowserContract, registerKickWindowListeners(), handleKickWindowMessage(), armKickWatchdog(), clearKickWatchdog() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (9): sanitizeForTTS(), isTTSRateLimited(), generate(), { getConfigSnapshot }, { GOOGLE_TTS_LANGS }, gTTS, https, { isTTSRateLimited } (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (10): { broadcastChannels }, { cleanKickSlug }, { cleanTiktokUsername }, { cleanTwitchChannel }, { cleanupAfterLastTikTokChannel }, { clearReconnectTimer: clearTwitchReconnectTimer }, { clearReconnectTimer: clearYoutubeReconnectTimer, clearWatchdogTimer: clearYoutubeWatchdogTimer }, { disconnectKick } (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (8): isDuplicateRecent(), { isDuplicateRecent }, isSpam(), logMensajeBloqueado(), { moderationStage }, { normalizeAggressive }, STAGE_MOTIVO, { isSpam, logMensajeBloqueado }

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (8): { TIKTOK_GIFT_COINS }, TIKTOK_GIFT_COINS, { computeGiftUsd }, fs, path, { RESOURCE_BASE }, TEST_USERS, { TIKTOK_GIFT_COINS }

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (8): createStubLogger(), assert, { createModerationStore }, { createStubLogger }, fs, os, path, { test }

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (8): computeGiftUsd(), getConfigSnapshot(), register(), TEST_USERS, testFollow(), testGift(), startFollowerRefresh(), stopFollowerRefresh()

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (7): loadSidebarPrefs(), normalizeSidebarPrefs(), saveSidebarPrefs(), SIDEBAR_TOOLS, SIDEBAR_TOOLS_LEGACY_VISIBLE, toolById(), renderSidebar()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (7): attachFallbackStatus(), createApp(), express, { getRequestHostname, isLocalHostname }, path, validateLocalMutation(), getRequestHostname()

### Community 51 - "Community 51"
Cohesion: 0.28
Nodes (7): createEventBus(), EventEmitter, { contextBridge, ipcRenderer }, listeners, off(), on(), TRACKABLE_EVENTS

### Community 52 - "Community 52"
Cohesion: 0.31
Nodes (7): extractEmotes(), extractMessage(), { ipcRenderer }, observeChatContainer(), seen, sendMessage(), slug

### Community 53 - "Community 53"
Cohesion: 0.28
Nodes (7): { getConfigSnapshot }, playlistToggle(), { setPlaylistEnabled }, { advanceMusicQueue }, { musicBroadcastState }, { patchConfig }, setPlaylistEnabled()

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (8): Por que extraResources y no asar, Proxy/backend propio para ocultar webhook (descartado), reporte-bug/ dominio, Runbook de rotacion de secretos filtrados, Secrets embebidos en el instalador â€” riesgo aceptado, telemetria/ dominio, telemetry-config.generated.json, webhook-config.generated.json

### Community 55 - "Community 55"
Cohesion: 0.32
Nodes (4): { markClip }, obsReplayContract, register(), markClip()

### Community 56 - "Community 56"
Cohesion: 0.25
Nodes (6): path, ROOT, fs, giftsList(), path, { RESOURCE_BASE }

### Community 57 - "Community 57"
Cohesion: 0.36
Nodes (6): registerDomain(), { trackForShutdown }, registered, shutdownAll(), trackForShutdown(), withTimeout()

### Community 58 - "Community 58"
Cohesion: 0.43
Nodes (7): { BrowserWindow }, buildCaptureUrl(), closeAllKickCaptureWindows(), closeKickCaptureWindow(), openKickCaptureWindow(), path, windows

### Community 59 - "Community 59"
Cohesion: 0.32
Nodes (7): { BrowserWindow, shell }, createWindow(), http, isAppUrl(), path, retryWaitForServer(), waitForServer()

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (6): { autoUpdater }, { dialog }, installUpdate(), setupAutoUpdater(), showMainWindow(), trayCallbacks()

### Community 61 - "Community 61"
Cohesion: 0.33
Nodes (6): fs, generate(), LANGS, OUT_DIR, path, SOURCE_URL()

### Community 62 - "Community 62"
Cohesion: 0.33
Nodes (5): createPlatformConfigStore(), { DATA_BASE }, fs, path, PLATFORM_CONFIG_FILE

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (5): { DATA_BASE }, fs, getLogsDownloadAll(), LOGS_DIR, path

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (3): createLogger(), fs, path

### Community 65 - "Community 65"
Cohesion: 0.60
Nodes (5): moveSidebarTool(), renderPluginDetail(), renderPluginMedia(), showPluginDetail(), toggleSidebarTool()

### Community 66 - "Community 66"
Cohesion: 0.50
Nodes (4): buildTrayMenu(), createTray(), showStartupError(), { Tray, Menu, nativeImage, dialog, shell }

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (4): BLOCKED_WORDS_FILE, { BLOCKED_WORDS_FILE }, blockedWordsExport(), fs

### Community 68 - "Community 68"
Cohesion: 0.60
Nodes (3): recomputeFollowerBase(), { recomputeFollowerBase }, setFollowerBaseForChannel()

### Community 69 - "Community 69"
Cohesion: 0.80
Nodes (4): attachStoreCardDragHandlers(), renderPluginGrid(), reorderSidebarTool(), showPluginGrid()

### Community 70 - "Community 70"
Cohesion: 0.67
Nodes (3): collapseRepeats(), LEET_MAP, normalizeAggressive()

### Community 71 - "Community 71"
Cohesion: 0.50
Nodes (3): { entriesToMarkdown }, getSessionLogFile(), { readSessionLogEntries }

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (3): BIT_OPTIONS, TEST_USERS, testCheer()

### Community 74 - "Community 74"
Cohesion: 0.50
Nodes (3): TEST_USERS, testSub(), VARIANTS

### Community 75 - "Community 75"
Cohesion: 0.50
Nodes (3): fs, path, target

### Community 76 - "Community 76"
Cohesion: 0.50
Nodes (3): fs, path, target

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (3): attach(), BUS_COUNTED, LOG_ENTRY_COUNTED

## Knowledge Gaps
- **694 isolated node(s):** `{ FEATURES }`, `{ ACCESIBILIDAD_KEYS }`, `{ parseCommand }`, `{ FEATURES }`, `{ createChannelState }` (+689 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createModerationStore()` connect `Community 34` to `Community 33`, `Community 36`, `Community 8`, `Community 47`, `Community 25`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `sweepDuplicateTracker()` connect `Community 8` to `Community 2`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `{ FEATURES }`, `{ ACCESIBILIDAD_KEYS }`, `{ parseCommand }` to the rest of the system?**
  _694 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05594679186228482 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05734767025089606 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05858585858585859 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07346938775510205 - nodes in this community are weakly interconnected._