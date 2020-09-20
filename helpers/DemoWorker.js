const fs = require("fs");
const path = require("path");
const WorkerThreads = require("worker_threads");
const v8 = require("v8");
const demofile = require("demofile");
const CliTable = require("cli-table3");
const colors = require("colors");
const Helper = require("./Helper.js");
const modes = [
	undefined,
	"competitive",
	"scrimcomp2v2"
];
const playerStats = [
	"assists",
	"deaths",
	"kills",
	"mvps",
	"name",
	"score",
	"teamNumber"
];
const teams = {
	NONE: 0,
	SPECTATOR: 1,
	TERRORIST: 2,
	COUNTERTERRORIST: 3
};
const teamName = [
	"None",
	"Spectator",
	"Terrorists",
	"Counter-Terrorists"
];
const ranks = [
	// Should not be hardcoded but rather from Translate.js but whatever
	"Not Ranked",
	"Silver I",
	"Silver II",
	"Silver III",
	"Silver IV",
	"Silver Elite",
	"Silver Elite Master",
	"Gold Nova I",
	"Gold Nova II",
	"Gold Nova III",
	"Gold Nova Master",
	"Master Guardian I",
	"Master Guardian II",
	"Master Guardian Elite",
	"Distinguished Master Guardian",
	"Legendary Eagle",
	"Legendary Eagle Master",
	"Supreme Master First Class",
	"The Global Elite"
];

const detectors = fs.readdirSync(path.join(__dirname, "..", "detectors")).filter((file) => {
	return file.endsWith(".js") && !file.startsWith("_");
}).map((file) => {
	try {
		return require(path.join(__dirname, "..", "detectors", file));
	} catch {
		return undefined;
	}
}).filter((prop) => {
	return typeof prop !== "undefined";
});

class Demo {
	constructor(buffer, suspect64Id, config) {
		this.buffer = buffer;
		this.suspect64Id = suspect64Id;
		this.config = config;

		this.suspectPlayer = undefined;
		this.obj = {
			detectors: {},
			verdict: {
				aimbot: false,
				wallhack: false,
				speedhack: false,
				teamharm: false
			}
		};
		this.detectors = [];
		this.players = {};

		this.demo = new demofile.DemoFile();
	}

	logResults() {
		let logs = [];

		logs.push("Infrations:");

		let longestKey = Math.max(...Object.keys(this.obj.detectors).map(k => k.length));
		let longestNum = Math.max(...Object.keys(this.obj.detectors).map(k => this.obj.detectors[k].raw.length.toString().length));

		for (let key in this.obj.detectors) {
			let name = " ".repeat(longestKey - key.length) + key;
			let num = this.obj.detectors[key].raw.length.toString();
			num = " ".repeat(longestNum - num.length) + num;

			logs.push("\t- " + name + ": " + num);
		}

		let yes = this.config.verdict.logWithEmojis ? "✔️" : "YES";
		let no = this.config.verdict.logWithEmojis ? "❌" : "NO";

		logs.push("Verdict:");
		logs.push("\t-   Aimbot: " + (this.obj.verdict.aimbot ? yes : no));
		logs.push("\t- Wallhack: " + (this.obj.verdict.wallhack ? yes : no));
		logs.push("\t-    Other: " + (this.obj.verdict.speedhack ? yes : no));
		logs.push("\t- Griefing: " + (this.obj.verdict.teamharm ? yes : no));

		return logs;
	}

	logScoreboard() {
		let teams = Object.keys(this.players).reduce((prev, cur) => {
			prev[this.players[cur].teamNumber].push({
				...this.players[cur],
				steamID64: cur
			});

			prev[this.players[cur].teamNumber] = prev[this.players[cur].teamNumber].sort((a, b) => {
				return b.score - a.score;
			});

			return prev;
		}, [
			[], // None
			[], // Spectator
			[], // Terrorist
			[] // Counter-Terrorist
		]);

		let table = new CliTable({
			head: [
				"SteamID",
				"Name",
				"Kills",
				"Assists",
				"Deaths",
				"MVPs",
				"Score",
				"Rank",
				"Wins",
				"Team"
			]
		});

		// CTs at top - Ts at bottom
		// CT is higher number than T so go reverse
		for (let i = 3; i >= 2; i--) {
			for (let player of teams[i]) {
				table.push([
					player.steamID64,
					player.name,
					player.kills,
					player.assists,
					player.deaths,
					player.mvps,
					player.score,
					ranks[player.rank],
					player.wins,
					teamName[player.teamNumber]
				].map((text) => {
					if (player.steamID64 === this.suspect64Id) {
						return colors.yellow(text);
					}

					return text;
				}));
			}
		}

		return table.toString();
	}

