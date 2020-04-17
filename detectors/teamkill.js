module.exports = (demoFile, sid, data) => {
    //TODO role in base damage player_hurt userid attacker dmg_health or dmg_armor
    demoFile.gameEvents.on("player_death", (event) => {
        const victim = demoFile.entities.getByUserId(event.userid);
        const attacker = demoFile.entities.getByUserId(event.attacker);
        if (!attacker || attacker.steam64Id === "BOT" || attacker.steam64Id !== sid.getSteamID64() || victim === attacker) {
            return;
        }
        /**
         * @returns Team number (0: Unassigned, 1: Spectator, 2: Terrorist, 3: Counter-Terrorist)
         */
        if(attacker.teamNumber === victim.teamNumber){
            data.curcasetempdata.teamKill_infractions.push(demoFile.currentTick);
            //console.log("TK")
        }

    })
};
