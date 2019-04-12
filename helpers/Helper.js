const request = require("request");
const vdf = require("vdf");

module.exports = class Helper {
	static GetLatestVersion() {
		return new Promise((resolve, reject) => {
			request("https://raw.githubusercontent.com/BeepFelix/CSGO-Overwatch-Bot/master/package.json", (err, res, body) => {
				if (err) {
					reject(err);
					return;
				}
	
				let json = undefined;
				try {
					json = JSON.parse(body);
				} catch(e) {};
	
				if (json === undefined) {
					reject(body);
					return;
				}
	
				if (typeof json.version !== "string") {
					reject(json);
					return;
				}
	
				resolve(json.version);
			});
		});
	}

	static DownloadLanguage(lang = "csgo_english.txt") {
		return new Promise((resolve, reject) => {
			if (lang.startsWith("csgo_") === false) {
				lang = "csgo_" + lang;
			}

			if (lang.endsWith(".txt") === false) {
				lang = lang + ".txt";
			}

			request("https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/resource/" + lang, (err, res, body) => {
				if (err) {
					reject(err);
					return;
				}

				if (res.statusCode !== 200) {
					reject(new Error("Invalid Status Code: " + res.statusCode));
					return;
				}

				let obj = undefined;
				try {
					obj = vdf.parse(body);
				} catch(e) {};

				if (obj === undefined) {
					reject(body);
					return;
				}

				resolve(obj);
			});
		});
	}
}
