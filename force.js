const demofile = require("demofile");
const inquire = require("inquirer");
const SteamID = require("steamid");
const path = require("path");
const fs = require("fs");

const Aimbot = require("./detectors/aimbot.js");
const AFKing = require("./detectors/AFKing.js");
const Wallhack = require("./detectors/wallhack.js");

const config = require("./config.json");

let data = {
	curcasetempdata: {
		aimbot_infractions: [],
		AFKing_infractions: [],
		Wallhack_infractions: []
	}
};

getResponse().then((result) => {
	if (result.path.trim().length <= 0) {
		console.log("No path entered");
		return;
	}

	if (result.suspect.trim().length <= 0) {
		console.log("No steamid entered");
		return;
	}

	let filepath = path.join(__dirname, result.path);
	filepath = filepath.endsWith(".dem") ? filepath : (filepath + ".dem");

	if (fs.existsSync(filepath) === false) {
		console.log("File does not exist");
		return;
	}

	let sid = undefined;
	try {
		sid = new SteamID(result.suspect.trim());
	} catch (e) { };

	if (sid === undefined || sid.isValid() === false) {
		console.log("Invalid SteamID entered");
		return;
	}

	fs.readFile(filepath, (err, buffer) => {
		if (err) {
			console.error(err);
			return;
		}

		console.log("Parsing demo " + result.path.trim() + " with suspect " + sid.getSteamID64());

		let lastProg = -1;
		let playerIndex = -1;
		const demoFile = new demofile.DemoFile();

		demoFile.gameEvents.on("player_connect", getPlayerIndex);
		demoFile.gameEvents.on("player_disconnect", getPlayerIndex);
		demoFile.gameEvents.on("round_freeze_end", getPlayerIndex);

		function getPlayerIndex() {
			playerIndex = demoFile.players.map(p => p.steamId === "BOT" ? p.steamId : new SteamID(p.steamId).getSteamID64()).indexOf(sid.getSteamID64());
		}

		demoFile.on("tickend", (curTick) => {
			demoFile.emit("tickend__", { curTick: curTick, player: playerIndex });
		});

		// Detection
		Aimbot(demoFile, sid, data, config);
		AFKing(demoFile, sid, data, config);
		Wallhack(demoFile, sid, data, config);

		demoFile.on("progress", (progressFraction) => {
			let prog = Math.round(progressFraction * 100);
			if (prog % 10 !== 0) {
				return;
			}

			if (prog === lastProg) {
				return;
			}

			lastProg = prog;
			console.log("Parsing demo: " + prog + "%");
		});

		demoFile.parse(buffer);

		demoFile.on("end", async (err) => {
			if (err.error) {
				console.error(err);
			}

			console.log("Suspect: " + (sid ? sid.getSteamID64() : 0));
			console.log("Infractions:");
			console.log("	Aimbot: " + data.curcasetempdata.aimbot_infractions.length);
			console.log("	Wallhack: " + data.curcasetempdata.Wallhack_infractions.length);
			console.log("	Other: 0");
			console.log("	Griefing: " + data.curcasetempdata.AFKing_infractions.length);
		});
	});
});

// Stuff for easier debugging in Visual Studio Code
function getResponse() {
	if (isDebugging() === true) {
		return new Promise((resolve, reject) => {
			resolve({
				path: "rage.dem",
				suspect: "76561198976843261"
			});
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
