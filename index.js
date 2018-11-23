const SteamUser = require("steam-user");
const SteamTotp = require("steam-totp");
const fs = require("fs");
const request = require("request");
const demofile = require("demofile");
const bz2 = require("unbzip2-stream");
const SteamID = require("steamid");
const almostEqual = require("almost-equal");
const GameCoordinator = require("./GameCoordinator.js");
const config = require("./config.json");

const steamUser = new SteamUser();
const csgoUser = new GameCoordinator(steamUser);

var logonSettings = {
	accountName: config.account.username,
	password: config.account.password
};

if (config.account.sharedSecret && config.account.sharedSecret.length > 5) {
	logonSettings.twoFactorCode = SteamTotp.getAuthCode(config.account.sharedSecret);
}

steamUser.logOn(logonSettings);

steamUser.once("loggedOn", () => {
	console.log("Logged in");
	steamUser.setPersona(SteamUser.Steam.EPersonaState.Online);
	steamUser.gamesPlayed([ 730 ]);
	csgoUser.start();
});

steamUser.on("error", (err) => {
	if (csgoUser._GCHelloInterval) clearInterval(csgoUser._GCHelloInterval);

	console.error(err);
});

csgoUser.on("debug", (event) => {
	if (event.header.msg === csgoUser.Protos.EGCBaseClientMsg.k_EMsgGCClientWelcome) {
		/* The content is irrelevant
		var msg = csgoUser.Protos.CMsgClientWelcome.decode(event.buffer);
		console.log(msg);*/

		console.log("-----------------\nRequested Overwatch case");
		csgoUser._GC.send({
			msg: csgoUser.Protos.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
			proto: {}
		}, new csgoUser.Protos.CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate({
			reason: 1
		}).toBuffer());
		return;
	}

	if (event.header.msg === csgoUser.Protos.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseAssignment) {
		var msg = csgoUser.Protos.CMsgGCCStrike15_v2_PlayerOverwatchCaseAssignment.decode(event.buffer);
		console.log(msg);

		if (msg.caseurl) {
			// Download demo
			if (fs.existsSync("./demofile.dem")) fs.unlinkSync("./demofile.dem");
			console.log("Downloading case " + msg.caseid + " from url " + msg.caseurl);

			var sid = SteamID.fromIndividualAccountID(msg.suspectid);
			if (!sid.isValid()) {
				console.log("Got invalid suspect ID " + msg.suspectid);
				return;
			}

			var r = request(msg.caseurl);
			r.on("response", (res) => {
				res.pipe(fs.createWriteStream("./demofile.bz2")).on("close", () => {
					// Successfully downloaded, tell the GC about it!
					console.log("Finished downloading " + msg.caseid + ". Unpacking...");

					csgoUser._GC.send({
						msg: csgoUser.Protos.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseStatus,
						proto: {}
					}, new csgoUser.Protos.CMsgGCCStrike15_v2_PlayerOverwatchCaseStatus({
						caseid: msg.caseid,
						statusid: 1
					}).toBuffer());

					// Parse the demo
					fs.createReadStream("./demofile.bz2").pipe(bz2()).pipe(fs.createWriteStream("./demofile.dem")).on("close", () => {
						fs.unlinkSync("./demofile.bz2");

						console.log("Finished unpacking " + msg.caseid + ", parsing as suspect " + sid.getSteamID64() + "...");

						// WARNING: Really shitty aimbot detection ahead!
						fs.readFile("./demofile.dem", (err, buffer) => {
							if (err) return console.error(err);

							var aimbot_infractions = [];

							const demoFile = new demofile.DemoFile();

							// Detect Aimbot
							var lastFewAngles = [];
							demoFile.on("tickend", (curTick) => {
								var ourPlayer = demoFile.players.filter(p => p.steamId !== "BOT" && new SteamID(p.steamId).getSteamID64() === sid.getSteamID64());
								if (ourPlayer.length <= 0) { // User left
									lastFewAngles = [];
									return;
								}
								lastFewAngles.push(ourPlayer[0].eyeAngles);

								if (lastFewAngles.length >= config.parsing.maxTicks) {
									lastFewAngles.shift();
								}
							});

							demoFile.gameEvents.on("player_death", (event) => {
								var attacker = demoFile.entities.getByUserId(event.attacker);
								if (!attacker) return; // Attacker no longer available

								for (let i = 0; i < lastFewAngles.length; i++) {
									// Check pitch
									if (typeof lastFewAngles[i] !== "undefined" && typeof lastFewAngles[i + 1] !== "undefined") {
										if (!almostEqual(lastFewAngles[i].pitch, lastFewAngles[i + 1].pitch, config.parsing.threshold)) {
											if (is360Difference(lastFewAngles[i].pitch, lastFewAngles[i + 1].pitch)) {
												continue;
											}

											aimbot_infractions.push({ prevAngle: lastFewAngles[i], nextAngle: lastFewAngles[i + 1], tick: demoFile.currentTick });
										}
									}

									// Check yaw
									if (typeof lastFewAngles[i] !== "undefined" && typeof lastFewAngles[i + 1] !== "undefined") {
										if (!almostEqual(lastFewAngles[i].yaw, lastFewAngles[i + 1].yaw, config.parsing.threshold)) {
											if (is360Difference(lastFewAngles[i].yaw, lastFewAngles[i + 1].yaw)) {
												continue;
											}

											aimbot_infractions.push({ prevAngle: lastFewAngles[i], nextAngle: lastFewAngles[i + 1], tick: demoFile.currentTick });
										}
									}
								}
							});

							demoFile.parse(buffer);

							demoFile.on("end", async (err) => {
								if (err.error) console.error(err);

								console.log("Done parsing case " + msg.caseid);
								console.log(sid.getSteamID64() + " has " + aimbot_infractions.length + " infraction" + (aimbot_infractions.length === 1 ? "" : "s") + " for aimbotting");

								// Once we finished analysing the demo send the results
								csgoUser._GC.send({
									msg: csgoUser.Protos.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
									proto: {}
								}, new csgoUser.Protos.CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate({
									caseid: msg.caseid,
									suspectid: msg.suspectid,
									fractionid: msg.fractionid,
									rpt_aimbot: (aimbot_infractions.length > config.verdict.maxAimbot) ? 1 : 0,
									rpt_wallhack: 0, // TODO: Add detection for wallhacking
									rpt_speedhack: 0, // TODO: Add detection for other cheats (Ex BunnyHopping)
									rpt_teamharm: 0, // TODO: Add detection of griefing (Ex Afking, Damaging teammates)
									reason: 3
								}).toBuffer());
							});
						});
					});
				});
			});
		} else {
			console.log("Successfully submitted verdict for case " + msg.caseid + " throttled for " + msg.throttleseconds + " seconds");

			// Request a overwatch case after the time has run out
			setTimeout(() => {
				console.log("-----------------\nRequested Overwatch case");
				csgoUser._GC.send({
					msg: csgoUser.Protos.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
					proto: {}
				}, new csgoUser.Protos.CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate({
					reason: 1
				}).toBuffer());
			},  ((msg.throttleseconds + 1) * 1000));
		}
		return;
	}

	console.log(event); // Unhandled event
});

// Shitty check for 360 changes. Majority of infractions slip through here
function is360Difference(angle1, angle2) {
	// Check 0-360
	if (angle1 <= 10.0 && angle1 >= 0.0 && angle2 <= 360.0 && angle2 >= 350.0) {
		return true;
	} 

	// Check 360-0
	if (angle1 <= 360.0 && angle1 >= 350.0 && angle2 <= 10.0 && angle2 >= 0.0) {
		return true;
	}

	return false;
}
