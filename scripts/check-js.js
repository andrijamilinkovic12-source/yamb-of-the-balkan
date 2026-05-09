const { readdirSync } = require('fs');
const { join, relative } = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const wwwDir = join(root, 'www');

const files = [
    join(root, 'server.js'),
    ...readdirSync(wwwDir)
        .filter(name => name.endsWith('.js') && !name.endsWith('.min.js'))
        .map(name => join(wwwDir, name))
];

let failed = false;

for (const file of files) {
    const displayName = relative(root, file);
    console.log(`CHECK ${displayName}`);

    const result = spawnSync(process.execPath, ['--check', file], {
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}
