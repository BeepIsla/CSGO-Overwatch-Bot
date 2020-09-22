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
5. Make a duplicate of the `config.json.example` and remove the `.example`
6. Adjust your now called `config.json` - [See Config](#config)
7. Run `node index.js`
8. After every update repeat from step 3

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
  - `maxVerdicts`: Maximum amount of Overwatch cases to do before stopping. `0` for unlimited.

  - `minAimbot`: Minimum amount of aimbot infractions required to convict for aimbotting
  - `minWallKills`: Minimum amount of kills through a wall required to convict for wallhacking
  - `minAFKing`: Minimum amount of rounds the suspect must be AFK for to count as griefing
  - `minAntiAim`: Minimum amount of anti-aim infractions the suspect must have before convicting for other
  - `minTeamKills`: Minimum amount of team kills required to convict for griefing
  - `minTeamDamage`: Minimum amount of team damage required to convict for griefing

## Automatically pausing

In order to take advantage of the bot pausing when you start playing a game you MUST use something like [pm2](https://pm2.keymetrics.io/), [forever](http://github.com/foreverjs/forever) or similar. I will be using `pm2` here, these instructions work on your PC and on a dedicated server/VPS the exact same way.

1. Do step 1 to 6 in the [Installation](#installation) instructions
2. If the bot is currently running close it
3. Install [pm2](https://pm2.keymetrics.io/) using `npm install pm2 -g`
4. Run `pm2 start index.js --name "Overwatch"`
5. Run `pm2 save`
6. Done. The bot will now run for as long as the computer is running and automatically restart if an error occurs or when instructed to

Once this is done you can always start the process again using `pm2 resurrect`, it will automatically take the last saved list of processes and start them. You can see the logs using `pm2 logs Overwatch`. Use `pm2 stop Overwatch` to stop the bot manually if you need to update for example.

If you want to have the bot automatically start when your PC/Server starts simply run `pm2 startup` and follow the instructions: **This does not work on Windows!**

*For windows use [pm2-windows-startup](https://www.npmjs.com/package/pm2-windows-startup), simply run `npm install pm2-windows-startup -g` and `pm2-startup install`.*
