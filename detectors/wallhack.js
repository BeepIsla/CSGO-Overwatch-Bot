module.exports = (demoFile, sid, data, config) => {
	demoFile.gameEvents.on("player_death", (event) => {
		let attacker = demoFile.entities.getByUserId(event.attacker);
		if (!attacker || attacker.steam64Id === "BOT" || attacker.steam64Id !== sid.getSteamID64()) {
			return; // Attacker no longer available or not our attacker
		}

		// TODO: Change this to be based on damage instead of death
		if (event.penetrated > 0) {
			data.curcasetempdata.Wallhack_infractions.push(demoFile.currentTick);
		}
	});
};
