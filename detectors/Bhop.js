// This class name MUST be unique or it will override other results
module.exports = class Bhop {
	constructor(parent, config) {
		this.parent = parent; // This is the object from "Demo.js"
		this.config = config;

		// Variables
		this.infractions = [];
		this.touchedGroundFirst = 0;

		// Register events
		this.parent.demo.on("tickend", this.OnTickEnd.bind(this));
		this.parent.demo.gameEvents.on("player_jump", this.OnPlayerJump.bind(this));
	}

	result() {
		/*
		This method is ran at the end when parsing of the demo has finished
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
			speedhack: this.infractions.length >= this.config.verdict.minBhop,
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
			return;
		}

		// Demos are often times recorded at a lower tickrate than the actual demo as a result bhop checks like this
		// are kinda tricky, if the tick where the client landed (and immediately jumped again) is on a tick which isn't
		// recorded in the demo this detector will simply assume the client never landed and probably cause some false negatives
		//
		// Alternatively I am wrong and "ticks which aren't recorded" are just two ticks squashed together into one, I don't know

		if (this.touchedGroundFirst === 0) {
			const FL_ONGROUND = 1 << 0;
			if ((this.parent.suspectPlayer.props.DT_BasePlayer.m_fFlags & FL_ONGROUND) === FL_ONGROUND) {
				this.touchedGroundFirst = tick;
			}
		}
	}

	OnPlayerJump(ev) {
		let user = this.parent.demo.entities.getByUserId(ev.userid);
		if (!user || user.steam64Id !== this.parent.suspect64Id) {
			return; // Attacker no longer available or not our suspect
		}

		if (this.parent.snapshotrate === 0) {
			return;
		}

		let serverTickRate = 1 / this.parent.demo.tickInterval;
		let tickRatio = (serverTickRate > this.parent.snapshotrate) ? (serverTickRate / this.parent.snapshotrate) : (this.parent.snapshotrate / serverTickRate);

		let diff = this.parent.demo.currentTick - this.touchedGroundFirst;
		diff = diff / tickRatio;

		this.touchedGroundFirst = 0;

		if (diff <= this.config.parsing.bhop.tickDiff) {
			this.infractions.push({
				tick: this.parent.demo.currentTick,
				diff: diff
			});
		}
	}
};
