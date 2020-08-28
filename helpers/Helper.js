const path = require("path");
const fs = require("fs");
const URL = require("url");
const fetch = require("node-fetch");
const unzipper = require("unzipper");
const cheerio = require("cheerio");
const Protobufs = require("./Protobufs.js");
const BAN_REGEX = /(?<days>\d+)\s+day\(s\)\s+since\s+last\s+ban/;

module.exports = class Helper {
	static OverwatchConstants = {
		// Via leaked CSGO Source Code
		// Online repository: https://github.com/perilouswithadollarsign/cstrike15_src/blob/29e4c1fda9698d5cebcdaf1a0de4b829fa149bf8/game/shared/cstrike15/cstrike15_gcconstants.h#L505

		EMMV2OverwatchCasesVerdict_t: {
			// CSGO V2 Overwatch case verdict field, stored in SQL
			k_EMMV2OverwatchCasesVerdict_Pending: 0,
			k_EMMV2OverwatchCasesVerdict_Dismissed: 1,
			k_EMMV2OverwatchCasesVerdict_ConvictedForCheating: 2,
			k_EMMV2OverwatchCasesVerdict_ConvictedForBehavior: 3
		},
		EMMV2OverwatchCasesUpdateReason_t: {
			// CSGO V2 Overwatch case update request reason, used for communication between client and GC
			k_EMMV2OverwatchCasesUpdateReason_Poll: 0,		// Client is polling for an overwatch case
			k_EMMV2OverwatchCasesUpdateReason_Assign: 1,	// Client is eager to get a case assigned and work on it
			k_EMMV2OverwatchCasesUpdateReason_Downloading: 2,	// Client is downloading the case files
			k_EMMV2OverwatchCasesUpdateReason_Verdict: 3	// Client is willing to cast a verdict on a previously assigned case
		},
		EMMV2OverwatchCasesStatus_t: {
			// CSGO V2 Overwatch case status field, stored in SQL
			k_EMMV2OverwatchCasesStatus_Default: 0,
			k_EMMV2OverwatchCasesStatus_Ready: 1,
			k_EMMV2OverwatchCasesStatus_ErrorDownloading: 2,
			k_EMMV2OverwatchCasesStatus_ErrorExtracting: 3
		},
		EMMV2OverwatchCasesType_t: {
			// CSGO V2 Overwatch case type field, stored in SQL
			k_EMMV2OverwatchCasesType_Reports: 0,
			k_EMMV2OverwatchCasesType_Placebo: 1,
			k_EMMV2OverwatchCasesType_VACSuspicion: 2,
			k_EMMV2OverwatchCasesType_Manual: 3,
			k_EMMV2OverwatchCasesType_MLSuspicion: 4,
			k_EMMV2OverwatchCasesType_Max: 5
		}
	};

	static ParseURL(baseURL, query) {
		let url = new URL.URL(baseURL);
		for (let key in (query || {})) {
			url.searchParams.append(key, String(query[key]));
		}
		return url.href;
	}

	static Fetch(baseURL, query = {}) {
		let href = this.ParseURL(baseURL, query);
		return fetch(href);
	}

	static async GetLatestVersion() {
		let response = await this.Fetch("https://github.com/BeepIsla/CSGO-Overwatch-Bot/blob/master/package.json?raw=true");
		let json = await response.json();
		return json.version;
	}

	static async GetSteamAPI(interf, method, version, params) {
		let response = await this.Fetch("https://api.steampowered.com/" + interf + "/" + method + "/" + version, params);
		let json = await response.json();
		return json.response;
	}

	static async DownloadProtobufs(dir) {
		await Promise.all([
			"Protobufs-master",
			"protobufs"
		].map(async (folder) => {
			let p = path.join(dir, folder);
			if (!fs.existsSync(p)) {
				return;
			}

			return this.DeleteRecursive(p);
		}));

		let newProDir = path.join(dir, "Protobufs-master");
		let proDir = path.join(dir, "protobufs");

		// Yes I know the ones I download here are technically not the same as the ones in the submodule
		// but that doesn't really matter, I doubt Valve will do any major changes with the protobufs I use here anyways
		let body = await this.Fetch("https://github.com/SteamDatabase/Protobufs/archive/master.zip");
		let buffer = await body.buffer();

		let zip = await unzipper.Open.buffer(buffer);
		await zip.extract({
			path: dir
		});

		await fs.promises.rename(newProDir, proDir);
	}

	static VerifyProtobufs() {
		try {
			// Not a full verification, constructors are all missing but whatever
			let protobufs = new Protobufs([
				{
					name: "csgo",
					protos: [
						path.join(__dirname, "..", "protobufs", "csgo", "cstrike15_gcmessages.proto"),
						path.join(__dirname, "..", "protobufs", "csgo", "econ_gcmessages.proto"),
						path.join(__dirname, "..", "protobufs", "csgo", "gcsystemmsgs.proto")
					]
				}
			]);
			let verification = {
				"csgo": {
					"ECsgoGCMsg": [
						"k_EMsgGCCStrike15_v2_MatchmakingClient2GCHello",
						"k_EMsgGCCStrike15_v2_MatchmakingGC2ClientHello",
						"k_EMsgGCCStrike15_v2_ClientGCRankUpdate",
						"k_EMsgGCCStrike15_v2_PlayerOverwatchCaseUpdate",
						"k_EMsgGCCStrike15_v2_PlayerOverwatchCaseAssignment"
					],
					"EGCBaseClientMsg": [
						"k_EMsgGCClientHello",
						"k_EMsgGCClientWelcome"
					]
				}
			};

			for (let game in verification) {
				for (let type in verification[game]) {
					for (let msg of verification[game][type]) {
						if (typeof protobufs.data[game][type][msg] === "number") {
							continue;
						}

						return false;
					}
				}
			}

			return true;
		} catch {
			return false;
		}
	}

	static async DeleteRecursive(dir) {
		let files = await fs.promises.readdir(dir);

		for (let file of files) {
			let filePath = path.join(dir, file);
			let stat = await fs.promises.stat(filePath);

			if (stat.isDirectory()) {
				await this.DeleteRecursive(filePath);
			} else {
				await fs.promises.unlink(filePath);
			}
		}

		await fs.promises.rmdir(dir);
	}

	static ShiftNumber(index) {
		index = index.toString();
		while (index.length < 3) {
			index = "0" + index;
		}
		return index;
	}

	static async GetBanStatus(sid) {
		let response = await this.Fetch("https://steamcommunity.com/profiles/" + sid.getSteamID64());
		let text = await response.text();
		let $ = cheerio.load(text);
		let banText = $(".profile_ban_status").remove(".profile_ban").text().trim();
		let match = banText.match(BAN_REGEX);
		if (!match) {
			return undefined;
		}

		return Number(match.groups.days);
	}
};
