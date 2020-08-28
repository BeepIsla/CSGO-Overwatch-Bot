const fs = require("fs");
const path = require("path");
const ByteBuffer = require("bytebuffer");
const Protobuf = require("protobufjs");

module.exports = class Protobufs {
	/**
	 * @typedef protosObject
	 * @type {Object}
	 * @property {String} name Name ot use in the output
	 * @property {Array.<String>|String} protos Array of protobuf file paths to load OR directory path to load all
	 */

	/**
	 * Parse an array of protobuf files
	 * @param {Array.<protosObject>} protos Array of objets to parse
	 * @param {Boolean} ignoreErrors Should we ignore errors or not
	 * @returns {Object}
	 */
	constructor(protos, ignoreErrors = true) {
		this.data = {};

		for (let proto of protos) {
			let root = new Protobuf.Root();
			let files = Array.isArray(proto.protos) ? proto.protos : fs.readdirSync(proto.protos).map(file => path.join(proto.protos, file));

			for (let file of files) {
				if (!file.endsWith(".proto") || !fs.existsSync(file)) {
					continue;
				}

				try {
					root = root.loadSync(file, {
						keepCase: true
					});
				} catch (err) {
					if (!ignoreErrors) {
						throw err;
					}
				}
			}

			this.data[proto.name] = root;
		}
	}

	/**
	 * Decode a protobuf
	 * @param {String|Object} protobuf Protobuf to decode buffer
	 * @param {Buffer|ByteBuffer} buffer Buffer to decode
	 * @returns {Object}
	 */
	decodeProto(protobuf, buffer) {
		if (typeof protobuf === "string") {
			let protobufName = protobuf;
			protobuf = this.data[protobufName];

			if (!protobuf) {
				for (let key in this.data) {
					protobuf = this.data[key][protobufName];
					if (protobuf) {
						break;
					}
				}
			}

			if (!protobuf) {
				return undefined;
			}
		}

		if (ByteBuffer.isByteBuffer(buffer)) {
			buffer = buffer.toBuffer();
		}

		let decoded = protobuf.decode(buffer);
		return protobuf.toObject(decoded);
	}

	/**
	 * Encode a protobuf
	 * @param {String|Object} protobuf Protobuf to encode data
	 * @param {Object} data Data to encode
	 * @returns {Buffer}
	 */
	encodeProto(protobuf, data) {
		if (typeof protobuf === "string") {
			let protobufName = protobuf;
			protobuf = this.data[protobufName];

			if (!protobuf) {
				for (let key in this.data) {
					protobuf = this.data[key][protobufName];
					if (protobuf) {
						break;
					}
				}
			}

			if (!protobuf) {
				return undefined;
			}
		}

		let message = protobuf.create(data);
		let encoded = protobuf.encode(message);
		return encoded.finish();
	}
};
