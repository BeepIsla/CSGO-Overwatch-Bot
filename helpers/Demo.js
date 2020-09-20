const WorkerThreads = require("worker_threads");
const path = require("path");
const v8 = require("v8");

module.exports = class Demo {
	constructor(demoBuffer, steamID64, config) {
		this.demoBuffer = demoBuffer;
		this.steamID64 = steamID64;
		this.config = config;

		this.data = undefined;
		this.scoreboard = undefined;
		this.results = undefined;
		this.error = undefined;
		this.progressCallback = undefined;
	}

	logScoreboard() {
		console.log(this.scoreboard);
	}

	logResults() {
		for (let result of this.results) {
			console.log(result);
		}
	}

	parse(steam) {
		return new Promise((resolve, reject) => {
			let worker = new WorkerThreads.Worker(path.join(__dirname, "DemoWorker.js"), {
				workerData: {
					buffer: Array.from(this.demoBuffer),
					suspect64Id: this.steamID64,
					config: this.config
				}
			});

			worker.on("message", (msg) => {
				switch (msg.type) {
					case "progress": {
						if (typeof this.progressCallback !== "function") {
							break;
						}

						this.progressCallback(msg.progressFraction);
						break;
					}
					case "richPresence": {
						if (!steam) {
							break;
						}

						steam.uploadRichPresence(730, msg.richPresenceObject);
						break;
					}
					case "error": {
						this.error = v8.deserialize(Buffer.from(msg.error));
						break;
					}
					case "data": {
						this.data = msg.data;
						this.scoreboard = msg.scoreboard;
						this.results = msg.results;
						break;
					}
					default: {
						break;
					}
				}
			});

			worker.on("exit", (exitCode) => {
				if (exitCode !== 0) {
					reject(new Error("Unexpected exit code: " + exitCode));
				} else if (this.error) {
					reject(this.error);
				} else if (!this.data) {
					reject(new Error("Worker exited without sending parsing data"));
				} {
					resolve(this.data);
				}
			});
		});
	}
};
