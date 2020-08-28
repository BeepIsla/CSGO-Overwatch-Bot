# CSGO Overwatch Bot

Automatically solves Overwatch cases. Its not good but its trying.

You can forcefully parse a demo by running `node force.js`, it will ask you for a demo file path and a suspect SteamID. Alternatively just use `node force.js <Demo> <SteamID>`

## VAC & Other Bans

This script **does not** even initialize VAC, you cannot be VAC banned for a cheat detection using this. You **can** however get manually banned or even suspended from Steam entirely for using this. Valve does **not** want you to automate Overwatch cases. Use this at your own risk. I am not responsible for any bans, damages, lost items or anything else. You have been warned.

## Installation

1. Install [NodeJS](https://nodejs.org/)
2. Download and extract this repository
3. Open a command prompt inside the directory
4. Run `npm ci`
5. Make a duplicate of the `config.json.example` and remove the `.example`
6. Adjust your now called `config.json` - [See Config](#config)
7. Run `node index.js`
<<<<<<< HEAD
8. After every update repeat from step 2 onwards to ensure everything required is up to date

# Detections
=======
8. After every update repeat from step 3
>>>>>>> 48ffed3427bacb17ec69ebff96f82016804d351a

## Config

- `account`
  - `username`: Your Steam account name
  - `password`: Your Steam password
  - `sharedSecret`: Optional shared secret to generate Mobile Steam Guard codes. Leave empty to enter manually.
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
<<<<<<< HEAD
- - `writeLog`: Should we write logs to a file?
- - `backupDemo`: Should we backup the demo file?
- - `maxVerdicts`: The maximum amount of cases we want to do. 0 for infinite
- - `maxAimbot`: The maximum amount of infractions allowed before setting user as aimbotter
- - `maxWallKills`: Maximum amount of allowed kills through a wall before setting user as wallhacking
- - `maxTeamKills`: Maximum amount of allowed kills Team 
- - `maxTeamDamage`: Maximum amount of damage to the team based on the total health taken from all allies 
- - `maxAFKing`: The maximum amount of infractions allowed before setting user as griefing
- `richPresence`
- - `steam_display`: What information to display on Steam - [Read more](#rich-presence)

# Rich Presence

Rich Presence is what displays on your friends when they play a game. Such as `In CS:GO Overwatch Session`.

There **MUST** always be a `steam_display` parameter and it **MUST** be a string from [SteamDB](https://steamdb.info/app/730/localization/) everything else can be any text you want.

If you want to display the default text enter invalid text, completely omit `richPresence` or set `richPresence` to an empty object (`{}`).

You can view the current Rich Presence keys and values in your browser [on Steam](https://steamcommunity.com/dev/testrichpresence) if you are logged in.

## Example 1 (Basic):

Set `steam_display` to `#display_watch` to display `Watching a CS:GO Match`

The structure would look like this:

```
{
    "steam_display": "#display_watch"
}
```

## Example 2 (Advanced):

Some keys in the localizations include placeholders (Example `%game:mode%`). You have to fill in those placeholders yourself and Steam will put the text you defined in there.

For example if we set `steam_display` to `#display_lobby` then the text will be `In Lobby - {#gamemode_%game:mode%}`

We want to replace `%game:mode%` with `competitive` because `#gamemode_competitive` translates to `Competitive` (Because if we take `#gamemode_%game:mode%` and replace `%game:mode%` with `competitive` then it will be `#gamemode_competitive`).

So we now have to set another value called `game:mode` to `competitive` and then it will display `In Lobby - Competitive`.

The structure would look like this:
```
{
    "steam_display": "#display_lobby",
    "game:mode": "competitive"
}
```

## Example 3 (Advanced):

With the knowledge of [Example 2](#example-2-advanced) we can now search a localization token which does not have a prefix, like `#bcast_teamvsteammap` which looks like this: `%team1% vs %team2% | {#gamemap_%map%}`. `team1` and `team2` have no translation prefix so therefore we can put in any value we want, unlike for `map`.

To display `Minecraft vs Roblox | Phoenix Compound` we have to set our structure to this:
```
{
    "steam_display": "#bcast_teamvsteammap",
    "team1": "Minecraft",
    "team2": "Roblox",
    "map": "coop_cementplant"
}
```

# GameCoordinator

How Overwatch data is exchanged between GC and Client. The data shown below has been collected from only a single Overwatch case, results may vary depending on the case we get.

1. Send `CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate`
   - `reason` (Ex: `1`)
   - - I assume this tells the GC we are waiting for a new case
2. Wait for `CMsgGCCStrike15_v2_PlayerOverwatchCaseAssignment`
   - `caseid` (Ex: `331349...`)
   - - Case identifier
   - `caseurl` (Ex: `http://replay192.valve.net...`)
   - - The download URL for the entire demo, not just the specific Overwatch
   - `verdict` (Ex: `0`)
   - - Unknown
   - `throttleseconds` (Ex: `4800`)
   - - I assume this is the time between cases, although 1.5 hours makes little sense
   - `suspectid` (Ex: `909243640`)
   - - Account ID of the suspect. (`[U:1:<SUSPECTID>]` for SteamID3)
   - `fractionid` (Ex: `11`)
   - - Unknown
   - `numrounds` (Ex: `19`)
   - - The round the demo starts at
   - `fractionrounds` (Ex: `8`)
   - - How many rounds we watch
   - `streakconvictions` (Ex: `1`)
   - - I assume this is how many correct convictions we got in a row. Although why would it be shown to us?
3. *Download the demo*
4. Send `CMsgGCCStrike15_v2_PlayerOverwatchCaseStatus`
   - `caseid` (Ex: `331349...`)
   - - Our case identifier
   - `statusid` (Ex: `1`)
   - - I assume this tells the GC we are currently assigned to a case and have successfully downloaded it
5. *Analyse the demo file*
6. Send `CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate`
   - `caseid` (Ex: `331349...`)
   - - Our case identifier
   - `suspectid` (Ex: `909243640`)
   - - Our suspect
   - `fractionid` (Ex: `11`)
   - - Unknown
   - `rpt_aimbot` (Ex: `1`)
   - - Did this user have aimbot?
   - `rpt_wallhack` (Ex: `1`)
   - - Did this user have wallhack?
   - `rpt_speedhack` (Ex: `1`)
   - - Did this user have any other external assistance?
   - `rpt_teamharm` (Ex: `0`)
   - - Did this user grief?
   - `reason` (Ex: `3`)
   - - I assume this tells the GC we have finished the demo and made our verdict
7. Wait for `CMsgGCCStrike15_v2_PlayerOverwatchCaseAssignment`
   - `caseid` (Ex: `331349...`)
   - - Our case identifier
   - `verdict` (Ex: `2`)
   - - Unknown (Previous information was false, I just got one with `1` instead of `2`)
   - `throttleseconds` (Ex: `7`)
   - - I assume this tells our client to wait this many seconds before we are allowed a new case
8. *Repeat*

If we start the game with a Overwatch case already being assigned to us the GC wil respond with the same assigned case we got earlier. It might also respond with a new case incase our old case has expired, this is untested though.
=======
  - `writeLog`: Should we write our logs to a folder called `cases/<CaseID>`?
  - `backupDemo`: Should we backup the Overwatch demo in a folder called `cases/<CaseID>`?
  - `printScoreboard`: Should we print a scoreboard with player statistics to console?
  - `maxVerdicts`: Maximum amount of Overwatch cases to do before stopping. `0` for unlimited.

  - `minAimbot`: Minimum amount of aimbot infractions required to convict for aimbotting
  - `minWallKills`: Minimum amount of kills through a wall required to convict for wallhacking
  - `minAFKing`: Minimum amount of rounds the suspect must be AFK for to count as griefing
  - `minAntiAim`: Minimum amount of anti-aim infractions the suspect must have before convicting for other
  - `minTeamKills`: Minimum amount of team kills required to convict for griefing
  - `minTeamDamage`: Minimum amount of team damage required to convict for griefing
>>>>>>> 48ffed3427bacb17ec69ebff96f82016804d351a
