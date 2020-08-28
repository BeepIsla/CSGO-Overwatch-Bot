const Events = require("events");
const ByteBuffer = require("bytebuffer");

module.exports = class Coordinator extends Events {
	constructor(steamUser, appID) {
		super();

		this.appID = appID;
		this.steamUser = steamUser;

		this.steamUser.on("receivedFromGC", (appid, msgType, payload) => {
			if (appid !== this.appID) {
				return;
			}

			this.emit("receivedFromGC", msgType, payload);
		});

		let _handleMessage = this.steamUser._handleMessage;
		this.steamUser._handleMessage = (header, body) => {
			this.emit("receivedFromSteam", header, body);
			_handleMessage.call(this.steamUser, header, body);
		};
	}

	/**
	 * Send a message and get the response from it if needed
	 * @param {Number|undefined} appid AppID where to send the GC message to - Pass "undefined" for customized proto
	 * @param {Number} msg The identifier of the message we are sending
	 * @param {Object} proto Header proto
	 * @param {Buffer} buffer Buffer to send
	 * @param {Number|undefined} responseHeader The response header to our request
	 * @param {Number} timeout Max number of milliseconds before we give up on waiting for our response
	 * @param {Object} extraSendOpts Should we use a callback to send this message?
	 * @returns {Promise} Promise which resolves in the object of our response, or undefined if "responseHeader" is undefined or rejects in a timeout error
	 */
	sendMessage(appid, msg, proto, buffer, responseHeader, timeout = 30000, extraSendOpts = {}) {
		return new Promise((resolve, reject) => {
			if (!appid) {
				this.steamUser._send({
					msg: msg,
					proto: proto,
					...extraSendOpts
				}, buffer);

				if (!responseHeader) {
					resolve();
					return;
				}

				let sendTimeout = setTimeout(() => {
					if (this.steamUser._handlerManager._handlers[responseHeader] && this.steamUser._handlerManager._handlers[responseHeader].length > 0) {
						this.steamUser._handlerManager._handlers[responseHeader].pop(); // We added our message last (I assume) so remove the last one

						if (this.steamUser._handlerManager._handlers[responseHeader].length <= 0) {
							delete this.steamUser._handlerManager._handlers[responseHeader];
						}
					}

					reject(new Error("Failed to send message: Timeout"));
				}, timeout);

				this.steamUser._handlerManager.add(responseHeader, (body) => {
					if (this.steamUser._handlerManager.hasHandler(responseHeader)) {
						if (this.steamUser._handlerManager._handlers[responseHeader] && this.steamUser._handlerManager._handlers[responseHeader].length > 0) {
							this.steamUser._handlerManager._handlers[responseHeader].pop(); // We added our message last (I assume) so remove the last one

							if (this.steamUser._handlerManager._handlers[responseHeader].length <= 0) {
								delete this.steamUser._handlerManager._handlers[responseHeader];
							}
						}
					}

					clearTimeout(sendTimeout);
					resolve(ByteBuffer.isByteBuffer(body) ? body.toBuffer() : body);
				});
				return;
			}

			this.steamUser.sendToGC(appid, msg, proto, buffer);
			if (!responseHeader) {
				resolve();
				return;
			}

			let sendTimeout = setTimeout(() => {
				this.removeListener("receivedFromGC", sendMessageResponse);
				reject(new Error("Failed to send GC message: Timeout"));
			}, timeout);

			this.on("receivedFromGC", sendMessageResponse);
			function sendMessageResponse(msgType, payload) {
				if (msgType === responseHeader) {
					clearTimeout(sendTimeout);
					this.removeListener("receivedFromGC", sendMessageResponse);

					resolve(ByteBuffer.isByteBuffer(payload) ? payload.toBuffer() : payload);
				}
			}
		});
	}
};
