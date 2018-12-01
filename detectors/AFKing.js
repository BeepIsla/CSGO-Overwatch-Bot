const SteamID = require("steamid");
const almostEqual = require("almost-equal");

module.exports = (demoFile, sid, data, config) => {
	var startPosition = [];
	var positionEachTickBetweenRounds = [];
	demoFile.on("tickend", (curTick) => {
		var ourPlayer = demoFile.players.filter(p => p.steamId !== "BOT" && new SteamID(p.steamId).getSteamID64() === sid.getSteamID64());
		if (ourPlayer.length <= 0) { // User left
			positionEachTickBetweenRounds = [];
			startPosition = [];
			return;
		}

		positionEachTickBetweenRounds.push(ourPlayer[0].position);
	});

	demoFile.on("round_freeze_end", () => {
		positionEachTickBetweenRounds = [];

		var ourPlayer = demoFile.players.filter(p => p.steamId !== "BOT" && new SteamID(p.steamId).getSteamID64() === sid.getSteamID64());
		if (ourPlayer.length <= 0) { // User left
			positionEachTickBetweenRounds = [];
			startPosition = [];
			return;
		}

		startPosition = ourPlayer[0].position;
	});

	demoFile.on("round_end", () => {
		var changedPos = false;
		for (let pos of positionEachTickBetweenRounds) {
			for (let i = 0; i < pos.length; i++) {
				if (!almostEqual(startPosition[i], pos[i], config.parsing.afking.radius)) {
					// User has gone out side of the radius
					changedPos = true;
					break;
				}
			}
		}

		if (changedPos === false) { // User was within the defined radius for an entire round
			data.curcasetempdata.AFKing_infractions.push(positionEachTickBetweenRounds);
		}
	});
};
