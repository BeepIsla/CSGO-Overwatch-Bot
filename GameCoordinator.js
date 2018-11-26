const Protos = require("./protos.js");
const Events = require("events");
const Steam = require("steam");

module.exports = class GameCoordinator extends Events {
	constructor(steamUser) {
		super();

		this._SteamUser = steamUser;
		this._GC = new Steam.SteamGameCoordinator(steamUser.client, 730);
		this.Protos = Protos;

		this._GC.on("message", (header, buffer, callback) => {
			this.emit("debug", { header: header, buffer: buffer });

			if (header.msg == Protos.EGCBaseClientMsg.k_EMsgGCClientWelcome) {
				// Hello GC! 👋
				// Stop ClientHello interval
				if (this._GCHelloInterval) clearInterval(this._GCHelloInterval);
			}
		});
	};

	start() {
		// Send once instantly and then with a 10 second delay to avoid starting the entire process twice or more when having a bad connection
		this._GC.send({
			msg: Protos.EGCBaseClientMsg.k_EMsgGCClientHello,
			proto: {}
		}, new Protos.CMsgClientHello({}).toBuffer());

		this._GCHelloInterval = setInterval(() => {
			// Client Hello
			this._GC.send({
				msg: Protos.EGCBaseClientMsg.k_EMsgGCClientHello,
				proto: {}
			}, new Protos.CMsgClientHello({}).toBuffer());
		}, (10 * 1000));
	};
}
