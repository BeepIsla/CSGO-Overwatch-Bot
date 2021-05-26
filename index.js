const fs = require("fs");
const path = require("path");
const Stream = require("stream");
const SteamTotp = require("steam-totp");
const SteamID = require("steamid");
const unbzip2 = require("unbzip2-stream");
const cliTable = require("cli-table3");
const demofile = require("demofile");
const Helper = require("./helpers/Helper.js");
const Coordinator = require("./helpers/Coordinator.js");
const Protobufs = require("./helpers/Protobufs.js");
const Translate = require("./helpers/Translate.js");
const Demo = require("./helpers/Demo.js");
const Steamworks = require("./helpers/Steamworks.js");
const SteamUser = require("./helpers/SteamUser.js");
const config = require("./config.json");
const USING_STEAMWORKS = process.argv.join(" ").toUpperCase().includes("STEAMWORKS");
if (USING_STEAMWORKS) {
	console.log("WARNING: Using Steamworks - This is experimental");
}

const steam = USING_STEAMWORKS ? new Steamworks() : new SteamUser();
const coordinator = new Coordinator(steam, 730);
const objectHandler = {};
const notifications = []; // To be sent to console between cases
let notifiedOfOverwatchBonusXP = false; // Only notify once per session at most
let protobufs = undefined;
let playStateBlocked = false;
let loginPersonaCheck = false;
let tempLoginKey = undefined;
let casesCompleted = 0;
let timings = {
	Downloading: 0,
	Unpacking: 0,
	Parsing: 0
};

process.on("SIGINT", () => {
	console.log(USING_STEAMWORKS ? "Shutting down..." : "Logging off...");

	steam.logOff();
	setTimeout(process.exit, 1000, 0).unref();
});

(async () => {
	console.log("Checking protobufs...");
	let foundProtobufs = Helper.VerifyProtobufs();
	if (foundProtobufs) {
		console.log("Found protobufs");
	} else {
		console.log("Failed to find protobufs, downloading and extracting...");
		await Helper.DownloadProtobufs(__dirname);
	}

	protobufs = new Protobufs([
		{
			name: "csgo",
			protos: path.join(__dirname, "protobufs", "csgo")
		}
	]);
	objectHandler[protobufs.data.csgo.ESOMsg.k_ESOMsg_Create] = "CMsgSOSingleObject";
	objectHandler[protobufs.data.csgo.ESOMsg.k_ESOMsg_Update] = "CMsgSOSingleObject";
	objectHandler[protobufs.data.csgo.ESOMsg.k_ESOMsg_UpdateMultiple] = "CMsgSOMultipleObjects";

	console.log("Checking for updates...");
	try {
		let pkg = JSON.parse(fs.readFileSync("./package.json"));
		let res = await Helper.GetLatestVersion().catch(console.error);
		if (pkg.version !== res) {
			let repoURL = pkg.repository.url.split(".");
			repoURL.pop();
			console.log("A new version is available on Github @ " + repoURL.join("."));
			console.log("Downloading is optional but recommended. Make sure to check if there are any new values to be added in your old \"config.json\"");
		} else {
			console.log("Up to date!");
		}
	} catch {
		console.log("Update check failed");
	}

	console.log("Fetching CSGO translation file...");
	await Translate.fetchTokens("csgo_english.txt");

	// Get login key if we have one
	let dataPath = path.join(__dirname, "data");
	if (!fs.existsSync(dataPath)) {
		fs.mkdirSync(dataPath);
	}

	let loginkeyPath = path.join(dataPath, "loginkey");
	let keyData = fs.existsSync(loginkeyPath) ? fs.readFileSync(loginkeyPath).toString() : undefined;
	try {
		keyData = keyData ? JSON.parse(keyData) : undefined;
	} catch {
		console.log("Failed to parse loginKey from previous session.");
	}
	let useLoginKey = keyData && keyData.account === config.account.username && config.account.saveSteamGuard;

	console.log("Logging into Steam...");
	steam.logOn({
		accountName: config.account.username,
		password: useLoginKey ? undefined : config.account.password,
		twoFactorCode: useLoginKey ? undefined : (config.account.sharedSecret && config.account.sharedSecret.length > 5 ? SteamTotp.getAuthCode(config.account.sharedSecret) : undefined),
		loginKey: useLoginKey ? keyData.loginKey : undefined,
		rememberPassword: true
	});
})();

