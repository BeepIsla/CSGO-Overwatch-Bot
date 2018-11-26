module.exports = class Decoder {
	// This is not good, but it works so /shrug
	constructor(csgoUser) {
		this.csgoUser = csgoUser;
		this.protobufs = Object.keys(this.csgoUser.Protos).filter(p => Object.keys(this.csgoUser.Protos[p]).includes("decode"));
		this.headers = Object.keys(this.csgoUser.Protos).filter(p => !Object.keys(this.csgoUser.Protos[p]).includes("decode")).map((p) => {
			var keys = Object.keys(this.csgoUser.Protos[p]);
			var returnValue = {
				main: p,
				keys: []
			};

			for (let key of keys) {
				returnValue.keys.push({
					main: p,
					key: key,
					num: this.csgoUser.Protos[p][key]
				});
			}

			return returnValue;
		});
	};

	decode(event) {
		// Match headers
		var matchingHeaders = this.headers.map(h => h.keys).filter((k) => {
			var index = k.map(n => n.num).indexOf(event.header.msg);
			if (index <= -1) {
				return false;
			}

			return k[index];
		}).map((h) => {
			var main = h[0].main;
			var keys = h.filter((hh) => {
				if (hh.num !== event.header.msg) {
					return false;
				}

				return { key: hh.key, num: hh.num }
			});

			return {
				main: main,
				keys: keys
			}
		});

		// Decode protobufs
		var decoded = [];
		for (let proto of this.protobufs) {
			try {
				var msg = this.csgoUser.Protos[proto].decode(event.buffer);
				decoded.push({
					protobuf: proto,
					decoded: msg
				});
			} catch(e) {};
		}

		return { header: event.header, matchingHeaders: matchingHeaders, decoded: decoded };
	};
};
