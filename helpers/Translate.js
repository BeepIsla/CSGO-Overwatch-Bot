const fetch = require("node-fetch");
const VDF = require("vdf-parser");

const Translate = (key) => {
	return Translate.tokens[key.toLowerCase()] || key;
};
Translate.tokens = {};
Translate.fetchTokens = async (lang = "csgo_english.txt") => {
	let response = await fetch("https://github.com/SteamDatabase/GameTracking-CSGO/blob/master/csgo/resource/" + lang + "?raw=true");
	let text = await response.text();
	let tokens = VDF.parse(text, false);

	for (let key in tokens.lang.Tokens) {
		Translate.tokens[key.toLowerCase()] = tokens.lang.Tokens[key];
	}
};

module.exports = Translate;
