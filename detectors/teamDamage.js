module.exports = (demoFile, sid, data) => {
    //TODO exclude motolov and Incendiary damge, "TROLL TEAM"
    demoFile.gameEvents.on("player_hurt", (event) => {
        const victim = demoFile.entities.getByUserId(event.userid);
        const attacker = demoFile.entities.getByUserId(event.attacker);
        if (!attacker || attacker.steam64Id === "BOT" || attacker.steam64Id !== sid.getSteamID64() || victim === attacker) {
            return;
        }
        if(attacker.teamNumber === victim.teamNumber){
            data.curcasetempdata.teamDamage_infractions += event.dmg_health;
            //console.log(event.weapon);
        }

    })
};

