const request = require("request");
const vdf = require("vdf");
const SteamUser = require("steam-user");
const path = require("path");
const fs = require("fs");
const unzipper = require("unzipper");
const GameCoordinator = require("./GameCoordinator.js");

module.exports = class Helper {
	static GetLatestVersion() {
		return new Promise((resolve, reject) => {
			request("https://raw.githubusercontent.com/BeepIsla/CSGO-Overwatch-Bot/master/package.json", (err, res, body) => {
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

	static downloadProtobufs(dir) {
		return new Promise(async (resolve, reject) => {
			let newProDir = path.join(dir, "Protobufs-master");
			if (fs.existsSync(newProDir)) {
				await this.deleteRecursive(newProDir);
			}

			// Yes I know the ones I download here are technically not the same as the ones in the submodule
			// but that doesn't really matter, I doubt Valve will do any major changes with the protobufs I use here anyways
			let r = request("https://github.com/SteamDatabase/Protobufs/archive/master.zip");
			let pipe = r.pipe(unzipper.Extract({ path: dir }));
			pipe.on("close", async () => {
				let proDir = path.join(dir, "protobufs");
				if (fs.existsSync(proDir)) {
					await this.deleteRecursive(proDir);
				}

				fs.rename(newProDir, proDir, (err) => {
					if (err) {
						reject(err);
						return;
					}

					resolve();
				});
			});
			pipe.on("error", reject);
		});
	}

	static verifyProtobufs() {
		let user = new SteamUser();
		let gc = new GameCoordinator(user);

		try {
			return typeof gc.Protos.csgo.EGCBaseClientMsg.k_EMsgGCClientHello === "number";
		} catch (e) {
			return false;
		}
	}

	static deleteRecursive(dir) {
		return new Promise((resolve, reject) => {
			fs.readdir(dir, async (err, files) => {
				if (err) {
					reject(err);
					return;
				}

				for (let file of files) {
					let filePath = path.join(dir, file);
					let stat = fs.statSync(filePath);

					if (stat.isDirectory()) {
						await this.deleteRecursive(filePath);
					} else {
						await new Promise((res, rej) => {
							fs.unlink(filePath, (err) => {
								if (err) {
									rej(err);
									return;
								}

								res();
							});
						});
					}
				}

				fs.rmdir(dir, (err) => {
					if (err) {
						reject(err);
						return;
					}

					resolve();
				});
			});
		});
	}
}
