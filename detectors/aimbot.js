const almostEqual = require("almost-equal");

module.exports = (demoFile, sid, data, config) => {
	let lastFewAngles = [];
	demoFile.on("tickend__", (tick) => {
		if (tick.player <= -1) {
			lastFewAngles = [];
			return;
		}

		let ourPlayer = demoFile.players[tick.player];
		if (typeof ourPlayer === "undefined") {
			lastFewAngles = [];
			return;
		}

		// Duplicate the object so no original data gets used
		lastFewAngles.push({ ...ourPlayer.eyeAngles });

		if (lastFewAngles.length >= config.parsing.aimbot.maxTicks) {
			lastFewAngles.shift();
		}
	});

	demoFile.gameEvents.on("player_death", (event) => {
		let attacker = demoFile.entities.getByUserId(event.attacker);
		if (!attacker || attacker.steam64Id === "BOT" || attacker.steam64Id !== sid.getSteamID64()) {
			return; // Attacker no longer available or not our attacker
		}

		// Duplicate the array so no original data gets used
		let angles = [...lastFewAngles];

		for (let i = 0; i < angles.length; i++) {
			// Check pitch
			if (typeof angles[i] !== "undefined" && typeof angles[i + 1] !== "undefined") {
				if (!almostEqual(angles[i].pitch, angles[i + 1].pitch, config.parsing.aimbot.threshold)) {
					if (is360Difference(angles[i].pitch, angles[i + 1].pitch)) {
						continue;
					}

					data.curcasetempdata.aimbot_infractions.push({ prevAngle: angles[i], nextAngle: angles[i + 1], tick: demoFile.currentTick });
				}
			}

			// Check yaw
			if (typeof angles[i] !== "undefined" && typeof angles[i + 1] !== "undefined") {
				if (!almostEqual(angles[i].yaw, angles[i + 1].yaw, config.parsing.aimbot.threshold)) {
					if (is360Difference(angles[i].yaw, angles[i + 1].yaw)) {
						continue;
					}

					data.curcasetempdata.aimbot_infractions.push({ prevAngle: angles[i], nextAngle: angles[i + 1], tick: demoFile.currentTick });
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