	parse(steam = undefined) {
		return new Promise((resolve, reject) => {
			this.demo.on("start", () => {
				this.obj.tickRate = this.demo.tickRate;
				this.obj.tickInterval = this.demo.tickInterval;
				this.obj.map = this.demo.header.mapName;
			});

			this.demo.on("net_SetConVar", (ev) => {
				if (typeof steam !== "function") {
					return;
				}

				let cvar = ev.convars.cvars.find(c => c.name === "game_mode");
				if (!cvar) {
					return;
				}

				steam({
					"game:state": "game",
					steam_display: "#display_Overwatch",
					"game:act": "overwatch",
					"game:mode": modes[Number(cvar.value)] || "",
					"game:map": this.obj.map
				});
			});

			this.demo.gameEvents.on("round_officially_ended", this.updateScoreboard.bind(this));

			// Parse suspect information
			this.demo.gameEvents.on("player_disconnect", this.findSuspect.bind(this));
			this.demo.gameEvents.on("player_connect", this.findSuspect.bind(this));
			this.demo.gameEvents.on("player_disconnect", this.getSuspectInfo.bind(this));
			this.demo.gameEvents.on("player_connect_full", this.getSuspectInfo.bind(this));
			this.demo.gameEvents.on("round_end", this.getSuspectInfo.bind(this));
			this.demo.gameEvents.on("round_start", this.getSuspectInfo.bind(this));

			// Finish at the end with our verdict and suspect data
			this.demo.on("end", (ev) => {
				if (ev.error) {
					reject(ev.error);
					return;
				}

				// Get all of our data and combine them for a single verdict object
				for (let detector of this.detectors) {
					let result = detector.prop.result();
					this.obj.detectors[detector.name] = {
						result: result,
						raw: detector.prop.resultRaw()
					};

					for (let key in this.obj.verdict) {
						if (!result[key]) {
							// False or doesn't exist
							// False is default so ignore
							continue;
						}

						if (this.obj.verdict[key]) {
							// Already true
						}

						this.obj.verdict[key] = true;
					}
				}

				// Finally resolve with the finished data
				resolve(this.obj);
			});

			this.demo.on("error", (err) => {
				reject(err);
			});

			// Register detectors
			for (let detector of detectors) {
				// Does a detector with this name already exist?
				if (this.detectors.find(d => d.name === detector.name)) {
					// Do not parse demo - Reject immediately
					reject(new Error("A detect with the name \"" + detector.name + "\" already exists"));
					return;
				}

				// Only enable specific detectors as per "config.json"
				let isEnabled = false;
				for (let key in this.config.detectors) {
					if (key.toLowerCase() !== detector.name.toLowerCase()) {
						continue;
					}

					isEnabled = Boolean(this.config.detectors[key]);
				}

				if (!isEnabled) {
					continue;
				}

				// Create detector and add it
				this.detectors.push({
					name: detector.name,
					prop: new detector(this, this.config)
				});
			}

			// Only parse if at least one detector is enabled
			if (this.detectors.length <= 0) {
				reject(new Error("No detector has been enabled. Read the README for more information."));
				return;
			}

			// Start parsing
			this.demo.parse(this.buffer);
		});
	}

