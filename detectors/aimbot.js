const almostEqual = require("almost-equal");

// This class name MUST be unique or it will override other results
module.exports = class Aimbot {
	constructor(parent, config) {
		this.parent = parent; // This is the object from "Demo.js"
		this.config = config;

		// Variables
		this.lastAngles = [];
		this.infractions = [];

		// Register events
		this.parent.demo.on("tickend", this.OnTickEnd.bind(this));
		this.parent.demo.gameEvents.on("player_death", this.OnPlayerDeath.bind(this));
	}

	result() {
		/*
		This method is raan at the end when parsing of the demo has finished
		It should ALWAYS return an object like this:
		{
			aimbot: false, // True if this detector thought the player was aimbotting
			wallhack: false, // True if this detector thought the player was wallhacking
			speedhack: false, // True if this detector thought the player was using some kind of other cheat (Speedhack, Teleportation, Bunnyhop, etc)
			teamharm: false // True if this detector thought the player has shown anti-competitive behaviour (Griefing, Boosting Lobby, etc)
		}
		*/
		return {
			aimbot: this.infractions.length >= this.config.verdict.minAimbot,
			wallhack: false,
			speedhack: false,
			teamharm: false
		};
	}

	resultRaw() {
		/*
		This method is ran at the end when parsing of the demo has finished
		It must return an array with the infractions the suspect received
		*/
		return this.infractions;
	}

	/******************
	 * Custom Methods *
	 ******************/
	OnTickEnd(tick) {
		if (!this.parent.suspectPlayer || !this.parent.suspectPlayer.eyeAngles) {
			this.lastAngles = [];
			return;
		}

		this.lastAngles.push(this.parent.suspectPlayer.eyeAngles);
		if (this.lastAngles.length > this.config.parsing.aimbot.maxTicks) {
			this.lastAngles.shift();
		}
	}

	OnPlayerDeath(ev) {
		let attacker = this.parent.demo.entities.getByUserId(ev.attacker);
		if (!attacker || attacker.steam64Id !== this.parent.suspect64Id) {
			return; // Attacker no longer available or not our suspect
		}

		for (let i = 0; i < this.lastAngles.length; i++) {
			// Check pitch
			if (typeof this.lastAngles[i] !== "undefined" && typeof this.lastAngles[i + 1] !== "undefined") {
				if (!almostEqual(this.lastAngles[i].pitch, this.lastAngles[i + 1].pitch, this.config.parsing.aimbot.threshold)) {
					if (this.Is360Difference(this.lastAngles[i].pitch, this.lastAngles[i + 1].pitch)) {
						continue;
					}

					this.infractions.push({
						prevAngle: this.lastAngles[i],
						nextAngle: this.lastAngles[i + 1],
						tick: this.parent.demo.currentTick
					});
				}
			}

			// Check yaw
			if (typeof this.lastAngles[i] !== "undefined" && typeof this.lastAngles[i + 1] !== "undefined") {
				if (!almostEqual(this.lastAngles[i].yaw, this.lastAngles[i + 1].yaw, this.config.parsing.aimbot.threshold)) {
					if (this.Is360Difference(this.lastAngles[i].yaw, this.lastAngles[i + 1].yaw)) {
						continue;
					}

					this.infractions.push({
						prevAngle: this.lastAngles[i],
						nextAngle: this.lastAngles[i + 1],
						tick: this.parent.demo.currentTick
					});
				}
			}
		}
	}

	/*************************************
	 * Helpers specific to this detector *
	 *************************************/
	// Shitty check for 360 changes
	Is360Difference(angle1, angle2) {
		// Check 0 < 360
		if (angle1 <= this.config.parsing.aimbot.threshold && angle1 >= 0.0 && angle2 <= 360.0 && angle2 >= (360.0 - this.config.parsing.aimbot.threshold)) {
			return true;
		}

		// Check 360 > 0
		if (angle1 <= 360.0 && angle1 >= (360.0 - this.config.parsing.aimbot.threshold) && angle2 <= this.config.parsing.aimbot.threshold && angle2 >= 0.0) {
			return true;
		}

		return false;
	}
};
