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
		this.parent.demo.gameEvents.on("player_hurt", this.OnPlayerHurt.bind(this));
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

	OnPlayerHurt(ev) {
		let attacker = this.parent.demo.entities.getByUserId(ev.attacker);
		if (!attacker || attacker.steam64Id !== this.parent.suspect64Id) {
			return; // Attacker no longer available or not our suspect
		}

		for (let i = 0; i < this.lastAngles.length; i++) {
			if (this.lastAngles[i] && this.lastAngles[i + 1]) {
				for (let ang of ["yaw", "pitch"]) {
					let distance = this.CalculateDifference(this.lastAngles[i][ang], this.lastAngles[i + 1][ang]);
					if (distance > this.config.parsing.aimbot.threshold) {
						this.infractions.push({
							prevAngle: this.lastAngles[i],
							nextAngle: this.lastAngles[i + 1],
							tick: this.parent.demo.currentTick
						});
					}
				}
			}
		}
	}

	/*************************************
	 * Helpers specific to this detector *
	 *************************************/
	CalculateDifference(a, b) {
		let diff = b - a;
		if (diff < -180) diff += 360;
		if (diff > 180) diff -= 360;
		return diff < 0 ? -diff : diff;
	}
};
