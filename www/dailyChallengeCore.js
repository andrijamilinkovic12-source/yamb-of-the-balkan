(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.dailyChallengeCore = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    const YAMB_BONUS = 1000;
    const MAX_REWARD = 864 + YAMB_BONUS;

    function calculateReward(dice = []) {
        const empty = { baseReward: 0, yambBonus: 0, yambCount: 0, reward: 0 };
        if (!Array.isArray(dice) || dice.length !== 6 ||
            !dice.every(value => Number.isInteger(value) && value >= 1 && value <= 6)) return empty;

        const baseReward = (dice[0] + dice[1] + dice[2] + dice[3]) * dice[4] * dice[5];
        const counts = Array(7).fill(0);
        dice.forEach(value => { counts[value]++; });
        const yambCount = Math.max(...counts);
        const yambBonus = yambCount >= 5 ? YAMB_BONUS : 0;
        return { baseReward, yambBonus, yambCount: yambBonus ? yambCount : 0, reward: baseReward + yambBonus };
    }

    return Object.freeze({ YAMB_BONUS, MAX_REWARD, calculateReward });
});
