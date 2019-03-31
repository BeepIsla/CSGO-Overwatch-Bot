const almostEqual = require("almost-equal");

module.exports = (demoFile, sid, data, config) => {
	let startPosition = [];
	let positionEachTickBetweenRounds = [];
	demoFile.on("tickend__", (tick) => {
		if (tick.player <= -1) {
			positionEachTickBetweenRounds = [];
			startPosition = [];
			return;
		}

		let ourPlayer = demoFile.players[tick.player];
		if (typeof ourPlayer === "undefined") {
			positionEachTickBetweenRounds = [];
			startPosition = [];
			return;
		}

		positionEachTickBetweenRounds.push(ourPlayer.position);
	});

	demoFile.on("round_freeze_end", () => {
		positionEachTickBetweenRounds = [];

		let ourPlayer = demoFile.players.filter(p => p.steam64Id !== "BOT" && p.steam64Id === sid.getSteamID64());
		if (ourPlayer.length <= 0) { // User left
			positionEachTickBetweenRounds = [];
			startPosition = [];
			return;
		}

		startPosition = ourPlayer[0].position;
	});

	demoFile.on("round_end", () => {
		let changedPos = false;
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
