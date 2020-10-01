const path = require("path");
const fs = require("fs/promises");
const files = [
	// We should probably only copy some depending on OS but lets copy everything
	"steam_api.dll",			"win32/steam_api.dll",
	"win64/steam_api64.dll",	"win64/steam_api64.dll",
	"osx/libsteam_api.dylib",	"osx/libsteam_api.dylib",
	"linux64/libsteam_api.so",	"linux64/libsteam_api.so",
	"linux32/libsteam_api.so",	"linux32/libsteam_api.so"
];

// Sadly cannot download the SDK on the fly and extract it due to the download requiring you to login
// and not requiring to enter username/password is the goal of this

(async () => {
	let binPath = path.join(__dirname, "sdk", "redistributable_bin");
	let dataPath = path.join(__dirname, "..", "..", "data");

	if (!await fsExists(dataPath)) {
		await fs.mkdir(dataPath);
	}

	for (let i = 0; i < files.length; i += 2) {
		let filePath = path.join(binPath, files[i]);
		if (!await fsExists(filePath)) {
			throw new Error("Failed to find \"" + files[i] + "\"");
		}

		let folder = files[i + 1].split("/").shift();
		let folderPath = path.join(dataPath, folder);
		if (!await fsExists(folderPath)) {
			await fs.mkdir(folderPath);
		}

		let fileName = files[i].split("/").pop();
		console.log("Copying \"" + fileName + "\"...");

		let destPath = path.join(dataPath, files[i + 1]);
		if (await fsExists(destPath)) {
			await fs.unlink(destPath);
		}

		await fs.copyFile(filePath, destPath);
	}

	console.log("Writing \"steam_appid.txt\"...");
	await fs.writeFile(path.join(dataPath, "steam_appid.txt"), "730\n");
})().catch((err) => {
	process.exitCode = 1;
	throw err;
});

function fsExists(_path) {
	return new Promise((resolve, reject) => {
		fs.stat(_path).then((stat) => {
			resolve(stat.isDirectory() || stat.isFile());
		}).catch((err) => {
			resolve(false);
		});
	});
}
