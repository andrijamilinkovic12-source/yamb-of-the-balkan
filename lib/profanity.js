'use strict';

// Full forms keep short stems out of ordinary words and sentences.
const terms = Object.freeze([
    'idiot', 'idiote', 'idioti', 'idiota', 'idiotu', 'idiotom', 'idiotima', 'idiotkinja', 'idiotkinjo',
    'budala', 'budalo', 'budale', 'budali', 'budalom', 'budalama', 'budaletina', 'budaletino',
    'kreten', 'kretenu', 'kreteni', 'kretena', 'kretenom', 'kretenima', 'kretenko',
    'glupan', 'glupane', 'glupani', 'glupana', 'glupaco', 'glupaca',
    'majmun', 'majmune', 'majmuni', 'majmuna', 'majmuncino',
    'debil', 'debilu', 'debili', 'debila', 'debilom', 'debilima', 'debilcino',
    'moron', 'moronu', 'moroni', 'morona', 'imbecil', 'imbecilu', 'imbecili',
    'stoka', 'stoko', 'stoke', 'stoci',
    'jebem', 'jebes', 'jebe', 'jebemo', 'jebete', 'jebu', 'jebi', 'jebite',
    'jebao', 'jebala', 'jebali', 'jebalo', 'jebati', 'jebanje', 'jebanja', 'jebo',
    'jeben', 'jebena', 'jebeno', 'jebeni', 'jebenog', 'jebenom',
    'jebene', 'jebenu', 'jebenoj', 'jebenih', 'jebenima', 'jebemmu', 'jebemtimater',
    'jebac', 'jebaca', 'jebacu', 'jebaci', 'jebiga', 'jebote', 'jebemti',
    'odjebi', 'odjebite', 'odjebao', 'odjebala', 'odjebati',
    'zajebi', 'zajebes', 'zajebao', 'zajebala', 'zajebali', 'zajebavati',
    'najebao', 'najebala', 'najebali', 'najebati', 'najebaces',
    'pizda', 'pizde', 'pizdi', 'pizdo', 'pizdu', 'pizdom', 'pizdama', 'pizdun', 'pizdunu',
    'pizdetina', 'pizdetino', 'pizdarija', 'pizdarije',
    'pizdune', 'pizduna', 'pizdurina', 'pizdurino', 'pizdurinu', 'pizdetinu', 'pizdetine',
    'picka', 'picke', 'picki', 'picko', 'picku', 'pickom', 'pickama', 'pickica', 'pickice',
    'picketina', 'picketino', 'pickin', 'pickina', 'pickino', 'pickinog',
    'pickurina', 'pickurino', 'pickurinu', 'picketinu', 'picketine', 'pickicu', 'pickici', 'pickicom',
    'kurac', 'kurca', 'kurcu', 'kurcem', 'kurce', 'kurcevi', 'kurcina', 'kurcino', 'kurcinom',
    'kurcinu', 'kurcine', 'kurcini', 'kurcinama',
    'kurva', 'kurve', 'kurvi', 'kurvo', 'kurvu', 'kurvom', 'kurvama', 'kurvetina', 'kurvetino',
    'kurvetinu', 'kurvetine', 'kurvaluk', 'kurvaluka', 'kurvaluku',
    'sranje', 'sranja', 'sranju', 'sranjem', 'sranjima', 'sranjac',
    'govno', 'govna', 'govnu', 'govnom', 'govnima', 'govnar', 'govnaru', 'govnari', 'govnara',
    'govnarka', 'govnarko', 'govnarcina', 'govnarcino',
    'govnare', 'govnarom', 'govnarima', 'govnarcinu',
    'seronja', 'seronjo', 'seronje', 'seronju',
    'drolja', 'drolje', 'droljo', 'drolju', 'droljama', 'droljetina', 'droljetino',
    'kucka', 'kucke', 'kucko', 'kucku', 'kuckama',
    'drkaj', 'drkati', 'drkanje', 'drkadzija', 'drkadzijo', 'drkadzije',
    'drkam', 'drkas', 'drka', 'drkamo', 'drkate', 'drkaju', 'drkao', 'drkala', 'drkali',
    'drkanja', 'drkanju', 'drkanjem', 'drkadziju', 'drkadziji',
    'pusikurac', 'pusikurca', 'pusikurcu', 'supak', 'supku', 'supci', 'supcina', 'supcino', 'cmar',
    'peder', 'pederu', 'pedere', 'pederi', 'pedera', 'pederima', 'pedercina', 'pedercino',
    'balija', 'balijo', 'balije', 'balijcina', 'balijcino', 'siptar', 'siptaru', 'siptarcina',
    'cigancina', 'cigancino', 'ustasa', 'ustaso', 'ustase', 'chetnik', 'cetnik', 'cetniku',
    'ubi se', 'ubij se', 'ubite se', 'ubicu te', 'kill yourself', 'kys',
    'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking', 'fuck off', 'fuck you', 'fuk',
    'motherfucker', 'motherfuckers', 'motherfucking',
    'shit', 'shits', 'shitty', 'shithead', 'shitheads', 'bullshit', 'dipshit', 'horseshit',
    'bitch', 'bitches', 'bitching', 'asshole', 'assholes', 'arsehole', 'arseholes',
    'cunt', 'cunts', 'dick', 'dicks', 'dickhead', 'dickheads', 'cock', 'cocks', 'cocksucker',
    'pussy', 'pussies', 'slut', 'sluts', 'whore', 'whores',
    'faggot', 'faggots', 'nigger', 'niggers', 'nigga', 'niggas',
    'bastard', 'bastards', 'retard', 'retards', 'retarded', 'crap', 'douche', 'douchebag', 'scumbag',
    'heil hitler', 'sieg heil'
]);

