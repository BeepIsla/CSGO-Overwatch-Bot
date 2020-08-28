const fs = require("fs");
const path = require("path");
const inquire = require("inquirer");
const SteamID = require("steamid");
<<<<<<< HEAD
const path = require("path");
const fs = require("fs");

const Aimbot = require("./detectors/aimbot.js");
const AFKing = require("./detectors/AFKing.js");
const Wallhack = require("./detectors/wallhack.js");
const TeamKill = require("./detectors/teamkill.js");
const TeamDamage = require("./detectors/teamDamage.js");

const config = require("./config.json");

let data = {
	curcasetempdata: {
		aimbot_infractions: [],
		AFKing_infractions: [],
		Wallhack_infractions: [],
		teamKill_infractions: [],
		teamDamage_infractions: 0
	}
};

getResponse().then((result) => {
=======
const Demo = require("./helpers/Demo.js");
const config = require("./config.json");

new Promise((resolve, reject) => {
	let args = process.argv.slice(2); // Remove "node.exe" & "force.js"
	let demoPath = args[0];
	let suspect = args[1];
	let outpath = args[2];

	inquire.prompt([
		demoPath ? [] : {
			type: "input",
			name: "path",
			message: "Enter the name of the demo:"
		},
		suspect ? [] : {
			type: "input",
			name: "suspect",
			message: "Suspect SteamID:"
		},
		// "outpath" can be an empty string
		typeof outpath === "string" ? [] : {
			type: "input",
			name: "outpath",
			message: "Write logs to file (Leave empty to not write):"
		}
	].flat()).then((result) => {
		resolve({
			path: result.path || demoPath,
			suspect: result.suspect || suspect,
			outpath: result.outpath || outpath
		});
	}).catch(reject);
}).then((result) => {
>>>>>>> 48ffed3427bacb17ec69ebff96f82016804d351a
	if (result.path.trim().length <= 0) {
		console.log("No path entered");
		return;
	}

	if (result.suspect.trim().length <= 0) {
		console.log("No SteamID entered");
		return;
	}

	let filePath = path.resolve(result.path);
	filePath = filePath.endsWith(".dem") ? filePath : (filePath + ".dem");

	if (!fs.existsSync(filePath)) {
		console.log("Could not find file: \"" + filePath + "\"");
		return;
	}

	let sid = undefined;
	try {
		sid = new SteamID(result.suspect.trim());
	} catch { }

	if (!sid || !sid.isValid()) {
		console.log("Invalid SteamID entered");
		return;
	}

	fs.readFile(filePath, (err, buffer) => {
		if (err) {
			console.error(err);
			return;
		}

<<<<<<< HEAD
		console.log("Parsing demo " + result.path.trim() + " with suspect " + sid.getSteamID64());

		let lastProg = -1;
		let playerIndex = -1;
		const demoFile = new demofile.DemoFile();

		demoFile.gameEvents.on("player_connect", getPlayerIndex);
		demoFile.gameEvents.on("player_disconnect", getPlayerIndex);
		demoFile.gameEvents.on("round_freeze_end", getPlayerIndex);

		function getPlayerIndex() {
			playerIndex = demoFile.players.filter(p => p.userInfo !== null).map(p => p.steamId === "BOT" ? p.steamId : new SteamID(p.steamId).getSteamID64()).indexOf(sid.getSteamID64());
		}

		demoFile.on("tickend", (curTick) => {
			demoFile.emit("tickend__", { curTick: curTick, player: playerIndex });
		});

		// Detection
		Aimbot(demoFile, sid, data, config);
		AFKing(demoFile, sid, data, config);
		Wallhack(demoFile, sid, data, config);
		TeamKill(demoFile, sid, data);
		TeamDamage(demoFile, sid, data);
=======
		console.log("Parsing demo with suspect " + sid.getSteamID64());
>>>>>>> 48ffed3427bacb17ec69ebff96f82016804d351a

		let demo = new Demo(buffer, sid.getSteamID64(), config);
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

		process.stdout.write("Parsing: 0%");
		demo.parse().then((data) => {
			process.stdout.write("\n");
			if (config.verdict.printScoreboard) {
				demo.logScoreboard();
			}
			demo.logResults();

			if (result.outpath) {
				if (!result.outpath.endsWith(".json")) {
					result.outpath += ".json";
				}

				fs.writeFileSync(result.outpath, JSON.stringify(data, null, "\t"));
			}
		}).catch((err) => {
			process.stdout.write("\n");

<<<<<<< HEAD
			console.log("Suspect: " + (sid ? sid.getSteamID64() : 0));
			console.log("Infractions:");
			console.log("	Aimbot: " + data.curcasetempdata.aimbot_infractions.length);
			console.log("	Wallhack: " + data.curcasetempdata.Wallhack_infractions.length);
			console.log("	TeamKills: "+ data.curcasetempdata.teamKill_infractions.length);
			console.log("	TeamDamage: " + data.curcasetempdata.teamDamage_infractions);
			console.log("	Other: 0");
			console.log("	Griefing: " + data.curcasetempdata.AFKing_infractions.length);
		});
	});
});

// Stuff for easier debugging in Visual Studio Code
function getResponse() {
	const args = process.argv; 

	if (isDebugging() === true) {
		return new Promise((resolve, reject) => {
			resolve({
				path: "rage.dem",
				suspect: "76561198976843261"
			});
		});
	} else if (args[2] && args[3]) {
		return Promise.resolve({
			path: args[2],
			suspect: args[3]
		});
	} else {
		return inquire.prompt([
			{
				type: "input",
				name: "path",
				message: "Enter the name of the demo:"
			},
			{
				type: "input",
				name: "suspect",
				message: "Suspect SteamID:"
			}
		]);
	}
}

function isDebugging() {
	// Doesnt detect if a debugger is attached after launch but I do not need that for Visual Studio Code
	const argv = process.execArgv.join();
	return argv.includes("inspect-brk") || argv.includes("debug");
}
=======
			// Fail parsing - What do?
			console.error(err);
		});
	});
});
>>>>>>> 48ffed3427bacb17ec69ebff96f82016804d351a
