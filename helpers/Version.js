const request = require("request");

module.exports = () => {
	return new Promise((resolve, reject) => {
		request("https://raw.githubusercontent.com/BeepFelix/CSGO-Overwatch-Bot/master/package.json", (err, res, body) => {
			if (err) {
				reject(err);
				return;
			}

			let json = undefined;
			try {
				json = JSON.parse(body);
			} catch(e) {};

			if (json === undefined) {
				reject(body);
				return;
			}

			if (typeof json.version !== "string") {
				reject(json);
				return;
			}

			resolve(json.version);
		});
	});
}
