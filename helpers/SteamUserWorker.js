const WorkerThreads = require("worker_threads");
const Steam = require("steam-user");
const serializeError = require("serialize-error");

let client = new Steam({
	// Do not automatically log back in - Process must exit and an external program like PM2 must auto restart
	autoRelogin: false
});

client.logOn(WorkerThreads.workerData);

WorkerThreads.parentPort.on("message", (ev) => {
	switch (ev.type) {
		case "logOff": {
			client.logOff();
			break;
		}
		case "setPersona": {
			client.setPersona(ev.data);
			break;
		}
		case "gamesPlayed": {
			client.gamesPlayed(ev.data);
			break;
		}
		case "uploadRichPresence": {
			client.uploadRichPresence(ev.data.app, ev.data.details);
			break;
		}
		case "sendToGC": {
			client.sendToGC(ev.data.appid, ev.data.msg, ev.data.proto, Buffer.from(ev.data.buffer));
			break;
		}
		default: {
			break;
		}
	}
});

client.on("loggedOn", () => {
	WorkerThreads.parentPort.postMessage({
		type: "loggedOn",
		data: {
			steamID: client.steamID ? client.steamID.getSteamID64() : undefined
		}
	});
});

client.on("user", (sid, user) => {
	WorkerThreads.parentPort.postMessage({
		type: "user",
		data: {
			sid: sid.getSteamID64(),
			user: user
		}
	});
});

client.on("appLaunched", (appID) => {
	WorkerThreads.parentPort.postMessage({
		type: "appLaunched",
		data: {
			appID: appID
		}
	});
});

client.on("disconnected", (eresult, msg) => {
	WorkerThreads.parentPort.postMessage({
		type: "disconnected",
		data: {
			eresult: eresult,
			msg: msg
		}
	});
});

client.on("loginKey", (key) => {
	WorkerThreads.parentPort.postMessage({
		type: "loginKey",
		data: {
			key: key
		}
	});
});

client.on("playingState", (blocked, playingApp) => {
	WorkerThreads.parentPort.postMessage({
		type: "playingState",
		data: {
			blocked: blocked,
			playingApp: playingApp
		}
	});
});

client.on("error", (err) => {
	WorkerThreads.parentPort.postMessage({
		type: "error",
		data: {
			err: serializeError.serializeError(err)
		}
	});
});

client.on("receivedFromGC", (appid, msgType, payload) => {
	WorkerThreads.parentPort.postMessage({
		type: "receivedFromGC",
		data: {
			appid: appid,
			msgType: msgType,
			payload: Array.from(payload)
		}
	});
});

client.on("steamGuard", (domain, callback, lastCodeWrong) => {
	WorkerThreads.parentPort.postMessage({
		type: "steamGuard",
		data: {
			domain: domain,
			lastCodeWrong
		}
	});

	let workerMsgEvent = (ev) => {
		if (ev.type !== "steamGuard") {
			return;
		}

		WorkerThreads.parentPort.removeListener("message", workerMsgEvent);
		callback(ev.data.code);
	};
	WorkerThreads.parentPort.on("message", workerMsgEvent);
});
