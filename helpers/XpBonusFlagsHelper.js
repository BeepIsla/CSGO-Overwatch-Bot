module.exports = class XpBonuxFlagsHelper {
	static kCSXpBonusFlags_EarnedXpThisPeriod = 1 << 0;
	static kCSXpBonusFlags_FirstReward = 1 << 1;
	static kCSXpBonusFlags_Msg_YourReportGotConvicted = 1 << 2; // Player Reports
	static kCSXpBonusFlags_Msg_YouPartiedWithCheaters = 1 << 3; // Party Member Banned
	static kCSXpBonusFlags_PrestigeEarned = 1 << 4;
	// ===$CHINAGOVERNMENTCERT$===
	static kCSXpBonusFlags_ChinaGovernmentCert = 1 << 5;
	// ===$CHINAGOVERNMENTCERT$===

	// Client-facing bits not backed by SQL
	static kCSXpBonusFlags_OverwatchBonus = 1 << 28; // Overwatch XP Reward
	static kCSXpBonusFlags_BonusBoostConsumed = 1 << 29;
	static kCSXpBonusFlags_ReducedGain = 1 << 30;

	static kCSXpBonusFlagsMask_SQLBacked_TimeBased = (this.kCSXpBonusFlags_EarnedXpThisPeriod | this.kCSXpBonusFlags_FirstReward);
	static kCSXpBonusFlagsMask_SQLBacked_Notifications = (this.kCSXpBonusFlags_Msg_YourReportGotConvicted | this.kCSXpBonusFlags_Msg_YouPartiedWithCheaters);
	static kCSXpBonusFlagsMask_SQLBacked_Permanent = (this.kCSXpBonusFlagsMask_SQLBacked_Notifications | this.kCSXpBonusFlags_PrestigeEarned | this.kCSXpBonusFlags_ChinaGovernmentCert);
	static kCSXpBonusFlagsMask_SQLBacked = (this.kCSXpBonusFlagsMask_SQLBacked_TimeBased | this.kCSXpBonusFlagsMask_SQLBacked_Permanent);
	static kCSXpBonusFlagsMask_Client_Permanent = (this.kCSXpBonusFlags_OverwatchBonus);
	static kCSXpBonusFlagsMask_Client_TimeBased = (this.kCSXpBonusFlags_BonusBoostConsumed | this.kCSXpBonusFlags_ReducedGain);
	// TODO: Find "Communication Abuse Reports" flag

	static flags = {
		kCSXpBonusFlags_EarnedXpThisPeriod: this.kCSXpBonusFlags_EarnedXpThisPeriod,
		kCSXpBonusFlags_FirstReward: this.kCSXpBonusFlags_FirstReward,
		kCSXpBonusFlags_Msg_YourReportGotConvicted: this.kCSXpBonusFlags_Msg_YourReportGotConvicted,
		kCSXpBonusFlags_Msg_YouPartiedWithCheaters: this.kCSXpBonusFlags_Msg_YouPartiedWithCheaters,
		kCSXpBonusFlags_PrestigeEarned: this.kCSXpBonusFlags_PrestigeEarned,
		kCSXpBonusFlags_ChinaGovernmentCert: this.kCSXpBonusFlags_ChinaGovernmentCert,
		kCSXpBonusFlags_OverwatchBonus: this.kCSXpBonusFlags_OverwatchBonus,
		kCSXpBonusFlags_BonusBoostConsumed: this.kCSXpBonusFlags_BonusBoostConsumed,
		kCSXpBonusFlags_ReducedGain: this.kCSXpBonusFlags_ReducedGain,
		kCSXpBonusFlagsMask_SQLBacked_TimeBased: this.kCSXpBonusFlagsMask_SQLBacked_TimeBased,
		kCSXpBonusFlagsMask_SQLBacked_Notifications: this.kCSXpBonusFlagsMask_SQLBacked_Notifications,
		kCSXpBonusFlagsMask_SQLBacked_Permanent: this.kCSXpBonusFlagsMask_SQLBacked_Permanent,
		kCSXpBonusFlagsMask_SQLBacked: this.kCSXpBonusFlagsMask_SQLBacked,
		kCSXpBonusFlagsMask_Client_Permanent: this.kCSXpBonusFlagsMask_Client_Permanent,
		kCSXpBonusFlagsMask_Client_TimeBased: this.kCSXpBonusFlagsMask_Client_TimeBased
	};

	static stringFlags = {
		kCSXpBonusFlags_EarnedXpThisPeriod: undefined,
		kCSXpBonusFlags_FirstReward: undefined,
		kCSXpBonusFlags_Msg_YourReportGotConvicted: {
			title: "Player Reports",
			description: "A player you reported has been convicted for cheating"
		},
		kCSXpBonusFlags_Msg_YouPartiedWithCheaters: {
			title: "Party Member Banned",
			description: "You partied with a player who has been convicted for cheating. Your skill group and XP have been adjusted"
		},
		kCSXpBonusFlags_PrestigeEarned: undefined,
		kCSXpBonusFlags_ChinaGovernmentCert: undefined,
		kCSXpBonusFlags_OverwatchBonus: {
			title: "Overwatch XP Reward",
			description: "You have submitted accurate verdicts and qualified for an Overwatch Investigator XP reward"
		},
		kCSXpBonusFlags_BonusBoostConsumed: undefined,
		kCSXpBonusFlags_ReducedGain: undefined,
		kCSXpBonusFlagsMask_SQLBacked_TimeBased: undefined,
		kCSXpBonusFlagsMask_SQLBacked_Notifications: undefined,
		kCSXpBonusFlagsMask_SQLBacked_Permanent: undefined,
		kCSXpBonusFlagsMask_SQLBacked: undefined,
		kCSXpBonusFlagsMask_Client_Permanent: undefined,
		kCSXpBonusFlagsMask_Client_TimeBased: undefined
	};

	// To be fair this whole thing is way over the top for just trying to print to console if you have bonus Overwatch XP waiting to be picked up
	// But who cares, doing this for completion. Easier copy pasting for future projects.

	static ParseBonusXPFlags(xpFlags) {
		let masks = [];
		for (let flag in this.flags) {
			if ((xpFlags & this.flags[flag]) !== this.flags[flag]) {
				continue;
			}

			masks.push(flag);
		}

		return masks;
	}

	static StringifyFlags(masks) {
		return masks.map((mask) => {
			return this.stringFlags[mask];
		}).filter((str) => {
			return typeof str === "object";
		});
	}
};