steam.on("loggedOn", () => {
	console.log("Successfully logged into " + steam.steamID.toString());
	steam.setPersona(config.account.invisible ? SteamUser.EPersonaState.Invisible : SteamUser.EPersonaState.Online);
	loginPersonaCheck = false;
});

steam.on("user", (sid, user) => {
	if (sid.accountid !== steam.steamID.accountid) {
		return;
	}

	if (loginPersonaCheck) {
		return;
	}
	loginPersonaCheck = true;

	if (user.gameid !== "0") {
		// Someone else is already playing
		// No need to log here as "playingState" will emit as well
		return;
	}

	// Nobody is currently playing on any session
	steam.gamesPlayed([730]);
});

steam.on("appLaunched", async (appID) => {
	if (appID !== 730) {
		return;
	}

	console.log("Establishing CSGO GameCoordinator connection...");

	let helloBuf = protobufs.encodeProto("CMsgClientHello", {});
	while (true) {
		if (playStateBlocked) {
			// We are blocked
			return;
		}

		let welcome = await coordinator.sendMessage(
			730,
			protobufs.data.csgo.EGCBaseClientMsg.k_EMsgGCClientHello,
			{},
			helloBuf,
			protobufs.data.csgo.EGCBaseClientMsg.k_EMsgGCClientWelcome,
			5000
		).catch(() => { });

		if (welcome) {
			if (!config.account.notifyXPReward) {
				// Skip
				break;
			}

			// Parse response and get flags from it
			welcome = protobufs.decodeProto("CMsgClientWelcome", welcome);
			let flags = Helper.GetXPFlags(welcome.outofdate_subscribed_caches || []);

			// The above parses various things but we only care about the Overwatch one so ignore everything else
			for (let flag of flags) {
				if (!flag.title.includes("Overwatch")) {
					continue;
				}

				let table = new cliTable({
					head: [flag.title]
				});
				table.push([flag.description]);
				console.log(table.toString());
				notifiedOfOverwatchBonusXP = true;
			}
			break;
		}
	}
	console.log("Established CSGO connection, getting rank information...");

	let mmWelcome = await coordinator.sendMessage(
		730,
		protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_MatchmakingClient2GCHello,
		{},
		protobufs.encodeProto("CMsgGCCStrike15_v2_MatchmakingClient2GCHello", {}),
		protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_MatchmakingGC2ClientHello,
		30000
	);
	mmWelcome = protobufs.decodeProto("CMsgGCCStrike15_v2_MatchmakingGC2ClientHello", mmWelcome);

	if (playStateBlocked) {
		// We are blocked
		return;
	}

	if (Helper.MatchmakingKickBanReason.IsPermanent(mmWelcome.penalty_reason)) {
		console.log("Cannot do Overwatch cases while game banned.");
		steam.logOff();
		return;
	}

	if (Helper.MatchmakingKickBanReason.IsGlobal(mmWelcome.penalty_reason)) {
		console.log("Cannot do Overwatch cases while on global cooldown.");
		steam.logOff();
		return;
	}

	if (Helper.MatchmakingKickBanReason.IsGreen(mmWelcome.penalty_reason)) {
		console.log("Cannot do Overwatch cases while on temporary cooldown.");
		steam.logOff();
		return;
	}

	if (typeof mmWelcome.penalty_reason === "number" && mmWelcome.penalty_reason > 0) {
		console.log("Cannot do Overwatch cases while on cooldown.");
		steam.logOff();
		return;
	}

	if (typeof mmWelcome.vac_banned === "number" && mmWelcome.vac_banned > 0) {
		console.log("Cannot do Overwatch cases while VAC banned.");
		steam.logOff();
		return;
	}

	let rank = mmWelcome.ranking;
	if (!rank || rank.rank_type_id !== 6) { // Competitive ID
		rank = await coordinator.sendMessage(
			730,
			protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_ClientGCRankUpdate,
			{},
			protobufs.encodeProto("CMsgGCCStrike15_v2_ClientGCRankUpdate", {
				rankings: {
					rank_type_id: 6
				}
			}),
			protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_ClientGCRankUpdate,
			30000
		);

		rank = protobufs.decodeProto("CMsgGCCStrike15_v2_ClientGCRankUpdate", rank);
		if (rank.rankings && rank.rankings[0]) {
			rank = rank.rankings[0];
		} else {
			rank = undefined;
		}
	}

	if (playStateBlocked) {
		// We are blocked
		return;
	}

	if (rank) {
		console.log("We are \"" + Translate("RankName_" + rank.rank_id) + "\" with " + rank.wins + " win" + (rank.wins === 1 ? "" : "s"));
		if (rank.rank_id < 7 || rank.wins < 150) {
			console.log((rank.rank_id < 7 ? "Our rank is too low" : "We do not have enough wins") + " in order to request Overwatch cases. You need at least 150 wins and " + Translate("skillgroup_7") + ".");
			steam.logOff();
			return;
		}
	} else {
		console.log("Failed to receive rank - Assuming we have access to Overwatch");
	}

	console.log("Checking for Overwatch access...");
	await coordinator.sendMessage(
		730,
		protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
		{},
		protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate", {
			reason: Helper.OverwatchConstants.EMMV2OverwatchCasesUpdateReason_t.k_EMMV2OverwatchCasesUpdateReason_Poll
		})
	);

	if (playStateBlocked) {
		// We are blocked
		return;
	}

	steam.uploadRichPresence(730, {
		steam_display: "#display_Menu"
	});
});

