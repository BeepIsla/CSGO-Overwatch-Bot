const fs = require("fs");
const path = require("path");
const inquire = require("inquirer");
const SteamID = require("steamid");
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

		console.log("Parsing demo with suspect " + sid.getSteamID64());

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

			// Fail parsing - What do?
			console.error(err);
		});
	});
});
