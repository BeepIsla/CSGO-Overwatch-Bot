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
