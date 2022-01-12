# CSGO Overwatch Bot

Automatically solves Overwatch cases. Its not good but its trying.

You can forcefully parse a demo by running `node force.js`, it will ask you for a demo file path and a suspect SteamID. Alternatively just use `node force.js <Demo> <SteamID>`

## VAC & Other Bans

This script **does not** even initialize VAC, you cannot be VAC banned for a cheat detection using this. You **can** however get manually banned or even suspended from Steam entirely for using this. Valve does **not** want you to automate Overwatch cases. Use this at your own risk. I am not responsible for any bans, damages, lost items or anything else. You have been warned.

## Dependences

NodeJS 12+ version

## Installation

1. Install [NodeJS](https://nodejs.org/)
2. Download and extract this repository
3. Open a command prompt inside the directory
4. Run `npm ci`
5. Ignore any warnings
6. Make a duplicate of the `config.json.example` and remove the `.example`
7. Adjust your now called `config.json` - [See Config](#config)
8. Run `node index.js` (Use without logging in - [Read more](#steamworks))
9. After every update repeat from step 2

## Config

- `account`
  - `username`: Your Steam account name
  - `password`: Your Steam password
  - `sharedSecret`: Optional shared secret to generate Mobile Steam Guard codes. Leave empty to enter manually.
  - `saveSteamGuard`: Set to `true` to save login key between sessions - **This key bypasses Password and Steam Guard (Stored in `data/loginKey`)**
  - `invisible`: Set to `true` to show as offline on Steam
  - `notifyXPReward`: Set to `true` to receive a notification if you've been granted the Overwatch XP Reward for submitting correct verdicts
- `parsing`
  - `forceConvictOnPreviousBan`: When parsing is done the Suspect's Steam profile is checked for previous bans, if the previous ban is younger than this number of days it will forcefully convict the suspect for wallhack. Use `-1` to disable.
  - `minimumTime`: Minimum amount of time in seconds for parsing to take before sending verdict to CSGO. If too low CSGO will ignore our verdict.
  - `waitCalculatedDemoTime`: If `true` will ignore `minimumTime` and instead will wait the calculated length of the Overwatch case
  - `aimbot`
    - `maxTicks`: Amount of ticks to check when the suspect gets a kill
    - `threshold`: Maximum threshold between angles before adding an infraction for aimbotting
  - `afking`
    - `radius`: If the suspect is within this radius for an entire round count as infraction for griefing
- `detectors`
  - `Aimbot`: Enable/Disable aimbot detector
  - `Wallhack`: Enable/Disable wallhack detector
  - `Griefing`: Enable/Disable griefing detector
  - `AFKing`: Enable/Disable afking detector
  - `AntiAim`: Enable/Disable anti-aim detector (By @BlackYuzia)
- `verdict`
  - `writeLog`: Should we write our logs to a folder called `cases/<CaseID>`?
  - `backupDemo`: Should we backup the Overwatch demo in a folder called `cases/<CaseID>`?
  - `printScoreboard`: Should we print a scoreboard with player statistics to console?
  - `logWithEmojis`: Should we print with emojis? Set to `false` to use "YES"/"NO" instead of "✔️"/"❌"
  - `minTimeBetweenCases`: Min time the bot should wait before requesting a new case. The bot will randomize between min and max.
  - `maxTimeBetweenCases`: Max time the bot should wait before requesting a new case. The bot will randomize between min and max.
  - `verdictNumber`: Number of cases to do before bot will wait `waitingTime`.
  - `waitingTime`: Time to wait after `verdictNumber` reached.
  - `maxVerdicts`: Maximum amount of Overwatch cases to do before stopping. `0` for unlimited.
  - `minAimbot`: Minimum amount of aimbot infractions required to convict for aimbotting
  - `minWallKills`: Minimum amount of kills through a wall required to convict for wallhacking
  - `minAFKing`: Minimum amount of rounds the suspect must be AFK for to count as griefing
  - `minAntiAim`: Minimum amount of anti-aim infractions the suspect must have before convicting for other
  - `minTeamKills`: Minimum amount of team kills required to convict for griefing
  - `minTeamDamage`: Minimum amount of team damage required to convict for griefing

## Steamworks

**To use this you MUST install [node-gyp](https://github.com/nodejs/node-gyp#installation) and build tools - For Windows check this checkbox when installing NodeJS:**

<img src="https://i.imgur.com/VwqLGT4.png">

You can use this bot without filling in `username` and `password`, simply run using `node index.js STEAMWORKS`. This will run like normal CSGO but without interface and solve Overwatch cases just like the normal bot, it does so by communicating with Steam the same way any Steam game does. You **must** have Steam running while using this.

Using this will **ignore** `username`, `password`, `sharedSecret`, `saveSteamGuard` and `invisible` in your config.