	getSuspectInfo() {
		this.findSuspect();

		if (!this.suspectPlayer) {
			return;
		}

		this.obj.competitive = {
			color: this.demo.entities.playerResource.props.m_iCompTeammateColor[this.suspectPlayer.arrayIndex],
			rankType: this.demo.entities.playerResource.props.m_iCompetitiveRankType[this.suspectPlayer.arrayIndex],
			rank: this.demo.entities.playerResource.props.m_iCompetitiveRanking[this.suspectPlayer.arrayIndex],
			wins: this.demo.entities.playerResource.props.m_iCompetitiveWins[this.suspectPlayer.arrayIndex],
			commends: {
				friendly: this.demo.entities.playerResource.props.m_nPersonaDataPublicCommendsFriendly[this.suspectPlayer.arrayIndex],
				leader: this.demo.entities.playerResource.props.m_nPersonaDataPublicCommendsLeader[this.suspectPlayer.arrayIndex],
				teacher: this.demo.entities.playerResource.props.m_nPersonaDataPublicCommendsTeacher[this.suspectPlayer.arrayIndex]
			},
			level: this.demo.entities.playerResource.props.m_nPersonaDataPublicLevel[this.suspectPlayer.arrayIndex]
		};

		this.obj.data = {
			totalStats: {
				assists: this.demo.entities.playerResource.props.m_iAssists[this.suspectPlayer.arrayIndex],
				deaths: this.demo.entities.playerResource.props.m_iDeaths[this.suspectPlayer.arrayIndex],
				kills: this.demo.entities.playerResource.props.m_iKills[this.suspectPlayer.arrayIndex],
				mvps: this.demo.entities.playerResource.props.m_iMVPs[this.suspectPlayer.arrayIndex],
				score: this.demo.entities.playerResource.props.m_iScore[this.suspectPlayer.arrayIndex],
				cashSpent: this.demo.entities.playerResource.props.m_iTotalCashSpent[this.suspectPlayer.arrayIndex]
			},
			roundStats: this.suspectPlayer.matchStats,
			name: this.suspectPlayer.userInfo.name,
			activeCoin: this.demo.entities.playerResource.props.m_nActiveCoinRank[this.suspectPlayer.arrayIndex],
			activeMusicKit: this.demo.entities.playerResource.props.m_nMusicID[this.suspectPlayer.arrayIndex],
			clanTag: this.demo.entities.playerResource.props.m_szClan[this.suspectPlayer.arrayIndex],
			crosshairCode: this.demo.entities.playerResource.props.m_szCrosshairCodes[this.suspectPlayer.arrayIndex]
		};
	}

	findSuspect() {
		this.demo.players.find(p => p.userInfo && p.userInfo.xuid && p.userInfo.xuid.toString() === this.suspect64Id);
		if (!this.suspectPlayer) {
			return;
		}

		this.suspectPlayer.arrayIndex = Helper.ShiftNumber(this.suspectPlayer.index);
	}

	updateScoreboard() {
		// If this is half time swap all existing players "teamNumber"
		let mp_maxrounds = Number(this.demo.conVars.vars.get("mp_maxrounds"));
		if (this.demo.gameRules.roundsPlayed === (mp_maxrounds / 2)) {
			// While the "Update all players" below resets this due to you still being on your
			// old team during the 15 seconds of halftime we have to do this for disconnected players
			// If you disconnect round 12 and don't reconnect it would never update your "teamNumber" again
			for (let key in this.players) {
				switch (this.players[key].teamNumber) {
					case teams.COUNTERTERRORIST: {
						this.players[key].teamNumber = teams.TERRORIST;
						break;
					}
					case teams.TERRORIST: {
						this.players[key].teamNumber = teams.COUNTERTERRORIST;
						break;
					}
					default: {
						break;
					}
				}
			}
		}

		// Update all players
		for (let player of this.demo.players) {
			if (player.isFakePlayer) {
				continue;
			}

			if (!this.players[player.steam64Id]) {
				this.players[player.steam64Id] = {};
			}

			for (let key of playerStats) {
				this.players[player.steam64Id][key] = player[key];
			}

			this.players[player.steam64Id].rank = this.demo.entities.playerResource.props.m_iCompetitiveRanking[Helper.ShiftNumber(player.index)];
			this.players[player.steam64Id].wins = this.demo.entities.playerResource.props.m_iCompetitiveWins[Helper.ShiftNumber(player.index)];
		}
	}
}

// Sending data to main thread
let demo = new Demo(Buffer.from(WorkerThreads.workerData.buffer), WorkerThreads.workerData.suspect64Id, WorkerThreads.workerData.config);
demo.demo.on("progress", (progressFraction) => {
	WorkerThreads.parentPort.postMessage({
		type: "progress",
		progressFraction: progressFraction
	});
});

demo.parse((richPresenceObject) => {
	WorkerThreads.parentPort.postMessage({
		type: "richPresence",
		richPresenceObject: richPresenceObject
	});
}).then((data) => {
	WorkerThreads.parentPort.postMessage({
		type: "data",
		data: data,
		scoreboard: demo.logScoreboard(),
		results: demo.logResults()
	});
}).catch((error) => {
	WorkerThreads.parentPort.postMessage({
		type: "error",
		error: Array.from(v8.serialize(error))
	});
});
