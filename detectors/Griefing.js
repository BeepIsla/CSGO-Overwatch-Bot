// This class name MUST be unique or it will override other results
module.exports = class Griefing {
	constructor(parent, config) {
		this.parent = parent; // This is the object from "Demo.js"
		this.config = config;

		// Variables
		this.infractions = [];
		this.fireGrenades = [
			"incgrenade",
			"molotov"
		];

		// Register events
		this.parent.demo.gameEvents.on("player_death", this.OnPlayerDeath.bind(this));
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
			aimbot: false,
			wallhack: false,
			speedhack: false,
			teamharm: this.infractions.filter(i => i.type === "death").length >= this.config.verdict.minTeamKills || // Suspect killed someone "maxTeamKills" amount of times
				this.infractions.reduce((prev, cur) => prev + (cur.type === "damage" ? cur.damage : 0), 0) >= this.config.verdict.minTeamDamage // Suspect did "maxTeamDamage" damage
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
	OnPlayerDeath(ev) {
		let victim = this.parent.demo.entities.getByUserId(ev.userid);
		let attacker = this.parent.demo.entities.getByUserId(ev.attacker);
		if (!victim || !attacker || victim === attacker || attacker.steam64Id !== this.parent.suspect64Id) {
			return;
		}

		if (!attacker.isFriendly(victim) || this.fireGrenades.includes(ev.weapon)) {
			return;
		}

		this.infractions.push({
			tick: this.parent.demo.currentTick,
			type: "death"
		});
	}

	OnPlayerHurt(ev) {
		let victim = this.parent.demo.entities.getByUserId(ev.userid);
		let attacker = this.parent.demo.entities.getByUserId(ev.attacker);
		if (!victim || !attacker || victim === attacker || attacker.steam64Id !== this.parent.suspect64Id) {
			return;
		}

		if (!attacker.isFriendly(victim) || this.fireGrenades.includes(ev.weapon)) {
			return;
		}

		this.infractions.push({
			tick: this.parent.demo.currentTick,
			type: "damage",
			damage: ev.dmg_health
		});
	}
};
