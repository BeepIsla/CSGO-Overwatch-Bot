const path = require("path");
const childProcess = require("child_process");
const Events = require("events");
const SteamID = require("steamid");
const Helper = require("./Helper.js");
const PROTO_MASK = 0x80000000;
let Steam = undefined;

module.exports = class Steamworks extends Events.EventEmitter {
	steamID = undefined;

	constructor() {
		super();

		// Check for GameCoordinator callbacks
		setInterval(() => {
			if (!Steam) {
				// Not yet ready
				return;
			}

			let msgSize = Steam.IsMessageAvailable();
			if (msgSize <= 0) {
				// GameCoordinator interface could not be found or no message waiting to be picked up
				return;
			}

			let data = Steam.RetrieveMessage(msgSize);
			if (data.result !== 0) {
				// Failed to receive message from GameCoordinator
				return;
			}

			let headerLength = data.buffer.readUInt32LE(4); // Header - First 4 bytes are the raw msg type again
			let buf = data.buffer.slice(4 + 4 + headerLength); // Raw message type & Header length & Header size
			let msgType = data.msgType & ~PROTO_MASK;

			this.emit("receivedFromGC", 730, msgType, buf);
		}, 10);
	}

	async logOn(details) {
		// Ignore login details - We use Steamworks

		// Temporarily change working directory for loading DLLs
		let oldDir = process.cwd();

		try {
			process.chdir(path.join(__dirname, "..", "data", Helper.GetOSDir()));

			Steam = require("steam");
		} catch {
			console.log("Failed to find Steamworks module - Attempting to automatically install...");

			// Automatically try to install it
			await new Promise((resolve, reject) => {
				let child = childProcess.exec("npm i ./extension/steam --save-optional", {
					cwd: path.join(__dirname, ".."),
					windowsHide: true
				});

				child.stdout.pipe(process.stdout);
				child.stderr.pipe(process.stderr);

				child.on("exit", (code, signal) => {
					if (code === 0) {
						resolve();
					} else {
						reject(new Error("Failed to automatically install required addon. Please run \"npm i ./extension/steam\" and make sure you have the required Build Tools and Node-GYP installed."));
					}
				});
			});

			try {
				Steam = require("steam");
			} catch {
				this.emit("error", new Error("Failed to automatically install required addon. Please run \"npm i ./extension/steam\"."));
				return;
			}
		}

		process.chdir(path.join(__dirname, "..", "data"));

		console.log("");
		Steam.Init();
		console.log("");

		this.steamID = new SteamID(Steam.GetSteamID());

		// Restore working directory
		process.chdir(oldDir);

		this.emit("loggedOn");
		this.emit("user", this.steamID, {
			gameid: "0"
		});
	}

	logOff() {
		// Shutdown
		Steam.Shutdown();
		Steam = undefined;
	}

	setPersona(persona) {
		// Nothing. Just here to prevent crashing.
	}

	gamesPlayed(games) {
		// Emit "appLaunched" with 730
		this.emit("appLaunched", 730);
	}

	uploadRichPresence(app, details) {
		// Parse whatever is passed in and call SetRichPresence from Steamworks
		for (let key in details) {
			if (typeof details[key] !== "string") {
				continue;
			}

			Steam.SetRichPresence(key, details[key]);
		}
	}


	sendToGC(appid, msg, proto, buffer) {
		// Handle and send to GC
		// We shouldn't ignore proto but I am going since its unused in this script anyways
		let rawMsg = msg | PROTO_MASK;

		let buf = Buffer.alloc(4 + 4); // Msg + HeaderLength
		buf.writeInt32LE(rawMsg, 0);
		buf.writeInt32LE(0, 4); // Header length - Ignored here
		buf = Buffer.concat([buf, buffer]);

		let result = Steam.SendMessage(rawMsg, buf);
		if (result !== 0 && result !== 3) {
			// Not successful and not logged in
			throw new Error("Failed to send GC message");
		}
	}
};
