const fs = require("fs");
const path = require("path");
const demofile = require("demofile");
const Helper = require("./Helper.js");
const modes = [
	undefined,
	"competitive",
	"scrimcomp2v2"
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

module.exports = class Demo {
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

		this.demo = new demofile.DemoFile();
	}

	logResults() {
		console.log("Infrations:");

		let longestKey = Math.max(...Object.keys(this.obj.detectors).map(k => k.length));
		let longestNum = Math.max(...Object.keys(this.obj.detectors).map(k => this.obj.detectors[k].raw.length.toString().length));

		for (let key in this.obj.detectors) {
			let name = " ".repeat(longestKey - key.length) + key;
			let num = this.obj.detectors[key].raw.length.toString();
			num = " ".repeat(longestNum - num.length) + num;

			console.log("\t- " + name + ": " + num);
		}

		console.log("Verdict:");
		console.log("\t-   Aimbot: " + (this.obj.verdict.aimbot ? "✔️" : "❌"));
		console.log("\t- Wallhack: " + (this.obj.verdict.wallhack ? "✔️" : "❌"));
		console.log("\t-    Other: " + (this.obj.verdict.speedhack ? "✔️" : "❌"));
		console.log("\t- Griefing: " + (this.obj.verdict.teamharm ? "✔️" : "❌"));
	}

	parse(steam = undefined) {
		return new Promise((resolve, reject) => {
			this.demo.on("start", () => {
				this.obj.tickRate = this.demo.tickRate;
				this.obj.tickInterval = this.demo.tickInterval;
				this.obj.map = this.demo.header.mapName;
			});

			this.demo.on("net_SetConVar", (ev) => {
				if (!steam) {
					return;
				}

				let cvar = ev.convars.cvars.find(c => c.name === "game_mode");
				if (!cvar) {
					return;
				}

				steam.uploadRichPresence(730, {
					"game:state": "game",
					steam_display: "#display_Overwatch",
					"game:act": "overwatch",
					"game:mode": modes[Number(cvar.value)] || "",
					"game:map": this.obj.map
				});
			});

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
				console.log(err);
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
		this.suspectPlayer = this.demo.players.find(p => p.steam64Id === this.suspect64Id);
		if (!this.suspectPlayer) {
			return;
		}

		this.suspectPlayer.arrayIndex = Helper.ShiftNumber(this.suspectPlayer.index);
	}
};
