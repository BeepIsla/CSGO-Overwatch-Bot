const path = require("path");
const Events = require("events");
const WorkerThreads = require("worker_threads");
const SteamID = require("steamid");
const serializeError = require("serialize-error");
const inquirer = require("inquirer");

module.exports = class SteamUser extends Events.EventEmitter {
	constructor() {
		super();
	}

	static get EPersonaState() {
		// Only 2 different states will ever be used by "index.js" but whatever
		return {
			Offline: 0,
			Online: 1,
			Busy: 2,
			Away: 3,
			Snooze: 4,
			LookingToTrade: 5,
			LookingToPlay: 6,
			Invisible: 7,
		};
	}

	async logOn(details) {
		if (this.worker) {
			try {
				await this.worker.terminate();
			} catch { }
		}

		this.worker = new WorkerThreads.Worker(path.join(__dirname, "SteamUserWorker.js"), {
			workerData: details
		});
		this.worker.on("error", (err) => {
			console.error(err);
		});
		this.worker.on("message", (ev) => {
			switch (ev.type) {
				case "loggedOn": {
					this.steamID = new SteamID(ev.data.steamID);
					this.emit("loggedOn");
					break;
				}
				case "user": {
					this.emit("user", new SteamID(ev.data.sid), ev.data.user);
					break;
				}
				case "appLaunched": {
					this.emit("appLaunched", ev.data.appID);
					break;
				}
				case "disconnected": {
					this.emit("disconnected", ev.data.eresult, ev.data.msg);
					break;
				}
				case "loginKey": {
					this.emit("loginKey", ev.data.key);
					break;
				}
				case "playingState": {
					this.emit("playingState", ev.data.blocked, ev.data.playingApp);
					break;
				}
				case "error": {
					let err = serializeError.deserializeError(ev.data.err);
					this.emit("error", err);
					break;
				}
				case "receivedFromGC": {
					this.emit("receivedFromGC", ev.data.appid, ev.data.msgType, Buffer.from(ev.data.payload));
					break;
				}
				case "steamGuard": {
					// Do not forward to "index.js" - Handle it here
					inquirer.prompt([
						{
							type: "input",
							message: "Enter Steam Guard Code",
							name: "code"
						}
					]).then((response) => {
						this.worker.postMessage({
							type: "steamGuard",
							data: {
								code: response.code
							}
						});
					}).catch((err) => {
						if (!err.isTtyError) {
							// Something went wrong
							console.error(err);
							this.logOff();
							return;
						}

						// Could not render the prompt
						console.error("Steam Guard required but current interface does not allow for interactive user-input");
					});
					break;
				}
			}
		});
	}

	logOff() {
		// Log off
		this.worker.postMessage({
			type: "logOff"
		});
	}

	setPersona(persona) {
		this.worker.postMessage({
			type: "setPersona",
			data: persona
		});
	}

	gamesPlayed(games) {
		this.worker.postMessage({
			type: "gamesPlayed",
			data: games
		});
	}

	uploadRichPresence(app, details) {
		this.worker.postMessage({
			type: "uploadRichPresence",
			data: {
				app: app,
				details: details
			}
		});
	}


	sendToGC(appid, msg, proto, buffer) {
		this.worker.postMessage({
			type: "sendToGC",
			data: {
				appid: appid,
				msg: msg,
				proto: proto,
				buffer: Array.from(buffer)
			}
		});
	}
};
