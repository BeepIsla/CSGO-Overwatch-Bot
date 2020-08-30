// This class name MUST be unique or it will override other results
module.exports = class AntiAim {
	constructor(parent, config) {
		this.parent = parent; // This is the object from "Demo.js"
		this.config = config;

		// Variables
		this.infractions = [];
		this.isActiveRound = false;

		// Register events
		this.parent.demo.on("tickend", this.OnTickEnd.bind(this));
		this.parent.demo.gameEvents.on("round_freeze_end", this.OnRoundFreezeEnd.bind(this));
		this.parent.demo.gameEvents.on("round_end", this.OnRoundEnd.bind(this));
		this.parent.demo.gameEvents.on("round_start", this.OnRoundEnd.bind(this)); // Does the same as above, no need for 2 event handlers doing the same thing
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
			speedhack: this.infractions.length >= this.config.verdict.minAntiAim,
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
		if (!this.parent.suspectPlayer || !this.parent.suspectPlayer.isAlive || !this.isActiveRound ||
			this.parent.demo.gameRules.getProp("DT_CSGameRules", "m_bWarmupPeriod")
		) {
			// Suspect left, is dead, round is not active or in warmup
			return;
		}

		// Check if player look at floor and check angles
		// ! Be aware. This detector is unstable. 
		// ! I don't sure by 100%, but if player just look at floor (0deg) and didn't kill anybody
		// ! this detector can say what he have AntiAim (AA)... need more tests!
		// ? Idea: https://www.unknowncheats.me/forum/counterstrike-global-offensive/208735-detecting-player-antiaim.html
		const m_flLowerBodyYawTarget = this.parent.suspectPlayer.getProp("DT_CSPlayer", "m_flLowerBodyYawTarget");
		const lbyDelta = m_flLowerBodyYawTarget - this.parent.suspectPlayer.eyeAngles.yaw;
		if (lbyDelta <= 40 || this.parent.suspectPlayer.eyeAngles.pitch !== 0) {
			// All good
			return;
		}

		this.infractions.push({
			tick: this.parent.demo.currentTick,
			angles: this.parent.suspectPlayer.eyeAngles,
			lowerBodyYaw: m_flLowerBodyYawTarget,
			lowerBodyDelta: lbyDelta
		});
	}

	OnRoundFreezeEnd(ev) {
		this.isActiveRound = true;
	}

	OnRoundEnd(ev) {
		this.isActiveRound = false;
	}
};
