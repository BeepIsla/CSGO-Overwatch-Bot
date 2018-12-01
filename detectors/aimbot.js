const SteamID = require("steamid");
const almostEqual = require("almost-equal");

module.exports = (demoFile, sid, data, config) => {
	var lastFewAngles = [];
	demoFile.on("tickend", (curTick) => {
		var ourPlayer = demoFile.players.filter(p => p.steamId !== "BOT" && new SteamID(p.steamId).getSteamID64() === sid.getSteamID64());
		if (ourPlayer.length <= 0) { // User left
			lastFewAngles = [];
			return;
		}
		lastFewAngles.push(ourPlayer[0].eyeAngles);

		if (lastFewAngles.length >= config.parsing.aimbot.maxTicks) {
			lastFewAngles.shift();
		}
	});

	demoFile.gameEvents.on("player_death", (event) => {
		var attacker = demoFile.entities.getByUserId(event.attacker);
		if (!attacker || attacker.steamId === "BOT" || new SteamID(attacker.steamId).getSteamID64() !== sid.getSteamID64()) {
			return; // Attacker no longer available or not our attacker
		}

		for (let i = 0; i < lastFewAngles.length; i++) {
			// Check pitch
			if (typeof lastFewAngles[i] !== "undefined" && typeof lastFewAngles[i + 1] !== "undefined") {
				if (!almostEqual(lastFewAngles[i].pitch, lastFewAngles[i + 1].pitch, config.parsing.aimbot.threshold)) {
					if (is360Difference(lastFewAngles[i].pitch, lastFewAngles[i + 1].pitch)) {
						continue;
					}

					data.curcasetempdata.aimbot_infractions.push({ prevAngle: lastFewAngles[i], nextAngle: lastFewAngles[i + 1], tick: demoFile.currentTick });
				}
			}

			// Check yaw
			if (typeof lastFewAngles[i] !== "undefined" && typeof lastFewAngles[i + 1] !== "undefined") {
				if (!almostEqual(lastFewAngles[i].yaw, lastFewAngles[i + 1].yaw, config.parsing.aimbot.threshold)) {
					if (is360Difference(lastFewAngles[i].yaw, lastFewAngles[i + 1].yaw)) {
						continue;
					}

					data.curcasetempdata.aimbot_infractions.push({ prevAngle: lastFewAngles[i], nextAngle: lastFewAngles[i + 1], tick: demoFile.currentTick });
				}
			}
		}
	});

	// Shitty check for 360 changes
	function is360Difference(angle1, angle2) {
		// Check 0 < 360
		if (angle1 <= config.parsing.aimbot.threshold && angle1 >= 0.0 && angle2 <= 360.0 && angle2 >= (360.0 - config.parsing.aimbot.threshold)) {
			return true;
		}

		// Check 360 > 0
		if (angle1 <= 360.0 && angle1 >= (360.0 - config.parsing.aimbot.threshold) && angle2 <= config.parsing.aimbot.threshold && angle2 >= 0.0) {
			return true;
		}

		return false;
	}
};
