'use strict';

const valueAt = (document, path) => path.split('.').reduce((value, key) => value?.[key], document);
const setAt = (document, path, value) => {
    const parts = path.split('.');
    const key = parts.pop();
    let target = document;
    for (const part of parts) target = target[part] ||= {};
    target[key] = value;
};

function expression(value, document) {
    if (typeof value === 'string' && value.startsWith('$')) return valueAt(document, value.slice(1));
    if (Array.isArray(value)) return value.map(item => expression(item, document));
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const entries = Object.entries(value);
    if (entries.length === 1 && entries[0][0].startsWith('$')) {
        const [operator, input] = entries[0];
        const args = expression(input, document);
        if (operator === '$ifNull') return args[0] ?? args[1];
        if (operator === '$add') return args.reduce((sum, amount) => sum + amount, 0);
        if (operator === '$subtract') return args[0] - args[1];
        if (operator === '$min') return Math.min(...args);
        if (operator === '$max') return Math.max(...args);
        if (operator === '$mergeObjects') return Object.assign({}, ...args);
        if (operator === '$concatArrays') return args.flat();
        if (operator === '$setUnion') return [...new Set(args.flat())];
        if (operator === '$slice') return args.length === 2 ? (args[1] < 0 ? args[0].slice(args[1]) : args[0].slice(0, args[1])) : args[0].slice(args[1], args[1] + args[2]);
        throw new Error('Unsupported fixture expression: ' + operator);
    }
    return Object.fromEntries(entries.map(([key, item]) => [key, expression(item, document)]));
}

function applyUpdate(document, update) {
    if (Array.isArray(update)) {
        for (const stage of update) {
            if (!stage.$set) throw new Error('Unsupported fixture stage');
            const values = expression(stage.$set, document);
            for (const [path, value] of Object.entries(values)) setAt(document, path, value);
        }
        return document;
    }
    for (const [path, amount] of Object.entries(update.$inc || {})) setAt(document, path, (valueAt(document, path) || 0) + amount);
    for (const [path, value] of Object.entries(update.$set || {})) setAt(document, path, value);
    for (const [path, value] of Object.entries(update.$addToSet || {})) setAt(document, path, [...new Set([...(valueAt(document, path) || []), ...(value?.$each || [value])])]);
    for (const [path, value] of Object.entries(update.$push || {})) {
        const array = [...(valueAt(document, path) || [])];
        array.splice(value?.$position ?? array.length, 0, ...(value?.$each || [value]));
        setAt(document, path, value?.$slice === undefined ? array : value.$slice < 0 ? array.slice(value.$slice) : array.slice(0, value.$slice));
    }
    return document;
}

function matches(document, query) {
    for (const [path, expected] of Object.entries(query)) {
        const actual = valueAt(document, path);
        if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
            if ('$exists' in expected && (actual !== undefined) !== expected.$exists) return false;
            if ('$gte' in expected && !(actual >= expected.$gte)) return false;
            if ('$ne' in expected && (Array.isArray(actual) ? actual.includes(expected.$ne) : actual === expected.$ne)) return false;
            if ('$nin' in expected && expected.$nin.includes(actual)) return false;
        } else if (actual !== expected) return false;
    }
    return true;
}

module.exports = { applyUpdate, matches, expression };
