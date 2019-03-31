const almostEqual = require("almost-equal");

module.exports = (demoFile, sid, data, config) => {
	let lastFewAngles = [];
	demoFile.on("tickend__", (tick) => {
		if (tick.player <= -1) {
			lastFewAngles = [];
			return;
		}

		let ourPlayer = demoFile.players[tick.player];
		lastFewAngles.push(ourPlayer.eyeAngles);

		if (lastFewAngles.length >= config.parsing.aimbot.maxTicks) {
			lastFewAngles.shift();
		}
	});

	demoFile.gameEvents.on("player_death", (event) => {
		let attacker = demoFile.entities.getByUserId(event.attacker);
		if (!attacker || attacker.steam64Id === "BOT" || attacker.steam64Id !== sid.getSteamID64()) {
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
