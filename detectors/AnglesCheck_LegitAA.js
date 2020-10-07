// This class name MUST be unique or it will override other results
module.exports = class AnglesCheck_LegitAA {
	constructor(parent, config) {
		this.parent = parent; // This is the object from "Demo.js"
		this.config = config;

		// Variables
		this.infractions = [];

		// Register events
		this.parent.demo.on("tickend", this.OnTickEnd.bind(this));
	}

	result() {
		// todo: rewrite this block
		let data = [];
		this.infractions.forEach((v) => {
			const key = v.angles.pitch.toFixed(2);
			const exist = data.find(v => v.key === key);
			if (exist) return exist.value++;
			data.push({ key: key, value: 1 });
		})
		data.sort((a, b) => b.value - a.value)
		data = data.filter(key => key.value >= 100); // remove detects what has been called lower times

		let counter = 0;	// Count of detects for rewrite infractions length
		data.forEach(key => counter += key.value);

		// console.log("data", data);

		const max = Math.max.apply(Math, data.map(e => e.value));
		const min = Math.min.apply(Math, data.map(e => e.value));

		const obj =
		{
			data, max, min
		}

		this.infractions.length = counter;

		this.infractions.unshift(obj);


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
			speedhack: this.infractions.length - 1 >= this.config.verdict.minAnglesCheck_LegitAA,
			// -1 detect because of obj with debug (log) 
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
			|| this.parent.demo.gameRules.props.DT_CSGameRules.m_bFreezePeriod) {
			// Suspect left or he is dead or warmup or freeze period
			return;
		}

		const { pitch, yaw } = this.parent.suspectPlayer.eyeAngles;

		const cheatAngles = [
			"358.96",
			"359.89",
			"0.99",
			"0.28",
			"0.07",
			// "359.96", // ! idk danny is have AA or not
			// "359.45", // ! banned by 76561198266718297
			"3.44",
			"359.48",
			"0.13",
			"2.06",
			"359.94",
			"359.51",
			"359.36",
			"359.57",
			"358.90",
			"359.78",

		];

		const angle = cheatAngles.find(angle => angle === pitch.toFixed(2));
		if (!angle) return;

		this.infractions.push(
			{
				tick: tick,
				angles: { pitch, yaw }
			}
		);
	}
};
