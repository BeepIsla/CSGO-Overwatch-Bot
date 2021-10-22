var old_m_vecOrigin = { x: 0, y: 0, z: 0 }
var old_round = -1
const NormalizeAsYaw = function (flAngle) {
		if (flAngle > 180 || flAngle < -180)
		{
			var revolutions = Math.round(Math.abs(flAngle / 360));
	
			if (flAngle < 0)
				flAngle += 360 * revolutions;
			else
				flAngle -= 360 * revolutions;
		}
	
		return flAngle;
	}

// This class name MUST be unique or it will override other results
module.exports = class AntiAim {
	constructor(parent, config) {
		this.parent = parent; // This is the object from "Demo.js"
		this.config = config;

		// Variables
		this.infractions = [];

		// Register events
		this.parent.demo.on("tickend", this.OnTickEnd.bind(this));
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
			speedhack: false, // this.infractions.length >= this.config.verdict.minAntiAim,
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
		if (!this.parent.suspectPlayer
			|| !this.parent.suspectPlayer.isAlive
			|| this.parent.demo.gameRules.isWarmup
			|| this.parent.demo.gameRules.props.DT_CSGameRules.m_bFreezePeriod)
			return; 
		

		const weapon = this.parent.suspectPlayer.weapon ? this.parent.suspectPlayer.weapon.className : null;
		const currentWeaponIsGrenade = () => {
			const weapons = [
				"weapon_hegrenade",
				"weapon_flashbang",
				"weapon_smokegrenade",
				"weapon_decoy",
				"weapon_incgrenade",
				"weapon_molotov",
			];
			return weapons.includes(weapon);
		};
		// Check if player look at floor and check angles
		// ! Be aware. This detector is unstable. 
		// ! I don't sure by 100%, but if player just look at floor (0deg) and didn't kill anybody
		// ! this detector can say what he have AntiAim (AA)... need more tests!
		// ? Idea: https://www.unknowncheats.me/forum/counterstrike-global-offensive/208735-detecting-player-antiaim.html
		const m_flLowerBodyYawTarget = this.parent.suspectPlayer.getProp("DT_CSPlayer", "m_flLowerBodyYawTarget");
		const m_vecOrigin = this.parent.suspectPlayer.getProp("DT_CSNonLocalPlayerExclusive", "m_vecOrigin");
		const eyeAngles = this.parent.suspectPlayer.eyeAngles;
		const yaw = NormalizeAsYaw(this.parent.suspectPlayer.eyeAngles.yaw);
		const lbyDelta = m_flLowerBodyYawTarget - yaw;
		const delta1 = lbyDelta >= 20 && lbyDelta <= 60;
		const delta2 = lbyDelta >= 250 && lbyDelta <= 300;
		const round = this.parent.demo.gameRules.props.DT_CSGameRules.m_totalRoundsPlayed
		var is_moving = true
		
		if (JSON.stringify(m_vecOrigin) === JSON.stringify(old_m_vecOrigin)){
			is_moving = false
		}
		old_m_vecOrigin = this.parent.suspectPlayer.getProp("DT_CSNonLocalPlayerExclusive", "m_vecOrigin");
		if (!delta1 === !delta2){
			return;
		}
		if (currentWeaponIsGrenade() || !is_moving || yaw > 40 || round != old_round) {
			old_round = this.parent.demo.gameRules.props.DT_CSGameRules.m_totalRoundsPlayed
			return;
		}

		
		old_round = this.parent.demo.gameRules.props.DT_CSGameRules.m_totalRoundsPlayed

		this.infractions.push({
			tick: this.parent.demo.currentTick,
			angles: eyeAngles,
			lowerBodyYaw: m_flLowerBodyYawTarget,
			lowerBodyDelta: lbyDelta
		});
	}
};
