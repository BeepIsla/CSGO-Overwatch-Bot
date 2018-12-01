# CSGO Overwatch Bot

Automatically solves Overwatch cases. Although **the detection algorithm for Aimbotting is really bad and there is no Wallhack/Griefing/etc detection**.

When running this you will get some unhandled cases which we simply don't care about.

# Aimbot detection

Log the past X ticks, when the suspect gets a kill check all angles within the past X ticks. If the difference is above the threshold add an infraction.

# Config

- `account`
- - `username`: The account name you use to log into that account
- - `password`: The password for the account
- - `sharedSecret`: Optional shared secret for two factor authentication
- `parsing`
- - `steamWebAPIKey`: Optional Steam Web API key
- - `minimumTime`: The minimum amount of seconds of parsing before sending the Conviction-Message
- - `aimbot`
- - - `maxTicks`: The maximum amount of ticks to check when the suspect gets a kill
- - - `threshold`: The maximum threshold between angles before adding an Aimbot-Infraction
- - `afking`
- - - `radius`: If a player is within this radius an entire round it counts as an AFKing-Infraction
- `verdict`
- - `writeLog`: Should we write logs to a file?
- - `maxVerdicts`: The maximum amount of cases we want to do. 0 for infinite
- - `maxAimbot`: The maximum amount of infractions allowed before setting user as aimbotter
- - `maxAFKing`: The maximum amount of infractions allowed before setting user as griefing
- `other`
- - `autoDecode`: Automatically try to decode an incoming unhandled message

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