const cyrillic = Object.freeze({
    '\u0430': 'a', '\u0431': 'b', '\u0432': 'v', '\u0433': 'g', '\u0434': 'd', '\u0452': 'dj',
    '\u0435': 'e', '\u0436': 'z', '\u0437': 'z', '\u0438': 'i', '\u0458': 'j', '\u043a': 'k',
    '\u043b': 'l', '\u0459': 'lj', '\u043c': 'm', '\u043d': 'n', '\u045a': 'nj', '\u043e': 'o',
    '\u043f': 'p', '\u0440': 'r', '\u0441': 's', '\u0442': 't', '\u045b': 'c', '\u0443': 'u',
    '\u0444': 'f', '\u0445': 'h', '\u0446': 'c', '\u0447': 'c', '\u045f': 'dz', '\u0448': 's',
    '\u0456': 'i', '\u0455': 's'
});
const lookalikes = Object.freeze({
    '\u0430': 'a', '\u0432': 'b', '\u0435': 'e', '\u043a': 'k', '\u043c': 'm', '\u043d': 'h',
    '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0442': 't', '\u0443': 'y', '\u0445': 'x',
    '\u0456': 'i', '\u0458': 'j', '\u0455': 's'
});
const letters = Object.freeze({
    a: '[a@4]', b: '[b8]', e: '[e3]', g: '[g69]', i: '[il1!]', j: '[jy]',
    l: '[il1!]', o: '[o0]', s: '[s5$]', t: '[t7]', z: '[z2]'
});
const compactFolds = Object.freeze({
    '@': 'a', '4': 'a', '8': 'b', '3': 'e', '6': 'g', '9': 'g', '1': 'i', '!': 'i',
    l: 'i', y: 'j', '0': 'o', '5': 's', '$': 's', '7': 't', '2': 'z'
});
const prepare = text => String(text ?? '').normalize('NFKD').replace(/\p{M}|\p{Cf}/gu, '').toLowerCase();
const fold = text => text.replace(/[^\x00-\x7f]/g, char => cyrillic[char] || (char === '\u0111' ? 'dj' : char));
function normalizeProfanityText(text) { return fold(prepare(text)); }
const compact = text => normalizeProfanityText(text).replace(/[@483691!ly05$72]/g, char => compactFolds[char])
    .replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
function compile(term) {
    // Separator and letter classes cannot overlap, avoiding ambiguous backtracking.
    const separator = '[^\\p{L}\\p{N}@!$\\s]';
    return normalizeProfanityText(term).split(' ').map(word => {
        if (!/^[a-z]+$/.test(word)) throw Error('invalid_profanity_term');
        const patterns = [];
        for (const char of word) {
            const pattern = letters[char] || char;
            if (patterns.at(-1) !== pattern) patterns.push(pattern);
        }
        return patterns.map(value => value + '+(?:' + separator + '+' + value + '+)*').join(separator + '*');
    }).join('[^\\p{L}\\p{N}@!$]*');
}
const entries = [...new Set(terms)].map(term => ({ key: compact(term),
    source: '(?<!\\p{L})' + compile(term) + '(?!\\p{L})' }));
function expression(entry, global = false) {
    const key = global ? 'censor' : 'detect';
    return entry[key] ||= new RegExp(entry.source, global ? 'gu' : 'u');
}
function containsProfanity(text) {
    const prepared = prepare(text);
    const visual = prepared.replace(/[\p{L}\p{N}@!$_]+/gu, token => {
        if (!/[a-z]/.test(token) || !/[\u0400-\u04ff]/.test(token)) return token;
        return token.replace(/[\u0400-\u04ff]/g, char => lookalikes[char] || char);
    });
    const views = new Set([fold(prepared), fold(visual)]);
    for (const view of [...views]) views.add(view.replace(/[@!$]/g, ' '));
    for (const view of [...views]) views.add(view.replace(
        /(?<![\p{L}\p{N}])(?:[a-z0-9@!$]\s+){2,}[a-z0-9@!$](?![\p{L}\p{N}])/gu,
        run => run.replace(/\s/g, '')
    ));
    return [...views].some(view => {
        const candidate = compact(view);
        return entries.some(entry => candidate.includes(entry.key) && expression(entry).test(view));
    });
}
function filterProfanity(text) {
    const raw = String(text ?? '');
    if (!containsProfanity(raw)) return raw;
    const lower = raw.toLowerCase();
    if (lower.length !== raw.length) return '***';
    const candidate = compact(lower), ranges = [];
    for (const entry of entries) {
        if (!candidate.includes(entry.key)) continue;
        for (const match of lower.matchAll(expression(entry, true))) ranges.push([match.index, match.index + match[0].length]);
    }
    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    let cursor = 0, filtered = '';
    for (const [start, end] of ranges) {
        if (end <= cursor) continue;
        filtered += raw.slice(cursor, Math.max(cursor, start)) + '***';
        cursor = end;
    }
    return cursor ? filtered + raw.slice(cursor) : '***';
}

module.exports = { containsProfanity, filterProfanity, normalizeProfanityText };
