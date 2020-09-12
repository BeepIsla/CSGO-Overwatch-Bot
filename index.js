const fs = require("fs");
const path = require("path");
const Stream = require("stream");
const SteamUser = require("steam-user");
const SteamTotp = require("steam-totp");
const SteamID = require("steamid");
const unbzip2 = require("unbzip2-stream");
const Helper = require("./helpers/Helper.js");
const Coordinator = require("./helpers/Coordinator.js");
const Protobufs = require("./helpers/Protobufs.js");
const Translate = require("./helpers/Translate.js");
const Demo = require("./helpers/Demo.js");
const config = require("./config.json");

const steam = new SteamUser({
	autoRelogin: false // Do not automatically log back in - Process must exit and an external program like PM2 must auto restart
});
const coordinator = new Coordinator(steam, 730);
let protobufs = undefined;
let casesCompleted = 0;
let timings = {
	Downloading: 0,
	Unpacking: 0,
	Parsing: 0
};

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

	console.log("Logging into Steam...");
	steam.logOn({
		accountName: config.account.username,
		password: config.account.password,
		twoFactorCode: config.account.sharedSecret && config.account.sharedSecret.length > 5 ? SteamTotp.getAuthCode(config.account.sharedSecret) : undefined
	});
})();

steam.on("loggedOn", async () => {
	console.log("Successfully logged into " + steam.steamID.toString());
	steam.setPersona(config.account.invisible ? SteamUser.EPersonaState.Invisible : SteamUser.EPersonaState.Online);

	console.log("Establishing CSGO GameCoordinator connection...");
	steam.gamesPlayed([730]);

	let helloBuf = protobufs.encodeProto("CMsgClientHello", {});
	while (true) {
		let welcome = await coordinator.sendMessage(
			730,
			protobufs.data.csgo.EGCBaseClientMsg.k_EMsgGCClientHello,
			{},
			helloBuf,
			protobufs.data.csgo.EGCBaseClientMsg.k_EMsgGCClientWelcome,
			5000
		).catch(() => { });

		if (welcome) {
			// We don't care about the actual content
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

	let rank = mmWelcome.ranking;
	if (rank.rank_type_id !== 6) { // Competitive ID
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
		rank = rank.rankings[0];
	}

	console.log("We are " + Translate("skillgroup_" + rank.rank_id) + " with " + rank.wins + " win" + (rank.wins === 1 ? "" : "s"));
	if (rank.rank_id < 7 || rank.wins < 150) {
		console.log((rank.rank_id < 7 ? "Our rank is too low" : "We do not have enough wins") + " in order to request Overwatch cases. You need at least 150 wins and " + Translate("skillgroup_7") + ".");
		steam.logOff();
		return;
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

	steam.uploadRichPresence(730, {
		steam_display: "#display_Menu"
	});
});

steam.on("disconnected", (eresult, msg) => {
	console.log("Disconnected from Steam with EResult " + eresult + " and message " + msg);
	process.exitCode = 1;
});

coordinator.on("receivedFromGC", async (msgType, payload) => {
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

		let demo = new Demo(demoBuffer, sid.getSteamID64(), config);
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

		process.stdout.write("\n");
		timings.Parsing = Date.now() - timings.Parsing;

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
		if (timeTotal < (config.parsing.minimumTime * 1000)) {
			let diff = (config.parsing.minimumTime * 1000) - timeTotal;
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