steam.on("disconnected", (eresult, msg) => {
	console.log("Disconnected from Steam with EResult " + eresult + " and message " + msg);
	process.exitCode = 1;

	// Steam-User keeps the connection alive for a really long time some reason
	setTimeout(() => process.exit, 1, 15 * 1000).unref();
});

steam.on("loginKey", (key) => {
	tempLoginKey = key;

	if (!config.account.saveSteamGuard) {
		return;
	}

	let dataPath = path.join(__dirname, "data");
	if (!fs.existsSync(dataPath)) {
		fs.mkdirSync(dataPath);
	}

	fs.writeFileSync(path.join(dataPath, "loginKey"), JSON.stringify({
		loginKey: key,
		account: config.account.username
	}));
});

steam.on("playingState", (blocked, playingApp) => {
	if (playStateBlocked === blocked) {
		return;
	}
	playStateBlocked = blocked;

	if (playStateBlocked) {
		console.log("App " + playingApp + " was started on another Steam client. Waiting...");
		steam.gamesPlayed([]);
	} else {
		console.log("Other Steam client stopped playing. Resuming...");
		steam.gamesPlayed([730]);
	}
});

steam.on("error", (err) => {
	switch (err.eresult) {
		case 5: {
			console.log("Login with saved loginKey failed. Logging in without loginKey...");
			steam.logOn({
				accountName: config.account.username,
				password: config.account.password,
				twoFactorCode: config.account.sharedSecret && config.account.sharedSecret.length > 5 ? SteamTotp.getAuthCode(config.account.sharedSecret) : undefined,
				rememberPassword: true
			});
			break;
		}
		case 6: {
			console.log("Another client started a game and kicked us off, logging back into Steam...");
			steam.logOn({
				accountName: config.account.username,
				password: tempLoginKey ? undefined : config.account.password,
				twoFactorCode: tempLoginKey ? undefined : (config.account.sharedSecret && config.account.sharedSecret.length > 5 ? SteamTotp.getAuthCode(config.account.sharedSecret) : undefined),
				loginKey: tempLoginKey ? tempLoginKey : undefined,
				rememberPassword: true
			});
			break;
		}
		default: {
			throw err;
		}
	}
});

