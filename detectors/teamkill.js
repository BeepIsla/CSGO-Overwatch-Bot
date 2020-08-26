module.exports = (demoFile, sid, data) => {
    demoFile.gameEvents.on("player_death", (event) => {
        const victim = demoFile.entities.getByUserId(event.userid);
        const attacker = demoFile.entities.getByUserId(event.attacker);
        isNotMolotovInc = (event) => {
            return event.weapon != "incgrenade" && event.weapon != "molotov";
        }
        if (!victim || !attacker || attacker.steam64Id === "BOT" || attacker.steam64Id !== sid.getSteamID64() || victim === attacker) {
            return;
        }
        if(attacker.isFriendly(victim) && isNotMolotovInc(event)){
            data.curcasetempdata.teamKill_infractions.push(demoFile.currentTick);
        }

    })
};

