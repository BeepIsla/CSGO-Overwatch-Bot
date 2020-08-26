module.exports = (demoFile, sid, data) => {
    demoFile.on("tickend__", (tick) => {
        let ourPlayer = demoFile.players[tick.player];
        if (typeof ourPlayer === "undefined") {
            return;
        }
        if (ourPlayer.isAlive) {
            const eyeAngles = ourPlayer.eyeAngles;
            const m_flLowerBodyYawTarget = ourPlayer.getProp("DT_CSPlayer", "m_flLowerBodyYawTarget");
            const lbyDelta = m_flLowerBodyYawTarget - ourPlayer.eyeAngles.yaw;

            // Check if player look at floor and check angles
            // ! Be aware. This detector is unstable. 
            // ! I don't sure by 100%, but if player just look at floor (0deg) and didn't kill anybody
            // ! this detector can say what he have AntiAim (AA)... need more tests!
            // ? Idea: https://www.unknowncheats.me/forum/counterstrike-global-offensive/208735-detecting-player-antiaim.html
            if (lbyDelta > 40 && ourPlayer.eyeAngles.pitch === 0) {
                data.curcasetempdata.AA_infractions.push({ eyeAngles, lbyDelta });
            };
        }
    });
}
