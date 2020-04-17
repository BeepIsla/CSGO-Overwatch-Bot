module.exports = (demoFile, sid, data) => {
    //TODO Role based in damage player_hurt attacker userid dmg_health or dmg_armor
    demoFile.gameEvents.on("player_death", (event) => {
        const victim = demoFile.entities.getByUserId(event.userid);
        const attacker = demoFile.entities.getByUserId(event.attacker);
        if (!attacker || attacker.steam64Id === "BOT" || attacker.steam64Id !== sid.getSteamID64()) {
            return;
        }

        if(attacker.teamNumber === victim.teamNumber){
            data.curcasetempdata.TeamKill_infractions.push(demoFile.currentTick);
            //console.log("TK")
        }

    })
};
/**
 * @returns Team number (0: Unassigned, 1: Spectator, 2: Terrorist, 3: Counter-Terrorist)
 */