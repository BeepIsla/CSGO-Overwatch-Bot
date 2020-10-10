const normalizePitch = function (angle) {
	if (angle > 89) angle = 89;
	if (angle < -89) angle = -89;
	return angle;
};

const normalizeYaw = function (angle) {
	while (angle > 180) angle -= 360;
	while (angle < -180) angle += 360;
	return angle;
};

// normal({x: -360, y: -360.00001});

// This class name MUST be unique or it will override other results
module.exports = class LBYDeltaChecker {
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
			speedhack: this.infractions.length >= this.config.verdict.minLBYDeltaChecker,
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
		// todo: add checks if player jump, in air, freeze period etc
		if (!this.parent.suspectPlayer
			|| !this.parent.suspectPlayer.isAlive
			|| this.parent.demo.gameRules.isWarmup
			|| this.parent.demo.gameRules.props.DT_CSGameRules.m_bFreezePeriod
		)
			return; 			// Suspect left or is dead or warmup

		const { pitch, yaw } = this.parent.suspectPlayer.eyeAngles;
		const eyeAngles = { pitch, yaw };
		const nPitch = normalizePitch(pitch);
		const nYaw = normalizeYaw(yaw);

		const nEyeAngles = { nPitch, nYaw };

		// https://saul.github.io/demofile/interfaces/_sendtabletypes_.dt_animationlayer.html#m_flcycle
		// https://www.unknowncheats.me/forum/1926123-post6.html
		// https://www.unknowncheats.me/forum/counterstrike-global-offensive/251015-detecting-resolving-lby-breakers.html
		// https://www.unknowncheats.me/forum/counterstrike-global-offensive/242493-animation-layers.html
		// http://ucp-anticheat.org/csgo-get-next-lby-update.html
		// http://ucp-anticheat.org/csgo-lbyt-update-prediction.html
		const m_flCycle = this.parent.suspectPlayer.getProp("DT_Animationlayer", "m_flCycle");
		const m_flPrevCycle = this.parent.suspectPlayer.getProp("DT_Animationlayer", "m_flPrevCycle");
		const m_nSequence = this.parent.suspectPlayer.getProp("DT_Animationlayer", "m_nSequence");
		const m_flWeight = this.parent.suspectPlayer.getProp("DT_Animationlayer", "m_flWeight");
		const m_flSimulationTime = this.parent.suspectPlayer.getProp("DT_BaseEntity", "m_flSimulationTime");
		const m_fFlags = this.parent.suspectPlayer.getProp("DT_BasePlayer", "m_fFlags");
		const m_flDuckAmount = this.parent.suspectPlayer.getProp("DT_BasePlayer", "m_flDuckAmount"); 
		const m_flDuckSpeed = this.parent.suspectPlayer.getProp("DT_BasePlayer", "m_flDuckSpeed");
		const m_bInDuckJump = this.parent.suspectPlayer.getProp("DT_Local", "m_bInDuckJump");
		const m_nDuckJumpTimeMsecs = this.parent.suspectPlayer.getProp("DT_Local", "m_nDuckJumpTimeMsecs");
		const m_nDuckTimeMsecs = this.parent.suspectPlayer.getProp("DT_Local", "m_nDuckTimeMsecs");
		const m_nJumpTimeMsecs = this.parent.suspectPlayer.getProp("DT_Local", "m_nJumpTimeMsecs");
		const m_flLastDuckTime = this.parent.suspectPlayer.getProp("DT_Local", "m_flLastDuckTime");
		// const m_bIsMoving = null;//this.parent.suspectPlayer.getProp("DT_AI_BaseNPC", "m_bIsMoving"); // ! don't work
		const m_iShotsFired = this.parent.suspectPlayer.getProp("DT_CSLocalPlayerExclusive", "m_iShotsFired");
		const m_flLowerBodyYawTarget = this.parent.suspectPlayer.getProp("DT_CSPlayer", "m_flLowerBodyYawTarget");

		const lbyDelta = yaw - m_flLowerBodyYawTarget;
		const n_lbyDelta = nYaw - m_flLowerBodyYawTarget;

/* 		if (lbyDelta !== n_lbyDelta) {
			console.log(lbyDelta, n_lbyDelta);
			console.log(
				{
					tick: tick,
					eyeAngles,
					nEyeAngles,
					m_flLowerBodyYawTarget,
					lbyDelta,
					n_lbyDelta
				}
			);
		} */

		const weapon = this.parent.suspectPlayer.weapon ? this.parent.suspectPlayer.weapon.className : null;
		const flashDuration = this.parent.suspectPlayer.flashDuration;
		const velocity = this.parent.suspectPlayer.velocity;
		const isDucking = this.parent.suspectPlayer.isDucking;
		const isDucked = this.parent.suspectPlayer.isDucked;

		const currentWeaponIsGrenade = () => {
			const weapons = [
				"weapon_hegrenade",
				"weapon_flashbang",
				"weapon_smokegrenade",
				"weapon_decoy",
			];

			return weapons.includes(weapon);
		};

		if (n_lbyDelta <= 40 || currentWeaponIsGrenade()) {
			// ? if I didn't check yaw I get false positive sometimes. 
			// ? but in rage cheater what really have AA detects didn't increase or decrease
			// All good
			return;
		}

		// console.log(m_flSimulationTime);

		this.infractions.push({
			tick: tick,
			eyeAngles,
			nEyeAngles,
			m_flLowerBodyYawTarget,
			lbyDelta,
			n_lbyDelta,
			DEBUG: {
				m_flCycle,
				m_flPrevCycle,
				m_nSequence,
				m_flWeight,
				m_flSimulationTime,
				m_fFlags,
				// m_bIsMoving,
				m_iShotsFired,
				weapon,
				flashDuration,
				velocity,
				m_flDuckAmount,
				m_flDuckSpeed,
				isDucking,
				isDucked,
				m_bInDuckJump,
				m_nDuckJumpTimeMsecs,
				m_nDuckTimeMsecs,
				m_nJumpTimeMsecs,
				m_flLastDuckTime,
			}
		});
	}
};
