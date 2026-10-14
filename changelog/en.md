## [1.11.2] — 2026-10-09

### Chat moderation
- New **Rust Chat Guard** engine, on by default in observe mode (it doesn't block anything, it only logs what it would have filtered).
- New **«Chat moderation»** block in Settings: level, languages, allowed words, blocked words and engine status.
- The filter's languages **follow the TTS voice language** automatically.
- **Blocked messages** popup from the queue badge (blocked, words and TTS queue).
- Unified blocked-words management, **saved per account** (migrates on its own from the old format).
- The filter respects the guard's verdicts, and moderation actions are saved instantly.
- New **nonsense-text filter** (random keyboard mashing like «asdfghjkl;»): if someone sends several in a row, the message shows in chat but isn't read aloud. It's on by default and you can switch it to «Only warn» or «Off» in Settings > «Chat moderation». It never mutes anyone: that's your call. Messages with real words, laughter (`jajaja`, `wkwkwk`, `ㅋㅋㅋ`), emotes or links are not flagged.
- In the blocked messages popup, nonsense-text messages have a **«Mute user»** button in case you want to cut off the spammer.
- **Import blocked words** from a `.json` file, with a 3-step wizard: «Format» (example ready to copy), «Import» (drag or choose the file) and «Confirm» (how many are new, plus a preview). The words are added to your current list, not replacing it.

### OBS overlays
- New **TikTok viewers overlay** with customization, preview and a test button.
- Chat, Top Likers and **Top Donors** with full settings from «Customize»; avatars, roles (moderator/subscriber) and a ring with a platform bubble on the avatar.
- **Preview with sample data** without being connected (chat with all 4 platforms, pinned alerts).
- Simplified Follow/Share alerts and an accent color in Top Likers. The custom background is removed.

### Channels
- **TikTok with a persistent session per account**: log in/out inside «Add channel», expired-session notice and a tutorial explaining the login.
- Much more stable reconnection: recovers when the room changes, watches two signals so quiet lives don't trigger reconnects, and retries Twitch and YouTube after silences.
- Channel connection retries are kept between attempts.
- Faster startup (the TikTok client only loads when it's used).

### Account and plans
- **Delete account** button in your profile, with password and confirmation by typing the word.
- **Monthly / yearly** toggle and interval change from your account; the plans popup and checkout open on monthly.
- Pro upgrade banner under the «Reading» bar (Free plan only), rotating banner in chat and a discount code modal.
- Redesigned **donation** and **Pro cancellation** modals; demo videos for Pro features; **Clips** becomes a Pro feature with its own demo.
- The upgrade button opens the plan comparison; the popup no longer appears at startup.
- Paywall for the mobile panel, and a mobile panel with a Pro badge and account menu.

### Legal and privacy
- **Terms and Privacy Policy v2.1** (with English translation).
- The installer asks you to accept them on every install and update; without accepting them, no telemetry, analytics or error reporting starts.
- The terms are shown when you sign up.

### Interface
- **Voice & audio** redesigned into 3 cards that adapt to the window width.
- **Keyboard shortcuts in tabs**: TTS and chat, Music and General.
- SVG icons instead of symbols in Settings, press feedback and Channels with unified styles.
- Event effects and a failed-connection notice.
- What's new with an embedded YouTube video.
- Simpler **MCP** agent connection (clearer snippets).
- You can now close the window without shutting the app down. If you turn on **Minimize to tray on close** in Settings, pressing the X hides TikLiveTTS in the system tray (next to the clock) and it keeps reading the chat. To close it completely, right-click its icon and choose **Exit**. It's off by default, so the X keeps closing the app like before until you turn it on.
- New **Open when Windows starts** option: TikLiveTTS launches on its own when you turn on your PC, so it's ready when you start your live.

### Fixes
- Queue badge with clear text, repainted when the language loads.
- The Pro banner shows again every time the app opens.
- Corrupted text (mojibake) fixed in all 10 languages, and new keys translated.
- The channels tutorial pointed at a hidden element; the TikTok login didn't disappear after signing in.
- Platform chips in the chat overlay showed their checked state wrong.
- Default sidebar on a fresh install (chat, overlays, clips, moderation).
- Soundpad validates the received list better; simulated chat message with a unique id.
- TTS: audio that gets stuck is cut off and text length is limited.
- `--user-data-dir` is respected when given explicitly.
- Several icon, modal and state tweaks across the interface.
- Importing blocked words no longer accepts files with an invalid format: a broken JSON or one that isn't a list of words is rejected with a clear notice, instead of a generic error or filling the list with junk text.
- Smarter TikLiveTTS voice announcements: the first one plays at 15 minutes and the next ones at most every 25 minutes, and only when there are people in your live. If your live is empty, they wait for an audience instead of playing anyway. Before, they could repeat too often or take ages to play. With the Pro plan they don't play.
- The voice no longer reads long numbers in nicknames: `pablito434435433453` is read as «pablito», and accounts without a real name (`user14423423…`, `usuario14423423…`) are read as «user», in the app's language. This applies to chat and to join, follow, gift, like and share announcements. Names with few digits (`lu15`, `pablo2024`) are read as before, and on screen, in OBS and in rankings the nickname is still shown in full.
- Music bot: requesting a song with a YouTube link (`!p https://youtu.be/...`) plays that song again. Before, the link was lost and the bot searched for the word «link», so a different song played. In chat and in the voice the link is still shown as «link».
- Music bot: the YouTube engine now gets fixes the same day they are released, instead of waiting weeks for the next stable version, so requests stop failing much sooner when YouTube changes something. If an engine update was left halfway because music was playing, it finishes applying by itself the next time you open the app.

### Videos de YouTube
- [Watch the what's new video](https://www.youtube.com/watch?v=JBLPEXGKRlM)
