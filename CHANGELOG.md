# 2.6.5

- Updated dependencies
  - Fixes security vulnerability ([#203](https://github.com/BeepIsla/CSGO-Overwatch-Bot/pull/203))
- Updated protobufs
- Added new config variable `waitCalculatedDemoTime`
  - If set to `true` will calculate the rough amount of time the demo would usually take you to watch legitimately without any manual skipping
- Fixed Steamworks not automatically installing when no `data` folder exists ([#204](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/204))

# 2.6.4

- Updated libraries
- Changed waiting 90 minutes to use Valve provided time for pre-2020 demos
- Fixed scoreboard sometimes showing wrong numbers ([#170](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/170))
- Fixed crash when cache data is missing

# 2.6.3

- Added more logs such as map, server, version, etc
- The demo header is now included when `writeLog` is enabled
- No longer tries to parse demos pre-2020 ([#178](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/178))
  - These demos are too old to be parsed by the libary so instead we just wait 90 minutes for the case to get dropped

# 2.6.2

- Added worker process for Steam to prevent unwanted disconnects
- Temporarily disabled AA detector by default
- Fixed SteamWorks implementation

# 2.6.1

- AA detector no longer ignores between-rounds and warmup ([#153](https://github.com/BeepIsla/CSGO-Overwatch-Bot/pull/153))
- Aimbot now checks angles when a player is damaged rather than when they die ([#155](https://github.com/BeepIsla/CSGO-Overwatch-Bot/pull/155))
- Fixed Steamworks not working ([#150](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/150))
- Re-enabled AntiAim detector by default

# 2.6.0

- Added Steamworks support - [Read more](https://github.com/BeepIsla/CSGO-Overwatch-Bot#steamworks)
- Disabled AntiAim detector by default
- When logging in now checks if another client is already playing something before starting and waits until the game is closed

# 2.5.0

- Changed Overwatch XP reward notification to show between cases as well instead of only when logging in
- Added errors when detecting an active cooldown
- Added pausing when a new play session is started from another Steam client session
  - Just click "Launch Anyway" on Steam and the bot will wait until you exit the game again

# 2.4.0

- Added option to notify about Overwatch XP reward
- Fixed logging in with invalid loginKey causing process exit
  - Now falls back to logging in without loginKey

# 2.3.0

- Added option to save login key to bypass Steam Guard for future logins ([#129](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/129))
- Fixed typo ([#131](https://github.com/BeepIsla/CSGO-Overwatch-Bot/pull/131))

# 2.2.1

- Potentially fixed rank fetching sometimes failing
  - If everything fails will just assume we have access and attempt to get a case anyways
- Fixed invisible mode ([#129](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/129))

# 2.2.0

- Added invisible mode ([#116](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/116))
- Updated dependencies
  - `eslint` from `7.7.0` to `7.8.1`
  - `node-fetch` from `2.6.0` to `2.6.1`
  - `steam-user` from `4.17.1` to `4.18.0`

# 2.1.4

- Updated protobufs to latest version
- Fixed softlock ([#120](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/120))

# 2.1.3

- Added cases completed in current session counter
- Changed default cases to complete to unlimited (From `1`)
- Fixed AFK detection ([#108](https://github.com/BeepIsla/CSGO-Overwatch-Bot/pull/108))

# 2.1.2

- Added rank and wins to scoreboard ([#104](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/104))
- Changed logged Suspect-SteamID to be a profile link instead ([#103](https://github.com/BeepIsla/CSGO-Overwatch-Bot/pull/103))

# 2.1.1

- Added `logWithEmojis` option - Set to `false` to disable emojis.
- Fixed protobuf downloader (Again)
- Fixed throttle delay
- Fixed SteamID input
- Slightly improve AFK detection
  - Increased default infractions required to count as Griefing (From `3` to `5`)

# 2.1.0

- Fix protobuf downloader ([#85](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/85))
- Add scoreboard ([#75](https://github.com/BeepIsla/CSGO-Overwatch-Bot/issues/85))

# 2.0.0

- Rewrite