coordinator.on("receivedFromGC", async (msgType, payload) => {
	if (playStateBlocked) {
		// We are blocked
		return;
	}

	if (config.account.notifyXPReward && !notifiedOfOverwatchBonusXP && objectHandler[msgType]) {
		let body = protobufs.decodeProto(objectHandler[msgType], payload);
		if (!Array.isArray(body.objects_modified) && body.type_id && body.object_data) {
			// Single - Make fake multi
			body = {
				objects_modified: [
					{
						type_id: body.type_id,
						object_data: [
							body.object_data
						]
					}
				]
			};
		}

		// Pass as fake cache
		let flags = Helper.GetXPFlags([
			{
				objects: body.objects_modified
			}
		]);

		// The above parses various things but we only care about the Overwatch one so ignore everything else
		for (let flag of flags) {
			if (!flag.title.includes("Overwatch")) {
				continue;
			}

			let table = new cliTable({
				head: [flag.title]
			});
			table.push([flag.description]);

			if (notifications.includes("Overwatch")) {
				// A notification about this is already pending
				continue;
			}

			notifications.push(table.toString());
			notifiedOfOverwatchBonusXP = true;
		}
	}

	if (msgType !== protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseAssignment) {
		return;
	}

	let body = protobufs.decodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseAssignment", payload);

	if (body.reason === Helper.OverwatchConstants.EMMV2OverwatchCasesUpdateReason_t.k_EMMV2OverwatchCasesUpdateReason_Assign &&
		typeof body.verdict === "undefined"
	) {
		// We have access to Overwatch! Lets request a little case
		console.log("Access confirmed by CSGO Network");
		console.log("Attempt to get Overwatch case...");
		await coordinator.sendMessage(
			730,
			protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
			{},
			protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate", {
				reason: Helper.OverwatchConstants.EMMV2OverwatchCasesUpdateReason_t.k_EMMV2OverwatchCasesUpdateReason_Assign
			})
		);
	} else if (typeof body.reason === "undefined" &&
		body.verdict === Helper.OverwatchConstants.EMMV2OverwatchCasesVerdict_t.k_EMMV2OverwatchCasesVerdict_Pending
	) {
		// No "reason" but "verdict" is pending -> Parse demo
		let sid = SteamID.fromIndividualAccountID(body.suspectid);

		console.log("-".repeat(50));
		console.log("                 Case ID: " + body.caseid.toString());
		console.log("            Download URL: " + body.caseurl);
		console.log("            Total Rounds: " + body.numrounds);
		console.log("         Rounds to watch: " + body.fractionrounds);
		console.log("Overwatch starting round: " + (body.fractionid + 1)); // FractionID 0 = Round 1 (Pistol round)
		console.log("                 Suspect: https://steamcommunity.com/profiles/" + sid.getSteamID64());
		console.log("----- The whole demo will be analyzed ----");
		console.log("Downloading demo...");

		timings.Downloading = Date.now();

		let response = await Helper.Fetch(body.caseurl).catch(() => { });
		if (playStateBlocked) {
			// We are blocked
			return;
		}

		if (!response || !response.ok) {
			// Something failed while downloading - Tell the GC about it and abandon
			console.error(new Error("Failed to download case. Check your internet connection"));

			await coordinator.sendMessage(
				730,
				protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseStatus,
				{},
				protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseStatus", {
					caseid: body.caseid,
					statusid: Helper.OverwatchConstants.EMMV2OverwatchCasesStatus_t.k_EMMV2OverwatchCasesStatus_ErrorDownloading
				})
			);

			// Log off and set exit code to failure - Hopefully our user uses something like PM2 or similar
			steam.logOff();
			process.exitCode = 1;
			return;
		}

		let buffer = await response.buffer().catch(() => { });
		timings.Downloading = Date.now() - timings.Downloading;

		if (playStateBlocked) {
			// We are blocked
			return;
		}

		console.log("Unpacking demo...");

		timings.Unpacking = Date.now();

		// Shitty way to unpack the demo thanks to the library being synchronous
		let demoBuffer = await new Promise((resolve, reject) => {
			let readable = new Stream.Readable();
			readable._read = () => { };
			readable.push(buffer);
			readable.push(null);

			let data = Buffer.alloc(0);
			readable.pipe(unbzip2()).on("data", (chunk) => {
				data = Buffer.concat([data, chunk]);
			}).on("error", (err) => {
				reject(err);
			}).on("end", () => {
				resolve(data);
			});
		}).catch((err) => {
			if (!buffer) {
				console.error(new Error("Failed to get buffer from download response"));
			} else {
				console.error(err);
			}

			return coordinator.sendMessage(
				730,
				protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseStatus,
				{},
				protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseStatus", {
					caseid: body.caseid,
					statusid: Helper.OverwatchConstants.EMMV2OverwatchCasesStatus_t.k_EMMV2OverwatchCasesStatus_ErrorExtracting
				})
			).finally(() => {
				// Log off and set exit code to failure - Hopefully our user uses something like PM2 or similar
				steam.logOff();
				process.exitCode = 1;
			});
		});
		if (!demoBuffer) {
			return;
		}

		if (playStateBlocked) {
			// We are blocked
			return;
		}

		timings.Unpacking = Date.now() - timings.Unpacking;

		if (config.verdict.writeLog || config.verdict.backupDemo) {
			if (!fs.existsSync("cases")) {
				fs.mkdirSync("cases");
			}

			if (!fs.existsSync("cases/" + body.caseid)) {
				fs.mkdirSync("cases/" + body.caseid);
			}
		}

		console.log("Received a " + (demoBuffer.length / 1024 / 1024).toFixed(2) + "MB demo");
		if (config.verdict.backupDemo) {
			fs.writeFileSync("cases/" + body.caseid + "/demofile.dem", demoBuffer);
		}

		if (config.verdict.writeLog) {
			fs.writeFileSync("cases/" + body.caseid + "/message.json", JSON.stringify(body, null, "\t"));
		}

		await coordinator.sendMessage(
			730,
			protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseStatus,
			{},
			protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseStatus", {
				caseid: body.caseid,
				statusid: Helper.OverwatchConstants.EMMV2OverwatchCasesStatus_t.k_EMMV2OverwatchCasesStatus_Ready
			})
		);

		if (config.verdict.writeLog) {
			fs.writeFileSync("cases/" + body.caseid + "/profile.url", [
				"[InternetShortcut]",
				"URL=https://steamcommunity.com/profiles/" + sid.getSteamID64()
			].join("\n"));
		}

		let header = demofile.parseHeader(demoBuffer);
		console.log("-  Server: " + header.serverName);
		console.log("- Version: " + header.networkProtocol);
		console.log("-     Map: " + header.mapName);
		console.log("-  Length: " + Helper.FormatSeconds(header.playbackTime) + "m");

		// Arbitrary number, no idea at which version it works
		if (header.networkProtocol < 13700) {
			// Use provided time by Valve (Usually 90 minutes) or just fallback to 90
			let waitMins = body.throttleseconds ? (body.throttleseconds / 60) : 90;

			console.log("");
			console.log("Detected demo from pre-2020. These type of demos are not parsable. The bot will now wait " + waitMins + " minute" + (waitMins === 1 ? "" : "s") + " for the case to disappear.");
			console.log("NOTE: Starting CSGO during this time might restart the " + waitMins + " minute timer.");
			console.log("");
			console.log("Current time: " + new Date().toLocaleString());
			console.log("Will continue at: " + new Date(Date.now() + waitMins * 60 * 1000).toLocaleString());

			// Stop playing and later start playing again - The "appLaunched" event should fire again
			steam.gamesPlayed([]);
			await new Promise(p => setTimeout(p, waitMins * 60 * 1000).unref());
			steam.gamesPlayed([730]);
			return;
		}

		let demo = new Demo(demoBuffer, sid.getSteamID64(), config, body);
		let lastVal = 0;
		demo.demo.on("progress", (progressFraction) => {
			let percentage = Math.round(progressFraction * 100);
			if (lastVal === percentage || (percentage % 10) !== 0) {
				return;
			}
			lastVal = percentage;

			process.stdout.write("\r\x1b[K"); // Clear current line
			process.stdout.write("Parsing: " + percentage + "%");
		});

		timings.Parsing = Date.now();

		process.stdout.write("Parsing: 0%");
		let data = await demo.parse(steam).catch((err) => {
			process.stdout.write("\n");

			// Fail parsing - Log off and set exit code to failure - Hopefully our user uses something like PM2 or similar
			console.error(err);
			steam.logOff();
			process.exitCode = 1;
		});
		if (!data) {
			return;
		}
		data.header = header;

		process.stdout.write("\n");
		timings.Parsing = Date.now() - timings.Parsing;

		if (playStateBlocked) {
			// We are blocked
			return;
		}

		// Force convict?
		if (typeof config.parsing.forceConvictOnPreviousBan === "number" && config.parsing.forceConvictOnPreviousBan >= 0) {
			data.forceConvictEnabled = false;

			let days = await Helper.GetBanStatus(sid).catch(() => { });
			if (typeof days !== "number") {
				console.log("Suspect has not been banned before");
				data.forceConvicted = false;
			} else if (days <= config.parsing.forceConvictOnPreviousBan) {
				console.log("Suspect has been banned " + days + " day" + (days === 1 ? "" : "s") + " ago, forcefully convicting");
				data.verdict.wallhack = true;
				data.forceConvicted = true;
			} else {
				console.log("Suspect has been banned " + days + " day" + (days === 1 ? "" : "s") + " ago, ban too old to convict");
				data.forceConvicted = false;
			}
		} else {
			data.forceConvictEnabled = false;
			data.forceConvicted = false;
		}

		let timeTotal = timings.Downloading + timings.Parsing + timings.Unpacking;
		if (config.verdict.writeLog) {
			data.timings = timings;
			data.timings.total = timeTotal;
			fs.writeFileSync("cases/" + body.caseid + "/data.json", JSON.stringify(data, null, "\t"));
		}

		// Demo logs
		if (config.verdict.printScoreboard) {
			demo.logScoreboard();
		}
		demo.logResults();

		console.log("Cases completed this session: " + ++casesCompleted);

		// Log timings
		let longestKey = Math.max(Object.keys(timings).map(k => k.length));
		let longestTiming = Math.max(Object.keys(timings).map(k => timings[k].toString().length));

		console.log("Timings:");
		for (let key in timings) {
			let name = "\t- " + " ".repeat(longestKey - key.length) + key;

			let num = Math.round(timings[key] / 1000).toString();
			num = " ".repeat(longestTiming - num.length) + num + " second" + (Number(num) === 1 ? "" : "s");

			console.log(name + ": " + num);
		}

		// Wait a minimum amount of time
		let waitTimeMinimum = -1;
		if (config.parsing.waitCalculatedDemoTime) {
			// Calculate time we need to wait
			let speedyTicks = demo.timings.suspectDead + demo.timings.freezeTime;
			let normalTicks = demo.timings.totalTicksForWatching - speedyTicks;
			let speedMultiplier = 10; // Same as "demo_highlight_fastforwardspeed"

			let ticksToWatch = (speedyTicks / speedMultiplier) + normalTicks;
			waitTimeMinimum = ticksToWatch * (1 / demo.snapshotrate); // Same as "tv_snapshotrate"
		} else if (timeTotal < (config.parsing.minimumTime * 1000)) {
			waitTimeMinimum = config.parsing.minimumTime;
		}

		if (waitTimeMinimum > 0) {
			let diff = (waitTimeMinimum * 1000) - timeTotal;
			let rawSeconds = Math.ceil(diff / 1000);

			let seconds = rawSeconds % 60;
			let minutes = Math.round((rawSeconds % 3600) / 60);

			if (minutes > 0) {
				if (seconds < 10) {
					seconds = "0" + seconds;
				}

				console.log("Waiting " + minutes + ":" + seconds + " minutes before sending verdict...");
			} else {
				console.log("Waiting " + seconds + " seconds before sending verdict...");
			}

			await new Promise(p => setTimeout(p, diff));
		}

		if (playStateBlocked) {
			// We are blocked
			return;
		}

		console.log("Sending verdict to CSGO...");

		// Send verdict
		await coordinator.sendMessage(
			730,
			protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
			{},
			protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate", {
				caseid: body.caseid,
				suspectid: body.suspectid,
				fractionid: body.fractionid,
				rpt_aimbot: data.verdict.aimbot,
				rpt_wallhack: data.verdict.wallhack,
				rpt_speedhack: data.verdict.speedhack,
				rpt_teamharm: data.verdict.teamharm,
				reason: Helper.OverwatchConstants.EMMV2OverwatchCasesUpdateReason_t.k_EMMV2OverwatchCasesUpdateReason_Verdict
			})
		);
	} else if (typeof body.reason === "undefined" &&
		body.verdict !== Helper.OverwatchConstants.EMMV2OverwatchCasesVerdict_t.k_EMMV2OverwatchCasesVerdict_Pending
	) {
		steam.uploadRichPresence(730, {
			steam_display: "#display_Menu"
		});

		while (notifications.length > 0) {
			console.log(notifications.shift());
		}

		if (config.verdict.maxVerdicts > 0 && casesCompleted >= config.verdict.maxVerdicts) {
			console.log("Finished doing " + config.verdict.maxVerdicts + " verdict" + (config.verdict.maxVerdicts === 1 ? "" : "s"));
			steam.logOff();
			process.exitCode = 0; // Success exit code - PM2 or whatever the user uses should not restart the process
			return;
		}

		// Wait this long before requesting a new case
		let delay = body.throttleseconds || 10;
		console.log("Waiting " + delay + " seconds before requesting a new case...");
		await new Promise(p => setTimeout(p, delay * 1000));

		if (playStateBlocked) {
			// We are blocked
			return;
		}

		console.log("Attempt to get Overwatch case...");
		await coordinator.sendMessage(
			730,
			protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
			{},
			protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate", {
				reason: Helper.OverwatchConstants.EMMV2OverwatchCasesUpdateReason_t.k_EMMV2OverwatchCasesUpdateReason_Assign
			})
		);
	} else if (typeof body.reason === "undefined" &&
		typeof body.verdict === "undefined" &&
		typeof body.throttleseconds === "number"
	) {
		console.log("Waiting " + body.throttleseconds + " seconds before requesting a case...");
		await new Promise(p => setTimeout(p, body.throttleseconds * 1000));

		if (playStateBlocked) {
			// We are blocked
			return;
		}

		console.log("Attempt to get Overwatch case...");
		await coordinator.sendMessage(
			730,
			protobufs.data.csgo.ECsgoGCMsg.k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate,
			{},
			protobufs.encodeProto("CMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate", {
				reason: Helper.OverwatchConstants.EMMV2OverwatchCasesUpdateReason_t.k_EMMV2OverwatchCasesUpdateReason_Assign
			})
		);
	}
});
