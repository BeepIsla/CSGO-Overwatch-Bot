try {
	module.exports = require("./build/Debug/steam.node");
} catch {
	module.exports = require("./build/Release/steam.node");
}
