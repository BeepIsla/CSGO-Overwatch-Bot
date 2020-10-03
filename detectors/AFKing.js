const almostEqual = require("almost-equal");

// This class name MUST be unique or it will override other results
module.exports = class AFKing {
	constructor(parent, config) {
		this.parent = parent; // This is the object from "Demo.js"
		this.config = config;

		// Variables
		this.infractions = [];
		this.startPosition = undefined;
		this.roundPosition = [];

		// Register events
		this.parent.demo.on("tickend", this.OnTickEnd.bind(this));
		this.parent.demo.gameEvents.on("round_freeze_end", this.OnRoundFreezeEnd.bind(this));
		this.parent.demo.gameEvents.on("round_end", this.OnRoundEnd.bind(this));
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
			aimbot: false,
			wallhack: false,
			speedhack: false,
			teamharm: this.infractions.length >= this.config.verdict.minAFKing
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
		if (!this.parent.suspectPlayer) {
			// Suspect left
			this.roundPosition = [];
			return;
		}

		if (!this.parent.suspectPlayer.isAlive) {
			// Spectating players change their position based on who they are spectating
			return;
		}

		if (this.parent.demo.gameRules.getProp("DT_CSGameRules", "m_bWarmupPeriod")) {
			// Do not do this during warmup
			this.roundPosition = [];
			return;
		}

		if ((tick % (10 * this.parent.demo.tickRate)) > 1) {
			// Only get position every 10 seconds
			return;
		}

		this.roundPosition.push(this.parent.suspectPlayer.position);
	}

	OnRoundFreezeEnd(ev) {
		if (!this.parent.suspectPlayer) {
			return;
		}

		this.startPosition = this.parent.suspectPlayer.position;
		this.roundPosition = [];
	}

	OnRoundEnd(ev) {
		if (this.roundPosition.length <= 0 || !this.startPosition) {
			// Don't do any checks
			return;
		}

		for (let pos of this.roundPosition) {
			if (!almostEqual(pos.x, this.startPosition.x, this.config.parsing.afking.radius, 0) ||
				!almostEqual(pos.y, this.startPosition.y, this.config.parsing.afking.radius, 0) ||
				!almostEqual(pos.z, this.startPosition.z, this.config.parsing.afking.radius, 0)
			) {
				// Suspect moved
				this.roundPosition = [];
				return;
			}
		}

		this.infractions.push({
			tick: this.parent.demo.currentTick,
			positions: this.roundPosition
		});
		this.roundPosition = [];
	}
};
