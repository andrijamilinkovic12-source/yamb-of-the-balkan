require('dotenv').config();

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

const UserProfile = mongoose.model(
    'ProfileBackupToolUserProfile',
    new mongoose.Schema({}, { strict: false, collection: 'userprofiles' })
);

const UserProfileBackup = mongoose.model(
    'ProfileBackupToolUserProfileBackup',
    new mongoose.Schema({}, { strict: false, collection: 'userprofilebackups' })
);

function getArg(name, fallback = '') {
    const index = process.argv.indexOf(name);
    if (index === -1 || index + 1 >= process.argv.length) return fallback;
    return process.argv[index + 1];
}

function hasFlag(name) {
    return process.argv.includes(name);
}

function summarizeProfile(profile = {}) {
    return {
        playerName: profile.playerName || '',
        uidSuffix: String(profile.firebaseUid || '').slice(-6),
        balance: Number(profile.balance) || 0,
        undoTokens: Number(profile.undoTokens) || 0,
        games: Number(profile.games) || 0,
        wins: Number(profile.wins) || 0,
        losses: Number(profile.losses) || 0,
        highscore: Number(profile.highscore) || 0,
        trophies: Array.isArray(profile.unlockedTrophies) ? profile.unlockedTrophies.length : 0,
        skins: Array.isArray(profile.unlockedSkins) ? profile.unlockedSkins.length : 0,
        effects: Array.isArray(profile.unlockedEffects) ? profile.unlockedEffects.length : 0,
        unlocks: Array.isArray(profile.yamb_unlocked) ? profile.yamb_unlocked.length : 0,
        lastLogin: profile.lastLogin || null
    };
}

function summarizeBackup(backup = {}) {
    const profile = backup.profile || {};
    return {
        id: String(backup._id || ''),
        createdAt: backup.createdAt || null,
        reason: backup.reason || '',
        playerName: backup.playerName || profile.playerName || '',
        firebaseUid: backup.firebaseUid || profile.firebaseUid || '',
        ...summarizeProfile(profile)
    };
}

function printJsonLine(label, value) {
    console.log(`${label} ${JSON.stringify(value)}`);
}

async function listRecentBackups() {
    const days = Math.max(1, parseInt(getArg('--days', '14'), 10) || 14);
    const limit = Math.max(1, Math.min(100, parseInt(getArg('--limit', '50'), 10) || 50));
    const minBalance = Math.max(0, parseInt(getArg('--min-balance', '0'), 10) || 0);
    const name = getArg('--name', '').trim();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query = { createdAt: { $gte: since } };
    if (name) {
        query.$or = [
            { playerName: new RegExp(name, 'i') },
            { 'profile.playerName': new RegExp(name, 'i') }
        ];
    }
    if (minBalance > 0) {
        query['profile.balance'] = { $gte: minBalance };
    }

    const backups = await UserProfileBackup.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    printJsonLine('BACKUPS', { count: backups.length, days, limit, minBalance, name });
    backups.forEach(backup => printJsonLine('BACKUP', summarizeBackup(backup)));
}

async function listRecentUsers() {
    const limit = Math.max(1, Math.min(100, parseInt(getArg('--limit', '50'), 10) || 50));
    const minBalance = Math.max(0, parseInt(getArg('--min-balance', '0'), 10) || 0);
    const name = getArg('--name', '').trim();
    const query = {};

    if (name) {
        query.playerName = new RegExp(name, 'i');
    }
    if (minBalance > 0) {
        query.balance = { $gte: minBalance };
    }

    const users = await UserProfile.find(query)
        .sort({ lastLogin: -1 })
        .limit(limit)
        .lean();

    printJsonLine('USERS', { count: users.length, limit, minBalance, name });
    users.forEach(user => printJsonLine('USER', {
        firebaseUid: user.firebaseUid || '',
        ...summarizeProfile(user)
    }));
}

async function restoreBackup() {
    const backupId = getArg('--backup-id', '').trim();
    const uid = getArg('--uid', '').trim();
    const dryRun = hasFlag('--dry-run');

    if (!backupId && !uid) {
        throw new Error('Restore needs --backup-id or --uid.');
    }

    const backup = backupId
        ? await UserProfileBackup.findById(backupId).lean()
        : await UserProfileBackup.findOne({ firebaseUid: uid }).sort({ createdAt: -1 }).lean();

    if (!backup || !backup.profile) {
        throw new Error('Backup not found.');
    }

    const profile = { ...backup.profile };
    delete profile._id;
    delete profile.__v;

    if (!profile.firebaseUid) {
        profile.firebaseUid = backup.firebaseUid;
    }
    if (!profile.firebaseUid) {
        throw new Error('Backup profile has no firebaseUid.');
    }

    printJsonLine(dryRun ? 'RESTORE_DRY_RUN' : 'RESTORE', {
        backup: summarizeBackup(backup),
        profile: summarizeProfile(profile)
    });

    if (dryRun) return;

    await UserProfile.findOneAndUpdate(
        { firebaseUid: profile.firebaseUid },
        { $set: profile },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    printJsonLine('RESTORE_DONE', {
        firebaseUid: profile.firebaseUid,
        ...summarizeProfile(profile)
    });
}

async function main() {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is not set.');
    }

    const command = process.argv[2] || 'list-backups';
    await mongoose.connect(MONGO_URI);

    if (command === 'list-backups') {
        await listRecentBackups();
    } else if (command === 'list-users') {
        await listRecentUsers();
    } else if (command === 'restore') {
        await restoreBackup();
    } else {
        throw new Error(`Unknown command: ${command}`);
    }

    await mongoose.disconnect();
}

main().catch(async error => {
    console.error('PROFILE_BACKUP_TOOL_ERROR', error.message);
    try {
        await mongoose.disconnect();
    } catch (disconnectError) {}
    process.exit(1);
});
