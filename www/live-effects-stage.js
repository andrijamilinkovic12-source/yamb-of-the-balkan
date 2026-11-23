/* Animated effect scenes. PNGs are physical components; motion, light and particles are drawn live. */
const LIVE_STAGE_EFFECT_DURATIONS = Object.freeze({
    ice_age: 6500, neon_pulse: 5000, thunder: 4500, balkan: 8600, fireworks: 7000,
    drones: 8200, cosmic_dust: 6000, ufo_abduction: 7500, dragon_fire: 5500, royal_yamb: 8000
});
const LIVE_STAGE_EFFECT_IDS = Object.freeze(Object.keys(LIVE_STAGE_EFFECT_DURATIONS));
const ICE_AGE_GROWTH_SECONDS = 2.8;
const UFO_BEAM_START = 1.35, UFO_RELEASE_START = 5;
const ROYAL_YAMB_CREST_SECONDS = 3.2;
const WEDDING_BEAT = 60 / 144;
const WEDDING_PICKUP = 0.045;
// Transparent gaps between the eight shoes below row 330 of the 800 x 410 cast sprite.
const WEDDING_SHOES = [0, 66, 174, 245, 350, 450, 574, 658, 800];
const THUNDER_STRIKE_SECONDS = 1.35;
const THUNDER_GROW_SECONDS = 0.13;
const THUNDER_COLORS = Object.freeze({ blue: '136, 195, 255', violet: '170, 151, 255', white: '244, 250, 255' });
const FIREWORK_COLORS = Object.freeze(['255, 198, 83', '255, 91, 111', '82, 224, 245', '129, 239, 158', '244, 249, 255']);
const FIREWORK_CRACKLES = Object.freeze([0.32, 0.57, 0.84]);
const FIREWORK_PIVOTS = Object.freeze([[0.502, 0.51], [0.52, 0.49], [0.5, 0.245], [0.49, 0.4]]);
const FIREWORK_SHOW = Object.freeze([
    { launch: 0, rise: 0.72, kind: 'sphere', x: 0.28, y: 0.29, color: 1 },
    { launch: 0.52, rise: 0.7, kind: 'ring', x: 0.72, y: 0.28, color: 2 },
    { launch: 1.08, rise: 0.76, kind: 'willow', x: 0.49, y: 0.22, color: 0 },
    { launch: 1.83, rise: 0.68, kind: 'sphere', x: 0.23, y: 0.37, color: 3 },
    { launch: 2.36, rise: 0.72, kind: 'ring', x: 0.76, y: 0.35, color: 1 },
    { launch: 2.86, rise: 0.7, kind: 'sphere', x: 0.54, y: 0.29, color: 2 },
    { launch: 3.48, rise: 0.69, kind: 'sphere', x: 0.26, y: 0.48, color: 1, finale: true },
    { launch: 3.55, rise: 0.69, kind: 'ring', x: 0.74, y: 0.40, color: 2, finale: true },
    { launch: 3.81, rise: 0.74, kind: 'willow', x: 0.5, y: 0.25, color: 0, finale: true }
]);
const DRAGON_JAW = Object.freeze({ upper: 0.55, throat: 0.65, lower: 0.78 });
const NEON_PULSE_COLORS = Object.freeze({ cyan: '0, 244, 255', pink: '255, 40, 188', white: '245, 255, 255' });
const DRONE_FORMATION = Object.freeze([
    { column: -1, row: 0, side: -1, entry: 0.19 },
    { column: 0, row: 0, side: 0, entry: 0.06 },
    { column: 1, row: 0, side: 1, entry: 0.29 },
    { column: -0.5, row: 1, side: -1, entry: 0.42 },
    { column: 0.5, row: 1, side: 1, entry: 0.53 }
]);
const DRONE_LIGHT_ANCHORS = Object.freeze({
    dark: [0.4969, 0.8409], light: [0.4995, 0.7839], medium: [0.4984, 0.8219],
    winter: [0.4999, 0.8795], neon: [0.5003, 0.7928], amethyst: [0.498, 0.7906],
    easter: [0.4997, 0.7838], desert: [0.4994, 0.881], moon: [0.4997, 0.7596],
    severna: [0.499, 0.8685]
});
// Junctions are numbered left-to-right across three rows. Shared junctions need only one drone.
const DRONE_DIGITS = Object.freeze({
    1: [[3, 1, 7], [6, 7, 8]],
    2: [[0, 2, 5, 3, 6, 8]],
    3: [[0, 2, 5, 8, 6], [4, 5]],
    4: [[0, 3, 5], [2, 5, 8]],
    5: [[2, 0, 3, 5, 8, 6]],
    6: [[2, 0, 3, 6, 8, 5, 3]]
});

class LiveEffectsStage {
    static imageCache = new Map();

    static sources(type, theme) {
        const root = 'assets/effects/stage-v1/';
        const png = name => root + name + '.png?v=1';
        if (type === 'ice_age') return { frost: png('frost-corner') };
        if (type === 'fireworks') return { blooms: 'assets/effects/fireworks-blooms-v1/blooms.png' };
        if (type === 'balkan') {
            const pack = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
            return { trumpet: pack + '/canonical/treasury-effect-previews/preview-wedding-v1.png',
                dancers: 'assets/effects/wedding-kolo-v1/dancers.webp' };
        }
        if (type === 'thunder') return { cloud: 'assets/effects/thunder-storm-v1/storm-cloud-v1.png' };
        if (type === 'cosmic_dust') return { flecks: 'assets/effects/cosmic-dust-v1/near-field.png' };
        if (type === 'dragon_fire') return {
            head: 'assets/effects/dragon-projection-v2/visage.webp',
            plume: 'assets/effects/dragon-projection-v2/plume.webp', flame: png('flame')
        };
        if (type === 'drones') return { drone: `assets/effects/drones-v1/${theme}-drone-v1.png` };
        if (type === 'ufo_abduction') return { ship: png(`ufo-${theme}`) };
        if (type === 'royal_yamb') {
            const ducatRoot = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
            const version = ['easter', 'desert', 'severna'].includes(theme) ? 2 : 1;
            return {
                seal: 'Logo_green.png', logo: `assets/effects/royal-stage-v2/${theme}.webp`,
                spotlight: 'assets/effects/royal-stage-v2/spotlight.png',
                coin: `${ducatRoot}/canonical/ducat/ducat-front-v${version}.png`,
                coinLeft: `${ducatRoot}/canonical/ducat/ducat-angle-left-v${version}.png`,
                coinRight: `${ducatRoot}/canonical/ducat/ducat-angle-right-v${version}.png`
            };
        }
        return {};
    }

    static loadImage(source) {
        if (this.imageCache.has(source)) return this.imageCache.get(source);
        const promise = new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = async () => {
                try { await image.decode?.(); } catch (_) {}
                resolve(image);
            };
            image.onerror = () => { this.imageCache.delete(source); resolve(null); };
            image.src = source;
        });
        this.imageCache.set(source, promise);
        // Retain shared components, but only the selected theme's ship/logo/coin.
        for (const key of this.imageCache.keys()) {
            if (this.imageCache.size <= 9) break; // Six royal components plus the three retained stage textures.
            if (key !== source && !/stage-v1\/(?:trumpet|flame|frost-corner)\.png/.test(key)) this.imageCache.delete(key);
        }
        return promise;
    }

    static async preload(type, theme) {
        const entries = await Promise.all(Object.entries(this.sources(type, theme))
            .map(async ([role, source]) => [role, await this.loadImage(source)]));
        return Object.fromEntries(entries);
    }

    constructor(owner, type, yambFace) {
        this.owner = owner;
        this.type = type;
        this.droneFace = type === 'drones' && Number.isInteger(yambFace) && DRONE_DIGITS[yambFace] ? yambFace : null;
        this.theme = owner.getGoldRainThemeId();
        this.palette = SUPERNOVA_THEME_PROFILES[this.theme];
        this.reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        this.mobile = window.innerWidth <= 760 || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
        this.duration = this.reduced ? Math.min(2600, LIVE_STAGE_EFFECT_DURATIONS[type]) : LIVE_STAGE_EFFECT_DURATIONS[type];
        this.stopped = false;
        this.events = new Set();
        this.mutedNodes = new Set();
        this.seed = value => { const n = Math.sin(value * 127.1 + 19.73) * 43758.5453; return n - Math.floor(n); };
        this.clamp = value => Math.max(0, Math.min(1, value));
        this.ease = value => { const t = this.clamp(value); return t * t * (3 - 2 * t); };
        this.rgba = (rgb, alpha) => `rgba(${rgb},${this.clamp(alpha)})`;
        this.resize = this.resize.bind(this);
        this.frame = this.frame.bind(this);
    }

    async start() {
        // The scoring turn may already have advanced when the ship PNG finishes loading.
        const player = window.app?.currentPlayerIdx;
        const ufoTable = this.type === 'ufo_abduction' && ((Number.isInteger(player) && document.getElementById('ptable-' + player))
            || this.owner.getTargetTable?.() || document.querySelector('.player-table'));
        this.images = await LiveEffectsStage.preload(this.type, this.theme);
        if (this.stopped || document.hidden || this.theme !== this.owner.getGoldRainThemeId()) return this.stop();
        const needed = Object.keys(LiveEffectsStage.sources(this.type, this.theme));
        if (needed.some(role => !this.images[role] && !(this.type === 'cosmic_dust' && role === 'flecks'))) {
            console.warn(`Effect component unavailable: ${this.type}/${this.theme}`);
            return this.stop();
        }
        this.table = this.type === 'ufo_abduction' ? ufoTable : this.owner.getTargetTable?.() || document.querySelector('.player-table');
        this.overlay = document.createElement('div');
        this.overlay.className = 'live-stage-effect';
        this.overlay.dataset.effect = this.type;
        this.overlay.dataset.theme = this.theme;
        this.overlay.setAttribute('aria-hidden', 'true');
        this.canvas = document.createElement('canvas');
        this.overlay.appendChild(this.canvas);
        document.body.appendChild(this.overlay);
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        if (!this.ctx) return this.stop();
        this.resize();
        if (this.type === 'cosmic_dust') this.dustParticles = this.prepareDust();
        if (this.type === 'ufo_abduction' && !this.reduced) this.scores = [...(this.table?.querySelectorAll?.('.score-btn.filled, .qa-board-grid span:not(:nth-child(7n + 1))') || [])]
            .filter(node => /^\d+$/.test(node.textContent.trim())).slice(0, this.mobile ? 24 : 40)
            .map(node => ({ node, text: node.textContent.trim(), rect: node.getBoundingClientRect() }));
        window.addEventListener('resize', this.resize, { passive: true });
        this.visibility = () => { if (document.hidden) this.stop(); };
        document.addEventListener('visibilitychange', this.visibility);
        if (typeof MutationObserver !== 'undefined') {
            this.themeObserver = new MutationObserver(() => {
                if (this.theme !== this.owner.getGoldRainThemeId()) this.stop();
            });
            this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
        }
        if (!this.reduced && this.type === 'drones') window.app?.soundMgr?.epicDroneShow?.();
        this.timer = setTimeout(() => this.stop(), this.duration + 1000);
        this.raf = requestAnimationFrame(this.frame);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        const rect = this.table?.getBoundingClientRect?.();
        const fallbackWidth = Math.min(360, this.width * 0.8);
        const fallbackHeight = Math.min(560, this.height * 0.65);
        const valid = rect && rect.width > 0 && rect.height > 0;
        this.board = {
            x: valid ? rect.left : (this.width - fallbackWidth) / 2,
            y: valid ? rect.top : (this.height - fallbackHeight) / 2,
            width: valid ? rect.width : fallbackWidth,
            height: valid ? rect.height : fallbackHeight
        };
        this.board.right = this.board.x + this.board.width;
        this.board.bottom = this.board.y + this.board.height;
        this.scores?.forEach(score => { score.rect = score.node.getBoundingClientRect(); });
        const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.15 : 1.5);
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (this.type === 'ice_age') this.prepareIceFrost();
        if (this.type === 'balkan') this.prepareWedding();
        if (this.type === 'neon_pulse') this.prepareNeonFrame();
        if (this.type === 'drones') this.prepareDroneFormation();
        if (this.type === 'royal_yamb') this.prepareRoyalScene();
        if (this.type === 'dragon_fire') this.prepareDragonBreath();
        if (this.type === 'fireworks') this.prepareFireworks();
        if (this.type === 'thunder') this.prepareThunder();
        this.overlay.dataset.board = `${this.board.width}x${this.board.height}`;
    }

    stop() {
        this.stopped = true;
        cancelAnimationFrame(this.raf);
        clearTimeout(this.timer);
        this.themeObserver?.disconnect();
        window.removeEventListener('resize', this.resize);
        if (this.visibility) document.removeEventListener('visibilitychange', this.visibility);
        this.mutedNodes.forEach(node => node.classList.remove('live-ufo-score-muted'));
        this.mutedNodes.clear();
        this.overlay?.remove();
        this.ufoAudioCleanup?.();
        this.ufoAudioCleanup = null;
        this.iceAudioCleanup?.();
        this.iceAudioCleanup = null;
        this.iceCrackCleanup?.();
        this.iceCrackCleanup = null;
        this.royalAudioCleanup?.();
        this.royalAudioCleanup = null;
        this.dragonAudioCleanup?.();
        this.dragonAudioCleanup = null;
        this.fireworkAudioCleanups?.forEach(cleanup => cleanup());
        this.fireworkAudioCleanups?.clear();
        this.thunderAudioCleanup?.();
        this.thunderAudioCleanup = null;
        if (this.weddingMusic) {
            this.weddingMusic = false;
            window.app?.soundMgr?.stopBalkanMusic?.(true);
        }
        if (this.owner.stageScene === this) this.owner.stageScene = null;
    }

    once(key, callback) {
        if (!this.events.has(key)) { this.events.add(key); callback(); }
    }

    frame(now) {
        if (this.stopped) return;
        if (this.theme !== this.owner.getGoldRainThemeId() || !this.overlay.isConnected) return this.stop();
        if (this.startedAt === undefined) this.startedAt = now;
        if (this.mobile && this.lastFrame !== undefined && now - this.lastFrame < 30) {
            this.raf = requestAnimationFrame(this.frame); return;
        }
        this.lastFrame = now;
        const elapsed = now - this.startedAt;
        const p = this.clamp(elapsed / this.duration);
        const seconds = elapsed / 1000;
        this.alpha = this.ease(p / 0.075) * this.ease((1 - p) / 0.14);
        this.overlay.dataset.phase = p < 0.2 ? 'entry' : p < 0.78 ? 'active' : 'exit';
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
        const render = { ice_age: 'ice', neon_pulse: 'neon', thunder: 'thunder', balkan: 'wedding',
            fireworks: 'fireworks', drones: 'drones', cosmic_dust: 'dust', ufo_abduction: 'ufo',
            dragon_fire: 'fire', royal_yamb: 'royal' }[this.type];
        this[render](this.reduced ? this.type === 'thunder' ? 0.75 : 1.3 : seconds, p);
        if (elapsed < this.duration) this.raf = requestAnimationFrame(this.frame);
        else this.stop();
    }

    shade(amount = 0.18) {
        this.ctx.fillStyle = this.rgba(this.palette.shade, amount * this.alpha);
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    glow(x, y, radius, color, alpha = 1) {
        if (radius <= 0 || alpha <= 0) return;
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, this.rgba(color, alpha * this.alpha));
        gradient.addColorStop(0.24, this.rgba(color, alpha * 0.38 * this.alpha));
        gradient.addColorStop(1, this.rgba(color, 0));
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    dot(x, y, radius, color, alpha) {
        this.ctx.fillStyle = this.rgba(color, alpha * this.alpha);
        this.ctx.beginPath(); this.ctx.arc(x, y, Math.max(0.2, radius), 0, Math.PI * 2); this.ctx.fill();
    }

    line(points, color, alpha = 1, width = 1) {
        this.ctx.strokeStyle = this.rgba(color, alpha * this.alpha);
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        points.forEach(([x, y], i) => i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y));
        this.ctx.stroke();
    }

    sprite(image, x, y, width, rotation = 0, alpha = 1, flip = 1, height) {
        if (!image) return;
        const h = height || width * (image.naturalHeight || image.height) / (image.naturalWidth || image.width);
        this.ctx.save(); this.ctx.translate(x, y); this.ctx.rotate(rotation);
        this.ctx.scale(flip, 1); this.ctx.globalAlpha = this.alpha * alpha;
        this.ctx.drawImage(image, -width / 2, -h / 2, width, h); this.ctx.restore();
    }

    prepareIceFrost() {
        const b = this.board;
        this.iceCorners = [[0, 0, 1, 1], [b.width, 0, -1, 1],
            [0, b.height, 1, -1], [b.width, b.height, -1, -1]];
        this.iceTexture ||= document.createElement('canvas');
        this.iceReveal ||= document.createElement('canvas');
        const scale = Math.min(1, 720 / Math.max(b.width, b.height));
        for (const layer of [this.iceTexture, this.iceReveal]) {
            layer.width = Math.ceil(b.width * scale);
            layer.height = Math.ceil(b.height * scale);
            layer.getContext('2d').setTransform(layer.width / b.width, 0, 0, layer.height / b.height, 0, 0);
        }
        const texture = this.iceTexture.getContext('2d');
        texture.globalAlpha = 0.88;
        for (const [x, y, sx, sy] of this.iceCorners) {
            texture.save(); texture.translate(x, y); texture.scale(sx, sy);
            texture.drawImage(this.images.frost, 0, 0, b.width * 0.86, b.height * 0.86);
            texture.restore();
        }
        const light = texture.createLinearGradient(0, 0, b.width, b.height * 0.52);
        for (const [at, opacity] of [[0, 0.21], [0.28, 0.025], [0.31, 0.12], [0.44, 0.02], [0.78, 0.08], [1, 0.19]]) {
            light.addColorStop(at, this.rgba('186, 236, 255', opacity));
        }
        texture.fillStyle = light; texture.fillRect(0, 0, b.width, b.height);

        const cornerRadius = (node, w, h) => {
            const value = node && window.getComputedStyle?.(node).borderTopLeftRadius;
            return Math.min(w / 2, h / 2, (parseFloat(value) || 0) * (value?.endsWith('%') ? Math.min(w, h) / 100 : 1));
        };
        this.iceBoardRadius = cornerRadius(this.table, b.width, b.height);
        this.iceControls = [];
        const nodes = document.querySelectorAll('#dice-container > .dice, .action-btn-group > #btn-najava, .action-btn-group > #btn-bacaj');
        for (const node of nodes) {
            const rect = node.getBoundingClientRect();
            if (!rect.width || !rect.height) continue;
            const style = getComputedStyle(node);
            if (style.visibility === 'hidden') continue;
            this.iceControls.push({ node, r: cornerRadius(node, rect.width, rect.height),
                delay: Math.min(0.54, 0.27 + this.iceControls.length * 0.037) });
        }
        // Normalized, connected fractures: the larger faults travel first, then thin side fissures.
        this.iceFaults = [];
        const fault = (start, delta, count, seed, delay, weight) => {
            const points = [start];
            for (let i = 1; i <= count; i++) {
                const k = i / count, j = (this.seed(seed + i) - 0.5) * Math.sin(k * Math.PI) * 0.12;
                points.push([start[0] + k * delta[0] - j * delta[1], start[1] + k * delta[1] + j * delta[0]]);
            }
            this.iceFaults.push({ points, delay, weight });
            return points;
        };
        [[-0.42,-0.30], [0.39,-0.14], [0.16,0.39], [-0.24,0.17]].forEach(([x, y], i) => {
            const stem = fault([0.50, 0.50], [x, y], 10, 71 * i, 0.018 * i, 1.35);
            fault(stem[5], [x * 0.34 - y * 0.30, y * 0.34 + x * 0.30], 5, 21 * i + 7, 0.13 + 0.018 * i, 0.75);
        });
    }

    iceControlFrost(progress) {
        const c = this.ctx;
        for (const { node, delay, r } of this.iceControls) {
            const amount = this.ease((progress - delay) / (1 - delay));
            if (!amount || !node.isConnected) continue;
            const { left: x, top: y, width: w, height: h } = node.getBoundingClientRect();
            if (w < 2 || h < 2 || x >= this.width || y >= this.height || x + w <= 0 || y + h <= 0) continue;
            c.save(); c.translate(x, y);
            c.beginPath(); c.roundRect(0, 0, w, h, Math.min(r, w / 2, h / 2)); c.clip();
            if (amount < 1) {
                const front = (w + h * 0.54) * amount;
                c.beginPath(); c.moveTo(0, 0); c.lineTo(front, 0);
                c.lineTo(front - h * 0.54, h); c.lineTo(-h, h); c.closePath(); c.clip();
            }
            c.globalAlpha = this.alpha;
            c.fillStyle = 'rgba(118,198,227,0.23)'; c.fillRect(0, 0, w, h);
            const edge = Math.min(w, h) * 0.95;
            c.globalAlpha = this.alpha * 0.82;
            c.drawImage(this.images.frost, 0, 0, edge, edge);
            c.translate(w, h); c.rotate(Math.PI); c.drawImage(this.images.frost, 0, 0, edge * 0.74, edge * 0.74);
            c.beginPath(); c.roundRect(0, 0, w, h, Math.min(r, w / 2, h / 2));
            c.strokeStyle = 'rgba(222,250,255,0.9)'; c.lineWidth = 2.5; c.stroke(); c.restore();
        }
    }

    ice(t, p) {
        const c = this.ctx, b = this.board;
        const progress = this.reduced ? this.ease(p / 0.4) : this.ease(t / ICE_AGE_GROWTH_SECONDS);
        this.overlay.dataset.corners = '4';
        this.overlay.dataset.coverage = progress.toFixed(3);
        if (!this.reduced) {
            this.once('ice-grow', () => {
                this.iceAudioCleanup = window.app?.soundMgr?.iceAge?.(ICE_AGE_GROWTH_SECONDS);
            });
            if (t >= ICE_AGE_GROWTH_SECONDS) this.once('ice-lock', () => {
                if (t - ICE_AGE_GROWTH_SECONDS < 0.5) this.iceCrackCleanup = window.app?.soundMgr?.iceAgeCrack?.();
            });
        }
        if (progress <= 0) return;
        const front = Math.hypot(b.width, b.height) * 0.5 * progress;
        const radius = front + Math.min(front * 0.75, 32);
        c.fillStyle = this.rgba('6, 24, 38', this.alpha * 0.13);
        c.fillRect(0, 0, this.width, this.height);
        c.save(); c.beginPath();
        if (this.iceBoardRadius) c.roundRect(b.x, b.y, b.width, b.height, this.iceBoardRadius);
        else c.rect(b.x, b.y, b.width, b.height);
        c.clip();
        for (const [x, y] of this.iceCorners) {
            const ice = c.createRadialGradient(b.x + x, b.y + y, 0, b.x + x, b.y + y, radius);
            ice.addColorStop(0, this.rgba('210, 236, 247', 0.48 * this.alpha));
            ice.addColorStop(0.72 * front / radius, this.rgba('186, 219, 239', 0.26 * this.alpha));
            ice.addColorStop(front / radius, this.rgba('230, 247, 251', 0.15 * this.alpha));
            ice.addColorStop(1, 'rgba(210,240,255,0)');
            c.fillStyle = ice; c.fillRect(b.x, b.y, b.width, b.height);
        }

        // Reveal the cached, full-size crystals without stretching them as they grow.
        let frost = this.iceTexture;
        if (progress < 1) {
            const mask = this.iceReveal.getContext('2d');
            mask.globalCompositeOperation = 'source-over';
            mask.clearRect(0, 0, b.width, b.height);
            for (const [x, y] of this.iceCorners) {
                const edge = mask.createRadialGradient(x, y, 0, x, y, radius);
                edge.addColorStop(front / radius, '#fff');
                edge.addColorStop(1, 'rgba(255,255,255,0)');
                mask.fillStyle = edge;
                mask.fillRect(0, 0, b.width, b.height);
            }
            mask.globalCompositeOperation = 'source-in';
            mask.drawImage(this.iceTexture, 0, 0, b.width, b.height);
            frost = this.iceReveal;
        }
        c.save(); c.globalAlpha = this.alpha;
        c.drawImage(frost, b.x, b.y, b.width, b.height);
        c.restore();

        for (let i = 0; i < 32 && !this.reduced && progress < 1; i++) {
            const x = b.x + this.seed(i + 4) * b.width, y = b.y + this.seed(i + 90) * b.height;
            const cornerDistance = Math.min(Math.hypot(x - b.x, y - b.y), Math.hypot(x - b.right, y - b.y),
                Math.hypot(x - b.x, y - b.bottom), Math.hypot(x - b.right, y - b.bottom));
            const glint = Math.max(0, 1 - Math.abs(cornerDistance - front) / 24);
            this.dot(x, y, 0.8, '243, 252, 255', glint * 0.7 * this.ease((1 - progress) / 0.08));
        }
        if (!this.reduced && t >= ICE_AGE_GROWTH_SECONDS) {
            const age = t - ICE_AGE_GROWTH_SECONDS;
            for (const { points, delay, weight } of this.iceFaults) {
                const last = this.clamp((age - delay) / 0.22) * (points.length - 1);
                if (last <= 0) continue;
                const whole = Math.floor(last), fraction = last - whole;
                c.save(); c.translate(b.x, b.y); c.globalAlpha = this.alpha * (0.64 + 0.36 * Math.exp(-age * 2));
                c.beginPath(); c.moveTo(points[0][0] * b.width, points[0][1] * b.height);
                for (let i = 1; i <= whole; i++) c.lineTo(points[i][0] * b.width, points[i][1] * b.height);
                if (fraction) {
                    const a = points[whole], z = points[whole + 1];
                    c.lineTo((a[0] + (z[0] - a[0]) * fraction) * b.width, (a[1] + (z[1] - a[1]) * fraction) * b.height);
                }
                c.strokeStyle = 'rgba(32,83,111,0.74)'; c.lineWidth = weight + 1.3; c.stroke();
                c.strokeStyle = 'rgba(226,251,255,0.94)'; c.lineWidth = weight; c.stroke(); c.restore();
            }
            const lockGlow = 1 - this.ease(age / 0.42);
            this.glow(b.x + b.width / 2, b.y + b.height / 2, Math.min(b.width, b.height) * 0.27,
                '229, 250, 255', lockGlow * 0.32);
        }
        c.restore();
        this.iceControlFrost(progress);
    }

    prepareNeonFrame() {
        const b = this.board;
        const x = Math.max(8, b.x), y = Math.max(8, b.y);
        const right = Math.min(this.width - 8, b.right), bottom = Math.min(this.height - 8, b.bottom);
        const width = right - x, height = bottom - y;
        if (width < 24 || height < 24) {
            this.neonFrame = null;
            return;
        }

        const { cyan, pink, white } = NEON_PULSE_COLORS;
        const radius = Math.min(22, width * 0.09, height * 0.09);
        const perimeter = 2 * (width + height - 4 * radius) + 2 * Math.PI * radius;
        const pad = 18, backingWidth = width + pad * 2, backingHeight = height + pad * 2;
        const density = Math.min(this.canvas.width / this.width, 1280 / Math.max(backingWidth, backingHeight));
        const texture = (w, h) => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(w * density); canvas.height = Math.ceil(h * density);
            const ctx = canvas.getContext('2d');
            ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
            return { canvas, ctx };
        };
        // Bake the glass, its shadow and diffuse light only on start/resize.
        const tube = texture(backingWidth, backingHeight), g = tube.ctx;
        const rail = g.createLinearGradient(pad, pad, pad + width, pad + height);
        rail.addColorStop(0, this.rgba(cyan, 1));
        rail.addColorStop(0.37, this.rgba(cyan, 1));
        rail.addColorStop(0.63, this.rgba(pink, 1));
        rail.addColorStop(1, this.rgba(pink, 1));
        g.beginPath(); g.roundRect(pad, pad, width, height, radius);
        g.strokeStyle = '#120f27'; g.lineWidth = 7; g.globalAlpha = .83; g.stroke();
        g.strokeStyle = rail;
        for (let weight = 30; weight >= 4; weight -= 2) {
            g.lineWidth = weight; g.globalAlpha = .13 * Math.exp(-weight / 13); g.stroke();
        }
        g.globalAlpha = .93; g.lineWidth = 3.8; g.stroke();
        g.globalAlpha = .78; g.strokeStyle = this.rgba(white, 1); g.lineWidth = 1; g.stroke();

        let beam = null;
        const tail = Math.min(37, Math.max(15, height * .07));
        if (!this.reduced) {
            const strip = texture(backingWidth, tail + pad), s = strip.ctx;
            const spectrum = s.createLinearGradient(pad, 0, pad + width, 0);
            spectrum.addColorStop(0, this.rgba(cyan, 1));
            spectrum.addColorStop(.36, this.rgba(cyan, 1));
            spectrum.addColorStop(.64, this.rgba(pink, 1));
            spectrum.addColorStop(1, this.rgba(pink, 1));
            // One continuous reflection, with a short dark lip for pale boards.
            s.fillStyle = spectrum;
            for (let dy = 0; dy < tail; dy++) {
                s.globalAlpha = .28 * Math.exp(-dy / (tail * .32));
                s.fillRect(pad, tail - dy - 1, width, 1);
            }
            s.globalAlpha = .34; s.fillStyle = '#211a40'; s.fillRect(pad, tail + 1, width, 1.5);
            s.globalAlpha = .92; s.fillStyle = spectrum; s.fillRect(pad, tail - 1.5, width, 3);
            s.globalAlpha = .72; s.fillStyle = this.rgba(white, 1); s.fillRect(pad, tail - .5, width, 1);
            s.globalAlpha = 1;
            for (const [cx, color] of [[pad, cyan], [pad + width, pink]]) {
                const light = s.createRadialGradient(cx, tail, 0, cx, tail, 14);
                light.addColorStop(0, this.rgba(white, 1));
                light.addColorStop(.17, this.rgba(color, .98));
                light.addColorStop(.43, this.rgba(color, .48));
                light.addColorStop(1, this.rgba(color, 0));
                s.fillStyle = light; s.fillRect(cx - 14, tail - 14, 28, 28);
            }
            beam = strip.canvas;
        }
        this.neonFrame = { x, y, width, height, radius, perimeter, pad, tail, tube: tube.canvas, beam };
    }

    neon(t) {
        if (!this.neonFrame) return;
        const c = this.ctx;
        const { x, y, width, height, radius, perimeter, pad, tail, tube, beam } = this.neonFrame;
        const { cyan, pink, white } = NEON_PULSE_COLORS;
        const stroke = (color, weight, alpha) => {
            c.strokeStyle = color;
            c.lineWidth = weight;
            c.globalAlpha = alpha * this.alpha;
            c.stroke();
        };
        c.save();
        c.globalAlpha = this.alpha;
        c.drawImage(tube, x - pad, y - pad, width + 2 * pad, height + 2 * pad);
        if (!beam) { c.restore(); return; }
        c.lineCap = 'round';
        c.beginPath(); c.roundRect(x, y, width, height, radius);
        const length = Math.min(145, perimeter * .105);
        const lead = perimeter * (.08 + t * .27);
        [cyan, pink].forEach((color, i) => {
            const head = lead + perimeter * .5 * i;
            const trail = size => {
                c.setLineDash([size, perimeter - size]);
                c.lineDashOffset = size - head;
            };
            trail(length); stroke(this.rgba(color, 1), 7, .34);
            trail(length * .58); stroke(this.rgba(color, 1), 5.2, .88);
            trail(length * .24); stroke(this.rgba(white, 1), 2.1, .96);
            trail(2); stroke(this.rgba(white, 1), 4, .99);
        });
        c.restore();

        const secondPass = t >= 2.52;
        const progress = (t - (secondPass ? 2.52 : 0.56)) / 1.68;
        if (progress <= 0 || progress >= 1) return;
        const beamY = y + radius + (height - 2 * radius) * (secondPass ? 1 - progress : progress);
        const strength = Math.sin(Math.PI * progress) * this.alpha;
        c.save();
        c.beginPath(); c.roundRect(x - 10, y - 10, width + 20, height + 20, radius + 10); c.clip();
        c.translate(x, beamY); c.scale(1, secondPass ? -1 : 1);
        c.globalAlpha = strength;
        c.drawImage(beam, -pad, -tail, width + 2 * pad, tail + pad);
        c.restore();
    }

    prepareThunder() {
        const w = this.width, h = this.height, b = this.board;
        this.thunderImpact = [b.x + b.width * 0.57, Math.min(h - 40, b.y + b.height * 0.62)];
        const end = this.thunderImpact, span = Math.min(w * 0.73, h * 0.46);
        const start = [Math.max(18, end[0] - span * 0.54), h * 0.085];
        // Large directional changes give the channel its silhouette. Add finer
        // displacements perpendicular to each segment without moving its endpoints.
        const jag = (anchors, levels, key) => {
            let points = anchors;
            for (let level = 0; level < levels; level++) {
                const split = [points[0]];
                for (let i = 1; i < points.length; i++) {
                    const [ax, ay] = points[i - 1], [bx, by] = points[i];
                    const bend = (this.seed(key + i * 17 + level * 97) - 0.5) * 0.52;
                    split.push([Math.max(5, Math.min(w - 5, (ax + bx) / 2 - (by - ay) * bend)),
                        Math.max(2, Math.min(h - 2, (ay + by) / 2 + (bx - ax) * bend))], points[i]);
                }
                points = split;
            }
            return points;
        };
        const trunk = jag([[0, 0], [0.16, 0.43], [0.27, 0.22], [0.41, 0.70], [0.53, 0.47],
            [0.61, 0.38], [0.75, 0.84], [0.81, 0.64], [1, 1]].map(([y, x]) =>
            [start[0] + (end[0] - start[0]) * x, start[1] + (end[1] - start[1]) * y]), 3, 81);
        this.thunderTrunk = trunk;
        this.thunderBranches = [];
        for (const [branch, [index, reach, drop]] of [[7, -0.27, 0.4], [15, 0.61, 0.55],
            [24, -0.45, 0.59], [31, 0.28, 0.23], [46, 0.42, 0.46], [53, -0.26, 0.31]].entries()) {
            const origin = trunk[index];
            const offset = (p, x, y) => [Math.max(9, Math.min(w - 9, p[0] + x * span)),
                Math.max(5, Math.min(h - 5, p[1] + y * span))];
            const points = jag([origin, offset(origin, reach * 0.48, drop * 0.21),
                offset(origin, reach * 0.55, drop * 0.57), offset(origin, reach, drop)], 3, branch * 127);
            this.thunderBranches.push(points);
            const fork = points[8 + branch];
            this.thunderBranches.push(jag([fork, offset(fork, reach * 0.31, drop * 0.09),
                offset(fork, reach * 0.53, drop * 0.21)], 2, 200 + branch));
        }
        // Rasterize all glowing branches once; frames reveal and fade this cached layer.
        this.thunderBolt ||= document.createElement('canvas');
        const scale = Math.min(1, 1280 / w, 1280 / h);
        this.thunderBolt.width = Math.ceil(w * scale); this.thunderBolt.height = Math.ceil(h * scale);
        const c = this.thunderBolt.getContext('2d');
        c.setTransform(scale, 0, 0, scale, 0, 0);
        c.lineCap = 'round'; c.lineJoin = 'round';
        const ribbon = (points, width, color, alpha, tip) => {
            const sides = points.map(([x, y], i) => {
                const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
                const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy) || 1;
                const r = width * (1 - (1 - tip) * i / (points.length - 1)) * (0.87 + 0.24 * this.seed(i + 31)) / length;
                return [[x - dy * r, y + dx * r], [x + dy * r, y - dx * r]];
            });
            c.fillStyle = this.rgba(color, alpha);
            c.beginPath(); c.moveTo(...sides[0][0]);
            sides.forEach(pair => c.lineTo(...pair[0]));
            for (let i = sides.length - 1; i >= 0; i--) c.lineTo(...sides[i][1]);
            c.closePath(); c.fill();
        };
        const core = Math.min(3.8, Math.max(2.2, span * 0.011));
        this.thunderBranches.forEach((path, i) => {
            const weight = i % 2 ? 0.32 : 0.8;
            c.shadowColor = this.rgba(THUNDER_COLORS.blue, 0.95); c.shadowBlur = 9;
            ribbon(path, core * weight, THUNDER_COLORS.blue, 0.74, 0.04);
            c.shadowBlur = 0; ribbon(path, core * weight * 0.56, THUNDER_COLORS.white, 0.97, 0.02);
        });
        c.shadowColor = this.rgba(THUNDER_COLORS.violet, 0.9); c.shadowBlur = 22;
        c.filter = 'blur(6px)';
        ribbon(trunk, core * 2.6, THUNDER_COLORS.blue, 0.48, 0.6);
        c.shadowColor = this.rgba(THUNDER_COLORS.blue, 1); c.shadowBlur = 9;
        c.filter = 'blur(1.8px)';
        ribbon(trunk, core * 1.4, THUNDER_COLORS.blue, 0.95, 0.55);
        c.filter = 'none'; c.shadowBlur = 0;
        ribbon(trunk, core * 0.79, '255, 255, 255', 1, 0.5);
        if (!this.thunderGlow) {
            this.thunderGlow = document.createElement('canvas');
            this.thunderGlow.width = this.thunderGlow.height = 96;
            const g = this.thunderGlow.getContext('2d'), light = g.createRadialGradient(48, 48, 0, 48, 48, 48);
            light.addColorStop(0, 'rgba(248,252,255,1)');
            light.addColorStop(0.12, this.rgba(THUNDER_COLORS.blue, 0.9));
            light.addColorStop(0.4, this.rgba(THUNDER_COLORS.violet, 0.2));
            light.addColorStop(1, this.rgba(THUNDER_COLORS.blue, 0));
            g.fillStyle = light; g.fillRect(0, 0, 96, 96);
        }
        this.thunderCloudHeight = Math.min(200, h * 0.25, w * 0.42);
        this.thunderClouds = [
            { x: w * 0.13, y: h * 0.035, size: 0.96, speed: 1.8, opacity: 0.64 },
            { x: w * 0.85, y: h * 0.045, size: 1.06, speed: -2.1, opacity: 0.67 },
            { x: w * 0.49, y: h * 0.075, size: 1, speed: 1.2, opacity: 0.88 }
        ];
        this.overlay.dataset.thunderBranches = String(this.thunderBranches.length);
    }

    thunder(t) {
        const c = this.ctx, calm = this.reduced;
        const age = calm ? 0.34 : t - THUNDER_STRIKE_SECONDS;
        const impactAge = age - THUNDER_GROW_SECONDS;
        const strength = calm ? 0.32 : age < 0 ? 0 : age < THUNDER_GROW_SECONDS
            ? 0.2 + 0.8 * this.ease(age / THUNDER_GROW_SECONDS) : Math.exp(-impactAge * 3.3);
        const charged = calm ? 0 : this.ease(t / THUNDER_STRIKE_SECONDS) * 0.57 * Math.exp(-Math.max(age, 0) * 3);
        const flash = calm ? 0 : impactAge < 0 ? this.ease(age / THUNDER_GROW_SECONDS) : Math.exp(-impactAge * 7);
        this.overlay.dataset.thunderPhase = calm ? 'holding' : t < THUNDER_STRIKE_SECONDS ? 'gathering'
            : impactAge < 0.65 ? 'strike' : t < 3.5 ? 'afterglow' : 'clearing';
        c.fillStyle = this.rgba('4, 8, 18', this.alpha * (calm ? 0.3 : 0.24 + 0.43 * this.ease(t / 0.8) * Math.exp(-Math.max(impactAge, 0) * 0.9)));
        c.fillRect(0, 0, this.width, this.height);
        if (flash > 0.005) {
            c.fillStyle = this.rgba('207, 224, 255', this.alpha * flash * 0.36);
            c.fillRect(0, 0, this.width, this.height);
        }
        if (!calm) this.once('thunder-audio', () => {
            if (t < 0.15) this.thunderAudioCleanup = window.app?.soundMgr?.thunder?.(THUNDER_STRIKE_SECONDS + THUNDER_GROW_SECONDS);
        });
        if (strength > 0.003) {
            const reveal = calm ? 1 : this.ease(age / THUNDER_GROW_SECONDS);
            const bottom = this.thunderTrunk[0][1] + (this.thunderImpact[1] - this.thunderTrunk[0][1]) * reveal + 6;
            c.save(); c.beginPath(); c.rect(0, 0, this.width, bottom); c.clip();
            this.sprite(this.thunderBolt, this.width / 2, this.height / 2, this.width, 0, strength, 1, this.height);
            c.restore();
        }
        const cloudLight = Math.max(charged, flash);
        for (const cloud of this.thunderClouds) {
            const height = this.thunderCloudHeight * cloud.size;
            const x = cloud.x + (calm ? 0 : Math.sin(t * 0.45) * cloud.speed * 4);
            const y = cloud.y + (calm ? 0 : Math.sin(t * 0.36 + cloud.size) * 3);
            this.sprite(this.images.cloud, x, y, height * 3, 0, cloud.opacity, 1, height);
        }
        if (cloudLight > 0.01) {
            const [x, y] = this.thunderTrunk[0], size = this.thunderCloudHeight;
            c.save(); c.globalCompositeOperation = 'screen';
            this.sprite(this.thunderGlow, x, y, size * 2.3, 0, cloudLight * 0.78, 1, size * 0.9);
            c.restore();
        }
        if (!calm && impactAge >= 0 && impactAge < 1.6) {
            this.once('thunder-impact', () => { if (impactAge < 0.16) window.app?.vibrate?.([35, 40, 65]); });
            const [x, y] = this.thunderImpact;
            c.save(); c.globalCompositeOperation = 'screen';
            const spread = Math.min(510, this.board.width * 0.94) * (0.78 + 0.36 * this.ease(impactAge / 0.6));
            this.sprite(this.thunderGlow, x, y, spread, 0, 0.92 * Math.exp(-impactAge * 3.1), 1, spread * 0.28);
            this.sprite(this.thunderGlow, x, y, spread * 0.46, 0, flash);
            c.restore();
        }
    }

    prepareWedding() {
        const b = this.board, w = this.width, h = this.height;
        const width = Math.min(w * 0.94, Math.max(b.width * 1.12, w * 0.48), 660);
        const mid = Math.max(width / 2, Math.min(w - width / 2, b.x + b.width / 2));
        const floor = Math.min(h * 0.77, Math.max(h * 0.45, b.y + b.height * 0.78));
        const cast = Math.min(width * 0.70, h * 0.59);
        this.weddingSet = { width, mid, floor, cast, hem: Math.min(76, width * 0.17, h * 0.12) };
        if (this.weddingCloth) return;
        const cloth = this.weddingCloth = document.createElement('canvas');
        cloth.width = 640; cloth.height = 90;
        const c = cloth.getContext('2d'), { main, accent, shade } = this.palette;
        const ink = (color, alpha = 1) => this.rgba(color, alpha);
        c.fillStyle = ink(accent); c.fillRect(0, 0, 640, 79);
        c.fillStyle = ink(shade, 0.46); c.fillRect(0, 0, 640, 79);
        c.fillStyle = ink(main, 0.62);
        for (let x = 0; x < 640; x += 36) c.fillRect(x, 0, 18, 48);
        for (let y = 0; y < 48; y += 24) c.fillRect(0, y, 640, 12);
        const folds = c.createLinearGradient(0, 0, 640, 0);
        for (let i = 0; i <= 20; i++) folds.addColorStop(i / 20, i % 2 ? ink(shade, 0.24) : ink(accent, 0.08));
        c.fillStyle = folds; c.fillRect(0, 0, 640, 79);
        c.fillStyle = ink(shade, 0.9); c.fillRect(0, 48, 640, 25);
        for (let x = 0; x < 640; x += 4) {
            c.fillStyle = ink(accent, 0.14); c.fillRect(x, 0, 1, 78);
            c.fillStyle = ink(main, 0.8); c.fillRect(x, 78, 2, 7 + ((x / 4) % 3) * 2);
        }
        c.fillStyle = ink(accent, 0.86);
        for (const y of [1, 48, 72, 76]) c.fillRect(0, y, 640, 1.6);
        c.translate(0, 36);
        // A stepped lozenge woven from short stitches, not a stretched PNG border.
        for (let x = 0; x < 640; x += 32) {
            for (let row = -3; row <= 3; row++) {
                const n = 3 - Math.abs(row);
                c.fillStyle = ink(main); c.fillRect(x + 14 - n * 3, 23 + row * 3, n * 6 + 4, 3);
                c.fillStyle = ink(accent);
                if (n > 1) c.fillRect(x + 15 - (n - 2) * 3, 23 + row * 3, (n - 2) * 6 + 2, 3);
            }
            c.fillStyle = ink(accent); c.fillRect(x, 23, 3, 3);
        }
        this.weddingPetals = Array.from({ length: this.mobile ? 28 : 44 }, (_, i) => ({
            side: i % 2 ? 1 : -1, beat: (i % 3 === 0 ? 4 : i % 3 === 1 ? 10 : 16) + this.seed(i + 40) * 0.85,
            lift: 0.66 + this.seed(i + 7) * 0.52, speed: 0.11 + this.seed(i + 63) * 0.27, spin: this.seed(i + 31) * 8
        }));
    }

    wedding(t) {
        const c = this.ctx, { mid, floor, cast, width, hem } = this.weddingSet, calm = this.reduced;
        if (!calm) this.once('wedding-music', () => {
            this.weddingMusic = true;
            window.app?.soundMgr?.balkanTrumpet?.(WEDDING_BEAT, WEDDING_PICKUP);
        });
        const beat = calm ? 6 : Math.max(0, (t - WEDDING_PICKUP) / WEDDING_BEAT);
        const entry = calm ? 1 : this.ease((beat + 0.1) / 1.6);
        const step = calm ? 0 : Math.sin(beat * Math.PI / 4);
        const hop = calm ? 0 : Math.sin(Math.PI * (beat % 1)) ** 2;
        const castH = cast * this.images.dancers.naturalHeight / this.images.dancers.naturalWidth;
        this.shade(0.30 * entry);
        // Unfurl the runner out from the centre, keeping its weave at full size.
        c.save(); c.beginPath(); c.rect(mid - width * entry / 2, floor - 2, width * entry, hem + 4); c.clip();
        this.sprite(this.weddingCloth, mid, floor + hem / 2, width, 0, 1, 1, hem); c.restore();
        const horns = Math.min(width * 0.19, this.height * 0.22);
        for (const side of [-1, 1]) {
            const lift = calm ? 0 : Math.sin((beat - (side === 1 ? 0.5 : 0)) * Math.PI);
            this.sprite(this.images.trumpet, mid + side * width * (0.395 + (1 - entry) * 0.2),
                floor - castH * 0.84 - horns * 0.22 - lift * 2, horns,
                side * (0.07 + 0.075 * lift), entry, -side);
        }
        c.save(); c.translate(mid + step * width * 0.044, floor + 1 - hop * Math.min(6, cast * 0.018));
        c.transform(1, 0, -step * 0.034, 1 - hop * 0.012, 0, 0);
        if (calm) this.sprite(this.images.dancers, 0, -castH / 2, cast);
        else {
            const castImage = this.images.dancers, unit = cast / 800;
            c.translate(-cast / 2, -castH + (1 - entry) * 9); c.scale(unit, unit);
            c.globalAlpha = this.alpha * entry;
            c.drawImage(castImage, 0, 0, 800, 331, 0, 0, 800, 331);
            for (let i = 0; i < 8; i++) {
                const x = WEDDING_SHOES[i], w = WEDDING_SHOES[i + 1] - x;
                const lift = Math.max(0, Math.sin(beat * Math.PI) * (i % 2 ? 1 : -1));
                c.save(); c.translate(x, 330); c.transform(1, 0, lift * 0.16, 1 - lift * 0.16, 0, 0);
                c.drawImage(castImage, x, 330, w, 80, 0, 0, w, 80); c.restore();
            }
        }
        c.restore();
        if (!calm) for (const petal of this.weddingPetals) {
            const a = (beat - petal.beat) / 3.6;
            if (a <= 0 || a >= 1) continue;
            const x = mid + petal.side * width * (0.37 - a * petal.speed);
            const y = floor - castH * (0.88 + 2.5 * a * (1 - a) * petal.lift - a * 0.75);
            c.save(); c.translate(x, y); c.rotate(petal.spin + 4 * a);
            c.scale(0.42 + 0.58 * Math.abs(Math.cos(petal.spin + a * 5)), 1);
            c.globalAlpha = this.alpha * this.ease((1 - a) / 0.23);
            c.fillStyle = this.rgba(petal.side > 0 ? this.palette.accent : '255, 211, 196', 1);
            c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-7, 0, -3, -6, 0, -3);
            c.bezierCurveTo(4, -7, 6, -1, 0, 4); c.fill(); c.restore();
        }
    }

    prepareFireworks() {
        this.fireworkAudioCleanups ||= new Set();
        if (!this.fireworkAtlas) {
            const atlas = this.fireworkAtlas = document.createElement('canvas');
            atlas.width = FIREWORK_COLORS.length * 32; atlas.height = 64;
            const c = atlas.getContext('2d');
            FIREWORK_COLORS.forEach((color, index) => {
                const x = index * 32 + 16;
                const glow = c.createRadialGradient(x, 16, 0, x, 16, 15);
                glow.addColorStop(0, 'rgba(255,255,255,1)');
                glow.addColorStop(0.2, this.rgba(color, 0.98));
                glow.addColorStop(0.48, this.rgba(color, 0.3));
                glow.addColorStop(1, this.rgba(color, 0));
                c.fillStyle = glow; c.fillRect(index * 32, 0, 32, 32);
                c.fillStyle = this.rgba(color, 1);
                c.beginPath(); c.moveTo(x, 35); c.lineTo(x + 1.8, 46);
                c.lineTo(x + 12, 48); c.lineTo(x + 1.8, 50);
                c.lineTo(x, 61); c.lineTo(x - 1.8, 50); c.lineTo(x - 12, 48);
                c.lineTo(x - 1.8, 46); c.closePath(); c.fill();
            });
        }
        this.fireworkShells = FIREWORK_SHOW.map((cue, index) => {
            const stageWidth = Math.min(this.width, this.height * 1.3);
            const x = this.width * 0.5 + (cue.x - 0.5) * stageWidth, y = cue.y * this.height;
            const willow = cue.kind === 'willow', ring = cue.kind === 'ring';
            const duration = willow ? 2.25 : ring ? 1.85 : 1.75;
            const slot = willow ? 2 : ring ? 1 : cue.color === 3 || cue.color === 2 ? 3 : 0;
            const count = this.reduced ? 0 : Math.round((this.mobile ? 20 : 34) * (willow ? 1.35 : 1));
            const radius = Math.max(12, Math.min(stageWidth * (cue.finale && willow ? 0.44 : 0.32),
                this.height * (willow ? 0.36 : 0.26), x - 12, this.width - x - 12,
                (y - 12) / (2 * FIREWORK_PIVOTS[slot][1])));
            const particles = Array.from({ length: count }, (_, j) => {
                const seed = this.seed(index * 991 + j + 11);
                const angle = ring ? j * Math.PI * 2 / count + seed * 0.025 : j * 2.3999632297 + index;
                const depth = 1 - 2 * (j + 0.5) / count;
                const spread = ring ? 0.96 + seed * 0.07 : Math.sqrt(1 - depth * depth) * (0.82 + seed * 0.18);
                const vx = Math.cos(angle) * spread;
                const vy = Math.sin(angle) * spread * (ring ? 0.73 : willow ? 0.82 : 1);
                return {
                    vx: ring ? vx * 0.95 - vy * 0.3 : vx,
                    vy: ring ? vx * 0.3 + vy * 0.95 : vy,
                    ttl: duration * (0.83 + this.seed(j + index * 79 + 23) * 0.17),
                    color: willow ? (j % 11 ? 0 : 4) : j % 8 ? cue.color : 4,
                    size: 2.8 + seed * 3.1,
                    glint: j % 23 === 0,
                    phase: this.seed(j + index * 47 + 14) * Math.PI * 2
                };
            });
            return { ...cue, index, x, y, slot, radius, particles, duration,
                drag: willow ? 1.35 : ring ? 2.2 : 1.9,
                gravity: Math.min(this.height * (willow ? 0.105 : ring ? 0.025 : 0.044), willow ? 85 : ring ? 20 : 36) };
        });
    }

    fireworkPoint(shell, spark, age) {
        const travel = (1 - Math.exp(-shell.drag * age)) / (1 - Math.exp(-shell.drag * shell.duration));
        return [shell.x + spark.vx * shell.radius * travel,
            shell.y + spark.vy * shell.radius * travel + 0.5 * shell.gravity * age * age];
    }

    fireworkSpark(x, y, size, color, alpha, star = false) {
        const c = this.ctx, previousAlpha = c.globalAlpha;
        c.globalAlpha = this.alpha * alpha;
        c.drawImage(this.fireworkAtlas, color * 32, star ? 32 : 0, 32, 32, x - size / 2, y - size / 2, size, size);
        c.globalAlpha = previousAlpha;
    }

    fireworkSound(method, ...args) {
        const cleanup = window.app?.soundMgr?.[method]?.(...args);
        if (typeof cleanup === 'function') this.fireworkAudioCleanups.add(cleanup);
    }

    fireworkBloom(shell, life) {
        const c = this.ctx, [px, py] = FIREWORK_PIVOTS[shell.slot];
        const u = life / shell.duration, willow = shell.kind === 'willow';
        const spread = 0.045 + 0.955 * (1 - Math.exp(-life * (willow ? 4.3 : 5.8)));
        const size = 2 * shell.radius * spread, fall = shell.gravity * life * life;
        c.save(); c.translate(shell.x, shell.y + fall * (willow ? 0.28 : 0.18));
        if (shell.index % 2) c.scale(-1, 1);
        if (!willow) c.rotate((shell.index % 3 - 1) * 0.09 * spread);
        const layer = (row, w, h, alpha) => {
            if (alpha <= 0.002) return;
            c.globalAlpha = this.alpha * alpha;
            c.drawImage(this.images.blooms, shell.slot * 320, row * 320, 320, 320, -px * w, -py * h, w, h);
        };
        // The incandescent body burns out before its outer pearls drift down.
        layer(0, size, size * (willow ? 0.72 + 0.46 * u : 0.96 + 0.08 * u),
            1 - this.ease((u - 0.23) / 0.68));
        const shimmer = willow && !this.reduced ? FIREWORK_CRACKLES.reduce((v, cue) =>
            Math.max(v, 1 - this.clamp(Math.abs(life - cue) / 0.09)), 0) : 0;
        const pearls = size * (0.92 + 0.14 * this.ease(u / 0.55));
        layer(1, pearls, pearls * (willow ? 0.70 + 0.62 * u : 0.96 + 0.15 * u),
            this.ease(life / 0.13) * (1 - this.ease((u - 0.55) / 0.45)) * (0.72 + 0.28 * shimmer));
        c.restore();
    }

    fireworks(t) {
        const c = this.ctx;
        c.fillStyle = this.rgba('3, 6, 14', this.alpha * (this.reduced ? 0.56 : 0.83));
        c.fillRect(0, 0, this.width, this.height);
        this.overlay.dataset.fireworksPhase = this.reduced ? 'holding' : t < 3.48 ? 'launches' : t < 5.25 ? 'finale' : 'embers';
        let active = 0;
        c.save(); c.globalCompositeOperation = 'screen';
        for (const shell of this.reduced ? this.fireworkShells.slice(0, 3) : this.fireworkShells) {
            const age = this.reduced ? shell.rise + 0.7 : t - shell.launch;
            if (age < 0 || age > shell.rise + shell.duration) continue;
            if (age < shell.rise) {
                this.once('firework-launch-' + shell.index, () => {
                    if (age < 0.13) this.fireworkSound('fireworkLaunch', shell.rise - age, shell.index);
                });
                const at = seconds => {
                    const u = this.clamp(seconds / shell.rise), rise = 1 - Math.pow(1 - u, 1.8);
                    return [this.width * 0.5 + (shell.x - this.width * 0.5) * (0.66 + rise * 0.34)
                        + Math.sin(u * Math.PI) * (shell.index % 2 ? 1 : -1) * this.width * 0.025,
                    this.height + 12 + (shell.y - this.height - 12) * rise];
                };
                for (let segment = 6; segment > 0; segment--) {
                    this.line([at(Math.max(0, age - segment * 0.018)), at(Math.max(0, age - (segment - 1) * 0.018))],
                        FIREWORK_COLORS[0], (1 - segment / 7) * 0.7, 0.55 + (1 - segment / 7) * 1.25);
                }
                const [x, y] = at(age);
                this.fireworkSpark(x, y, 11, 4, 0.95);
                continue;
            }
            const life = age - shell.rise;
            active++;
            if (!this.reduced) this.once('firework-burst-' + shell.index, () => {
                if (life < 0.15) this.fireworkSound('fireworkExplode', shell.kind, shell.index,
                    shell.finale ? 0.78 : 1, shell.kind === 'willow' ? FIREWORK_CRACKLES : [], life);
            });
            this.fireworkBloom(shell, life);
            for (const spark of shell.particles) {
                if (life >= spark.ttl) continue;
                const [x, y] = this.fireworkPoint(shell, spark, life);
                if (x < -20 || x > this.width + 20 || y < -20 || y > this.height + 20) continue;
                const twinkle = this.reduced ? 1 : 0.82 + Math.sin(life * 17 + spark.phase) * 0.18;
                const fade = Math.pow(1 - life / spark.ttl, 0.38) * this.ease((spark.ttl - life) / 0.34);
                const alpha = fade * twinkle;
                this.fireworkSpark(x, y, spark.size, spark.color, alpha);
                if (spark.glint) this.fireworkSpark(x, y, spark.size * 1.35, 4, alpha * 0.6, true);
            }
            if (!this.reduced && life < 0.25) this.fireworkSpark(shell.x, shell.y, shell.radius * 0.8,
                shell.color, Math.exp(-life * 18) * 0.48);
        }
        c.restore();
        this.overlay.dataset.activeBursts = String(active);
    }

    prepareDroneFormation() {
        const image = this.images.drone;
        const ratio = (image.naturalHeight || image.height) / (image.naturalWidth || image.width);
        const size = Math.min(160, this.width * 0.235, this.height * 0.205);
        const rowSpacing = size * (ratio + 0.34);
        const centerY = this.height * 0.405;
        if (this.droneFace) {
            const paths = DRONE_DIGITS[this.droneFace];
            const nodes = [...new Set(paths.flat())];
            const halfWidth = Math.min(this.width * .28, size * 1.65);
            const halfHeight = Math.min(this.height * .21, halfWidth * 1.28);
            this.droneTargets = nodes.map((node, i) => {
                const column = node % 3 - 1, row = Math.floor(node / 3);
                const dy = this.droneFace === 1 && node === 3 ? -.38 : row - 1;
                return { size, ratio, column, row, side: column, entry: .07 + i * .09,
                    x: this.width / 2 + column * halfWidth, y: this.height * .48 + dy * halfHeight };
            });
            this.droneLinks = paths.flatMap(path => path.slice(1).map((node, i) => [nodes.indexOf(path[i]), nodes.indexOf(node)]));
            this.overlay.dataset.face = String(this.droneFace);
        } else {
            this.droneTargets = DRONE_FORMATION.map(target => ({ ...target, size, ratio,
                x: this.width / 2 + target.column * size * 1.25,
                y: centerY + (target.row - 0.5) * rowSpacing
            }));
        }
        this.overlay.dataset.drones = String(this.droneTargets.length);
        this.overlay.dataset.droneSource = LiveEffectsStage.sources('drones', this.theme).drone;
        if (this.droneLight) return;
        const light = document.createElement('canvas'); light.width = 64; light.height = 64;
        const lightCtx = light.getContext('2d');
        const glow = lightCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(0.14, this.rgba(this.palette.main, 0.8));
        glow.addColorStop(0.42, this.rgba(this.palette.main, 0.22));
        glow.addColorStop(1, this.rgba(this.palette.main, 0));
        lightCtx.fillStyle = glow; lightCtx.fillRect(0, 0, 64, 64);
        this.droneLight = light;
    }

    drones(t) {
        const c = this.ctx;
        const pulse = this.reduced ? 0 : this.ease((t - 4.58) / 0.18) * (1 - this.ease((t - 4.76) / 0.65));
        c.fillStyle = this.rgba('5, 9, 17', this.alpha * (this.reduced ? 0.35 : 0.59));
        c.fillRect(0, 0, this.width, this.height);
        this.overlay.dataset.formation = this.reduced ? 'holding' : t < 2.3 ? 'assembling'
            : t >= 5.55 ? 'departing' : pulse > 0 ? 'pulse' : 'holding';
        const [lightX, lightY] = DRONE_LIGHT_ANCHORS[this.theme];
        const drones = this.droneTargets.map(({ x, y, size, ratio, column, row, side, entry }, i) => {
            const arrival = this.reduced ? 1 : this.ease((t - entry) / 1.72);
            const exit = this.reduced ? 0 : this.ease((t - 5.55 - row * 0.29 - Math.abs(column) * 0.1) / 1.76);
            const entryX = side ? this.width * (side > 0 ? 1 : 0) + side * size : x;
            const entryY = side ? y + size * (row ? 1.2 : 0.68) : -size;
            const hover = this.reduced ? 0 : Math.sin(t * 2.1 + i * 0.8) * 2.6 * arrival * (1 - exit);
            const px = entryX + (x - entryX) * arrival + column * size * 0.56 * exit;
            const py = entryY + (y - entryY) * arrival + hover - (y + size * 1.5) * exit;
            const tilt = this.reduced ? 0 : (side * 0.19 * (1 - arrival) + column * 0.15 * exit
                + Math.sin(t * 2 + i) * 0.024 * arrival * (1 - exit));
            const width = size * (0.82 + 0.18 * arrival - 0.18 * exit);
            const dx = (lightX - 0.5) * width;
            const dy = (lightY - 0.5) * width * ratio;
            const light = this.reduced ? 0.74 : this.ease((t - 2.5 - i * 0.31) / 0.21) * (1 - exit);
            return { px, py, tilt, width, light, column,
                lx: px + dx * Math.cos(tilt) - dy * Math.sin(tilt),
                ly: py + dx * Math.sin(tilt) + dy * Math.cos(tilt) };
        });
        this.overlay.dataset.lit = String(drones.filter(drone => drone.light > 0.5).length);
        if (pulse > 0) this.glow(this.width / 2, this.height * (this.droneFace ? .48 : .405), this.droneTargets[0].size * 2.4,
            this.palette.main, pulse * 0.31);

        // Short downlights leave room for the luminous strokes between the ships.
        for (const { lx, ly, width, column, light } of drones) {
            if (light < 0.02 || this.reduced) continue;
            const depth = width * (this.droneFace ? .50 + pulse * .24 : 1.14 + pulse * .65);
            const spread = width * (this.droneFace ? .12 + pulse * .07 : .22 + pulse * .14);
            const endX = lx + column * depth * 0.23;
            const beam = c.createLinearGradient(lx, ly, endX, ly + depth);
            beam.addColorStop(0, this.rgba(this.palette.accent, (0.37 + pulse * 0.28) * light * this.alpha));
            beam.addColorStop(0.36, this.rgba(this.palette.main, (0.15 + pulse * 0.2) * light * this.alpha));
            beam.addColorStop(1, this.rgba(this.palette.main, 0));
            c.fillStyle = beam; c.beginPath();
            c.moveTo(lx - 2, ly); c.lineTo(lx + 2, ly);
            c.lineTo(endX + spread, ly + depth); c.lineTo(endX - spread, ly + depth);
            c.closePath(); c.fill();
        }
        if (this.droneLinks) {
            const reveal = this.reduced ? 1 : this.ease((t - 2.35) / 1.38);
            const opacity = this.reduced ? .82 : 1 - this.ease((t - 5.55) / .45);
            if (reveal > 0 && opacity > 0) {
                const weight = Math.max(2.6, this.droneTargets[0].size * .047);
                c.save(); c.lineCap = 'round'; c.beginPath();
                this.droneLinks.forEach(([from, to], i) => {
                    const u = this.clamp(reveal * this.droneLinks.length - i);
                    if (!u) return;
                    const a = drones[from], b = drones[to];
                    c.moveTo(a.lx, a.ly);
                    c.lineTo(a.lx + (b.lx - a.lx) * u, a.ly + (b.ly - a.ly) * u);
                });
                c.globalAlpha = opacity * this.alpha;
                c.strokeStyle = this.rgba(this.palette.main, .20); c.lineWidth = weight * (3.5 + pulse); c.stroke();
                c.strokeStyle = this.rgba(this.palette.accent, .92); c.lineWidth = weight; c.stroke();
                c.strokeStyle = 'rgba(255,255,245,.88)'; c.lineWidth = weight * .36; c.stroke(); c.restore();
            }
        }
        for (const { px, py, lx, ly, width, tilt, light } of drones) {
            this.sprite(this.images.drone, px, py, width, tilt);
            this.sprite(this.droneLight, lx, ly, width * (0.29 + pulse * 0.35), 0, 0.08 + light * 0.84);
            this.dot(lx, ly, Math.max(1, width * 0.021), '255, 254, 248', light * 0.9);
        }
    }

    prepareDust() {
        const atlas = this.dustAtlas = document.createElement('canvas');
        const cell = 48;
        const flecks = !this.reduced && this.images.flecks;
        atlas.width = cell * 3; atlas.height = cell * (flecks ? 7 : 3);
        const c = atlas.getContext('2d');
        const colors = [this.palette.main, this.palette.accent, '238, 248, 255'];
        for (const [tone, color] of colors.entries()) {
            for (let shape = 0; shape < 3; shape++) {
                c.save();
                c.translate((tone + 0.5) * cell, (shape + 0.5) * cell);
                c.scale(2, 2);
                c.fillStyle = this.rgba(color, 1);
                c.beginPath();
                if (shape === 0) {
                    c.arc(0, 0, 8.5, 0, Math.PI * 2);
                } else if (shape === 1) {
                    const halo = c.createRadialGradient(0, 0, 0, 0, 0, 11);
                    halo.addColorStop(0, this.rgba('248, 253, 255', 1));
                    halo.addColorStop(0.22, this.rgba(color, 0.93));
                    halo.addColorStop(0.5, this.rgba(color, 0.29));
                    halo.addColorStop(1, this.rgba(color, 0));
                    c.fillStyle = halo;
                    c.arc(0, 0, 11, 0, Math.PI * 2);
                } else {
                    c.moveTo(0, -11); c.lineTo(2, -2); c.lineTo(10, 0); c.lineTo(2, 2);
                    c.lineTo(0, 11); c.lineTo(-2, 2); c.lineTo(-10, 0); c.lineTo(-2, -2); c.closePath();
                }
                c.fill();
                c.restore();
            }
            if (flecks) {
                // Tint once without flattening the facets or translucent edges.
                const tile = flecks.naturalWidth / 3;
                c.save();
                for (let variant = 0; variant < 3; variant++) {
                    const x = tone * cell, y = (4 + variant) * cell;
                    c.drawImage(flecks, variant * tile, 0, tile, flecks.naturalHeight, x, y, cell, cell);
                    c.globalCompositeOperation = 'source-atop';
                    c.fillStyle = this.rgba(color, 0.34); c.fillRect(x, y, cell, cell);
                    c.globalCompositeOperation = 'source-over';
                }
                c.restore();
            }
        }

        const base = this.mobile ? 420 : 720;
        const count = this.reduced ? 45 : base + (this.mobile ? 36 : 60);
        return Array.from({ length: count }, (_, i) => {
            const layer = i % 3;
            const variety = this.seed(i + 217);
            const extra = i - base;
            const shape = flecks && extra >= 0 && extra % 3 === 2 ? 4 + Math.floor(extra / 3) % 3
                : variety < 0.69 ? 0 : variety < 0.86 ? 1 : variety < 0.92 ? 2 : 3;
            const tone = shape === 2 ? 2 : i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : 0;
            return {
                angle: this.seed(i + 22) * Math.PI * 2,
                radius: 0.08 + this.seed(i + 74) * 0.75,
                speed: this.reduced ? 0 : 0.1 + layer * 0.09,
                shape, tone, color: colors[tone],
                size: shape >= 4 ? 18 + this.seed(i + 151) * 11
                    : [1.5 + layer * 1.1, 6.8 + layer * 2.7, 4.8 + layer * 1.7, 4 + layer * 1.8][shape]
            };
        });
    }

    dust(t) {
        const c = this.ctx;
        c.fillStyle = this.rgba('4, 7, 13', (this.reduced ? 0.3 : 0.6) * this.alpha);
        c.fillRect(0, 0, this.width, this.height);
        const gain = this.ease((this.alpha - .12) / .88);
        if (!gain) return;
        for (let cloud = 0; cloud < 3; cloud++) {
            const x = this.width * (0.2 + cloud * 0.3) + Math.sin(t * 0.28 + cloud * 2) * this.width * 0.18;
            const y = this.height * (0.25 + cloud * 0.22) + Math.cos(t * 0.24 + cloud) * 45;
            this.glow(x, y, Math.min(this.width, this.height) * 0.7,
                cloud === 1 ? this.palette.accent : this.palette.main, 0.085 * gain);
        }
        const particles = this.dustParticles;
        const cell = this.dustAtlas.width / 3;
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            const angle = particle.angle + t * particle.speed;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const x = this.width / 2 + cos * particle.radius * this.width * 0.78 + Math.sin(t * 0.5 + i) * 8;
            const y = this.height / 2 + sin * particle.radius * this.height * 0.75;
            const { size, shape } = particle;
            if (x < -size || x > this.width + size || y < -size || y > this.height + size) continue;
            const alpha = gain * (0.32 + (Math.sin(t + i) + 1) * 0.2);
            if (shape === 3) {
                c.globalAlpha = 1;
                this.line([[x - sin * size, y + cos * size * 0.72], [x, y]], particle.color, alpha * 0.64, 0.9);
            } else {
                c.globalAlpha = this.alpha * alpha;
                c.drawImage(this.dustAtlas, particle.tone * cell, shape * cell, cell, cell,
                    x - size / 2, y - size / 2, size, size);
            }
        }
        c.globalAlpha = 1;
    }

    ufo(t, p) {
        this.shade(0.23);
        const b = this.board, enter = this.reduced ? 1 : this.ease(p / 0.2), leave = this.reduced ? 0 : this.ease((p - 0.81) / 0.19);
        const hoverX = b.x + b.width / 2;
        const hoverY = Math.max(88, Math.min(this.height * 0.35, b.y + b.height * 0.09));
        const x = -160 + (hoverX + 160) * enter + leave * (this.width + 160);
        const y = hoverY - (1 - enter) * 110 - leave * 180 + (this.reduced ? 0 : Math.sin(t * 2.4) * 5);
        const width = Math.min(235, this.width * 0.56);
        if (!this.reduced) this.once('ufo-engine', () => {
            this.ufoAudioCleanup = window.app?.soundMgr?.ufoAbduction?.(UFO_BEAM_START, UFO_RELEASE_START);
        });
        const beam = this.reduced ? .46 : this.ease((t - UFO_BEAM_START) / .65) * this.ease((6.32 - t) / .46);
        const tilt = this.reduced ? 0 : Math.sin(t * 1.4) * .035;
        const offset = width * this.images.ship.naturalHeight / this.images.ship.naturalWidth * .40;
        const emitterX = x - Math.sin(tilt) * offset;
        const emitterY = y - width * .07 + Math.cos(tilt) * offset;
        if (beam > 0) {
            const bottom = b.bottom, spread = b.width * 0.51;
            const gradient = this.ctx.createLinearGradient(emitterX, emitterY, x, bottom);
            gradient.addColorStop(0, this.rgba(this.palette.accent, 0.32 * beam * this.alpha));
            gradient.addColorStop(1, this.rgba(this.palette.main, 0.025 * beam * this.alpha));
            this.ctx.fillStyle = gradient; this.ctx.beginPath(); this.ctx.moveTo(emitterX - 17, emitterY);
            this.ctx.lineTo(emitterX + 17, emitterY); this.ctx.lineTo(x + spread, bottom); this.ctx.lineTo(x - spread, bottom);
            this.ctx.closePath(); this.ctx.fill();
            if (!this.reduced && bottom > emitterY) {
                // The ripples converge on the emitter, then spread out with the returning scores.
                const phase = -(Math.min(t, UFO_RELEASE_START) - UFO_BEAM_START) * .47
                    + Math.max(0, t - UFO_RELEASE_START) * .72;
                for (let i = 0; i < 3; i++) {
                    const cycle = phase + i / 3, u = cycle - Math.floor(cycle);
                    const rx = 12 + (spread - 12) * u;
                    this.ctx.beginPath();
                    this.ctx.ellipse(emitterX + (x - emitterX) * u, emitterY + (bottom - emitterY) * u,
                        rx, rx * .10, 0, 0, Math.PI * 2);
                    this.ctx.lineWidth = 1.1;
                    this.ctx.strokeStyle = this.rgba(this.palette.accent, .28 * beam * this.alpha * Math.sin(u * Math.PI));
                    this.ctx.stroke();
                }
            }
            for (let i = 0; i < (this.reduced ? 12 : 60); i++) {
                const life = (t * (0.22 + this.seed(i + 9) * 0.2) + this.seed(i + 15)) % 1;
                const py = bottom - (bottom - emitterY) * life;
                const px = x + Math.sin(life * 8 + i) * spread * (1 - life) * 0.75;
                this.dot(px, py, 0.7 + this.seed(i + 52), this.palette.main, beam * 0.55);
            }
        }
        if (!this.reduced) {
            const c = this.ctx;
            c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
            this.scores.forEach(({node, text, rect}, i) => {
                const order = i / Math.max(1, this.scores.length - 1);
                const lift = this.clamp((t - 1.70 - order * 1.05) / 2.12);
                const drop = this.clamp((t - UFO_RELEASE_START - (1 - order) * .28) / .76);
                if (!lift || drop === 1 || node.textContent.trim() !== text) {
                    if (this.mutedNodes.delete(node)) node.classList.remove('live-ufo-score-muted');
                    return;
                }
                if (!this.mutedNodes.has(node)) {
                    node.classList.add('live-ufo-score-muted');
                    this.mutedNodes.add(node);
                }
                if (lift === 1 && !drop) return;
                const travel = drop ? 1 - this.ease(drop) : this.ease(lift);
                const sx = rect.left + rect.width / 2, sy = rect.top + rect.height / 2;
                const px = sx + (emitterX - sx) * travel + Math.sin(travel * 9 + i) * 16 * Math.sin(travel * Math.PI);
                const py = sy + (emitterY - sy) * travel;
                c.globalAlpha = (1 - this.ease((travel - .80) / .20)) * this.alpha;
                const fontSize = Math.max(12, Math.min(19, rect.height * .56)) * (1 - travel * .40);
                c.font = `700 ${fontSize}px Arial`;
                c.strokeStyle = 'rgba(8,12,23,.85)'; c.lineWidth = 2; c.strokeText(text, px, py);
                c.fillStyle = this.rgba(this.palette.accent, 1); c.fillText(text, px, py);
            });
            c.restore();
        }
        this.sprite(this.images.ship, x, y - width * 0.07, width, tilt);
        this.glow(emitterX, emitterY, width * .13, this.palette.main, beam * .78);
    }

    prepareDragonBreath() {
        const b = this.board, width = Math.min(b.width * 0.52, this.width * 0.48, this.height * 0.31, 206);
        const cx = Math.max(width / 2, Math.min(this.width - width / 2, b.x + b.width * 0.47));
        const top = Math.max(12, Math.min(this.height * 0.39 - width * 0.62, b.y + b.height * 0.08));
        this.dragonLayout = { width, cx, top,
            span: Math.min(this.width * 1.12, this.height * 0.94, b.width * 1.85),
            run: Math.min(this.height * 0.59, Math.max(b.height * 0.93, this.height * 0.44)) };
        this.dragonPackets ||= Array.from({ length: 22 }, (_, i) => ({
            born: 1.5 + i * 0.113, tile: [0, 1, 2, 1, 0, 3, 2][i % 7],
            phase: this.seed(i + 61) * Math.PI * 2, side: this.seed(i + 95) * 2 - 1,
            turn: (this.seed(i + 17) - 0.5) * 0.95, flip: i % 3 ? 1 : -1
        }));
        this.dragonCinders ||= Array.from({ length: this.mobile ? 32 : 50 }, (_, i) => ({
            born: 1.57 + this.seed(i + 7) * 2.37, ttl: 0.82 + this.seed(i + 18) * 0.64,
            side: this.seed(i + 94) * 2 - 1, phase: this.seed(i + 74) * Math.PI * 2
        }));
        for (const stream of [this.dragonPackets, this.dragonCinders]) {
            for (const item of stream) item.origin = this.dragonPose(item.born).mouth;
        }
        this.dragonBounce = this.ctx.createLinearGradient(0, this.height * 0.38, 0, this.height);
        this.dragonBounce.addColorStop(0, 'rgba(255,127,36,0)');
        this.dragonBounce.addColorStop(0.7, 'rgba(255,128,35,0.12)');
        this.dragonBounce.addColorStop(1, 'rgba(255,192,90,0.28)');
    }

    dragonPose(time) {
        const t = this.reduced ? 2 : time, l = this.dragonLayout;
        const entry = this.reduced ? 1 : this.ease(t / 0.78), leave = this.reduced ? 0 : this.ease((t - 4.55) / 0.8);
        const inhale = this.ease((t - 0.67) / 0.74) * (1 - this.ease((t - 1.52) / 0.35));
        const breath = this.reduced ? 0.29 : this.ease((t - 1.5) / 0.2) * (1 - this.ease((t - 3.74) / 0.41));
        const gape = 0.44 + inhale * 0.36 + breath * 0.56;
        const size = l.width * (0.93 + 0.07 * entry - 0.035 * inhale);
        const top = l.top + (1 - entry) * 7 + inhale * 3 - leave * 8;
        const mouth = { x: l.cx, y: top + size * (DRAGON_JAW.upper + (DRAGON_JAW.throat - DRAGON_JAW.upper) * gape) };
        return { size, top, mouth, entry, leave, breath, inhale, gape };
    }

    dragonProjection(origin, life, side = 0, phase = 0) {
        const l = this.dragonLayout, u = this.clamp(life);
        // Perspective enlarges and separates the nearest curls faster than the ones at the throat.
        const magnification = 1 / (1 - 0.835 * u), travel = u * magnification * 0.165;
        return { x: origin.x + travel * l.span * (0.12 + side * 0.26 + 0.10 * Math.sin(phase + u * 4.8)),
            y: origin.y + travel * l.run, size: l.span * (0.034 + u * 0.138) * magnification };
    }

    fire(time) {
        const t = this.reduced ? 2 : time, c = this.ctx, l = this.dragonLayout, j = DRAGON_JAW;
        const { size, top, mouth, entry, leave, breath, inhale, gape } = this.dragonPose(t);
        this.overlay.dataset.dragonPhase = this.reduced ? 'holding' : t < 0.8 ? 'arrival'
            : t < 1.5 ? 'inhale' : t < 4.15 ? 'breath' : t < 4.55 ? 'embers' : 'exit';
        if (!this.reduced && t >= 0.6) this.once('dragon-breath', () => {
            if (t < 1.65) this.dragonAudioCleanup = window.app?.soundMgr?.dragonBreath?.(Math.max(0, 1.5 - t));
        });
        c.fillStyle = this.rgba('5, 13, 20', this.alpha * (this.reduced ? 0.32 : 0.45 + 0.18 * breath));
        c.fillRect(0, 0, this.width, this.height);

        // Deform only the mouth band. Its sampled throat and the emission point share the same transform.
        const head = this.images.head, sw = head.naturalWidth, sh = head.naturalHeight;
        const visible = entry * (1 - leave), mid = (j.lower - j.upper) * gape;
        c.save(); c.translate(l.cx - size / 2, top);
        c.globalAlpha = this.alpha * visible * (0.75 - 0.13 * breath);
        const band = (a, b, y, h) => c.drawImage(head, 0, a * sh, sw, (b - a) * sh, 0, y * size, size, h * size);
        band(0, j.upper, 0, j.upper);
        band(j.upper, j.lower, j.upper, mid);
        band(j.lower, 1, j.upper + mid, 1 - j.lower);
        c.restore();
        this.glow(mouth.x, mouth.y, size * (0.055 + inhale * 0.11 + 0.09 * breath),
            '255, 156, 56', visible * (0.10 + 0.45 * inhale + 0.75 * breath));

        if (breath > 0) {
            const root = this.dragonProjection(mouth, 0.59);
            const dx = root.x - mouth.x, dy = root.y - mouth.y;
            c.save(); c.translate(mouth.x, mouth.y); c.rotate(Math.atan2(dy, dx) + Math.PI / 2);
            c.globalAlpha = this.alpha * breath * 0.9;
            const w = size * (0.18 + 0.09 * breath), h = Math.hypot(dx, dy) * (0.7 + 0.3 * breath);
            c.drawImage(this.images.flame, -w / 2, -h, w, h);
            c.restore();
        }
        // Later emissions sit further away: paint them before the approaching, older curls.
        for (let i = this.dragonPackets.length - 1; i >= 0; i--) {
            const p = this.dragonPackets[i], u = (t - p.born) / 0.98;
            if (u <= 0 || u >= 1 || (this.reduced && i % 2)) continue;
            const point = this.dragonProjection(p.origin, u, p.side, p.phase);
            const crest = this.reduced ? 0 : this.ease((p.born - 2.85) / 0.48) * this.ease((3.91 - p.born) / 0.32);
            const close = crest * this.ease((u - 0.52) / 0.46);
            point.size *= 1 + 0.94 * close;
            point.y += close * l.run * 0.12;
            const fadeAt = 0.79 + crest * 0.095;
            const opacity = this.ease(u / 0.12) * (1 - this.ease((u - fadeAt) / (1 - fadeAt)));
            c.save(); c.translate(point.x, point.y); c.rotate(p.turn + 0.43 * u * Math.sin(p.phase));
            c.scale(p.flip, 1); c.globalAlpha = this.alpha * opacity * (this.reduced ? 0.38 : 0.87);
            c.drawImage(this.images.plume, (p.tile % 2) * 320, Math.floor(p.tile / 2) * 320, 320, 320,
                -point.size / 2, -point.size / 2, point.size, point.size);
            c.restore();
        }
        if (!this.reduced) for (const ember of this.dragonCinders) {
            const u = (t - ember.born) / ember.ttl;
            if (u <= 0 || u >= 1) continue;
            const p = this.dragonProjection(ember.origin, u, ember.side * 2.7, ember.phase);
            const radius = 0.65 + u * u * 2.7;
            this.dot(p.x, p.y - u * u * l.run * 0.16, radius, '255, 205, 94', Math.sin(u * Math.PI) * 0.94);
        }
        if (!this.reduced && t > 3.4 && t < 4.65) {
            c.save(); c.fillStyle = this.dragonBounce;
            c.globalAlpha = this.alpha * this.ease((t - 3.4) / 0.58) * (1 - this.ease((t - 4.16) / 0.49));
            c.fillRect(0, 0, this.width, this.height); c.restore();
        }
    }

    prepareRoyalScene() {
        if (!this.royalLogo) {
            const logo = this.royalLogo = this.images.logo;
            this.royalPoses = [this.images.coin, this.images.coinLeft, this.images.coinRight];

            const beam = this.royalBeam = document.createElement('canvas');
            beam.width = this.images.spotlight.naturalWidth; beam.height = this.images.spotlight.naturalHeight;
            const bc = beam.getContext('2d');
            bc.drawImage(this.images.spotlight, 0, 0);
            bc.globalCompositeOperation = 'source-atop'; bc.fillStyle = this.rgba(this.palette.accent, .46);
            bc.fillRect(0, 0, beam.width, beam.height);
            if (!this.reduced) {
                this.royalShine = document.createElement('canvas');
                this.royalShine.width = Math.ceil(logo.naturalWidth * .29);
                this.royalShine.height = logo.naturalHeight;
                const shine = this.royalShine.getContext('2d');
                const band = this.royalBand = shine.createLinearGradient(0, 0, this.royalShine.width, this.royalShine.width * .16);
                band.addColorStop(0, 'rgba(255,255,240,0)');
                band.addColorStop(.48, 'rgba(255,251,222,.62)');
                band.addColorStop(1, 'rgba(255,255,240,0)');
                this.royalCoins = Array.from({ length: this.mobile ? 84 : 124 }, (_, i) => ({
                    side: i % 2 ? 1 : -1, pose: i % 3,
                    delay: 1.2 + this.seed(i + 8) * 2.85,
                    duration: 2.8 + this.seed(i + 15) * 0.72,
                    lift: 0.76 + this.seed(i + 29) * 0.17,
                    arc: 0.15 + this.seed(i + 45) * 0.14,
                    size: (this.mobile ? 15 : 21) + this.seed(i + 66) * (this.mobile ? 12 : 15)
                }));
            }
        }
        const ratio = this.royalLogo.naturalHeight / this.royalLogo.naturalWidth;
        const width = Math.min(660, this.width * 0.88, this.height * 0.38 / ratio);
        this.royalLayout = { x: this.width / 2, y: this.height * 0.385, width, height: width * ratio };
    }

    royal(t) {
        const c = this.ctx;
        const layout = this.royalLayout;
        const { x, y } = layout;
        const entry = this.reduced ? 1 : this.ease((t - 1.48) / 1.24);
        const crestTime = t - ROYAL_YAMB_CREST_SECONDS;
        const crest = this.reduced ? 0 : this.ease(crestTime / 0.12) * (1 - this.ease((crestTime - 0.12) / 0.75));
        const width = layout.width * (0.94 + entry * 0.06);
        const height = layout.height * width / layout.width;
        const logoY = y + (1 - entry) * 18;
        this.overlay.dataset.ceremony = this.reduced ? 'holding' : t < 1.65 ? 'arrival'
            : crestTime >= 0 && crestTime < 0.9 ? 'crest' : t > 6.8 ? 'exit' : 'holding';
        if (!this.reduced && t >= 0.6) this.once('royal-fanfare', () => {
            if (crestTime < .12) this.royalAudioCleanup = window.app?.soundMgr?.royalFanfare?.(Math.max(0, -crestTime));
        });
        c.fillStyle = this.rgba('5, 8, 14', this.alpha * (this.reduced ? 0.4 : 0.64));
        c.fillRect(0, 0, this.width, this.height);

        c.save(); c.globalCompositeOperation = 'screen';
        for (let i = 0; i < 4; i++) {
            const side = i % 2 ? 1 : -1;
            const outer = i < 2 ? 1 : 0.72;
            const originX = this.width * (0.5 + side * 0.43 * outer);
            const originY = this.height * 0.94;
            const focus = this.reduced ? 1 : this.ease((t - 1.72) / 1.48);
            const sweep = this.reduced ? 0 : Math.sin(t * 0.53 + i * 1.9) * (1 - .85 * focus) * this.width * 0.12;
            const aimX = x + side * width * ((1 - focus) * .55 - .22 + (i < 2 ? .08 : -.08)) + sweep;
            const aimY = y - height * 0.65;
            const length = Math.hypot(aimX - originX, aimY - originY) * 1.35;
            c.save(); c.translate(originX, originY);
            c.rotate(Math.atan2(aimY - originY, aimX - originX) + Math.PI / 2);
            c.globalAlpha = this.alpha * (this.reduced ? 0.5 : this.ease((t - i * 0.08) / 0.8)) * (0.74 + crest * 0.26);
            const fan = width * (i < 2 ? .53 : .33);
            c.drawImage(this.royalBeam, -fan / 2, -length, fan, length);
            c.restore();
        }
        c.restore();

        const poses = this.royalPoses;
        if (!this.reduced) for (const coin of this.royalCoins) {
            const life = (t - coin.delay) / coin.duration;
            if (life <= 0 || life >= 1) continue;
            const px = x + coin.side * this.width * (0.42 - Math.sin(life * Math.PI) * coin.arc);
            const py = this.height * (0.91 - coin.lift * 4 * life * (1 - life) + life * life * 0.34);
            const clearance = Math.max(Math.abs(px - x) - width / 2, Math.abs(py - logoY) - height / 2) - coin.size / 2 - 10;
            const alpha = Math.sin(life * Math.PI) * this.ease(clearance / 18) * 0.95;
            if (alpha <= 0.01) continue;
            const flip = 0.62 + Math.abs(Math.cos(life * 5 + coin.pose)) * 0.38;
            this.sprite(poses[coin.pose], px, py, coin.size, coin.side * (life * 2.4 + coin.pose), alpha, flip, coin.size);
        }
        if (this.reduced) {
            poses.forEach((image, i) => this.sprite(image, x + (i - 1) * 46, y + height / 2 + 45, 30));
        }
        const seal = this.reduced ? 0 : this.ease((t - .12) / .53) * (1 - this.ease((t - 1.28) / .55));
        if (seal > 0) {
            const size = Math.min(width * .57, this.height * .32, 248);
            this.sprite(this.images.seal, x, y - entry * 14, size, 0, seal);
        }
        if (entry > 0) this.sprite(this.royalLogo, x, logoY, width, 0, entry, 1, height);

        if (!this.reduced && crestTime >= 0 && crestTime < 0.95) {
            const shine = this.royalShine.getContext('2d');
            const w = this.royalShine.width, h = this.royalShine.height;
            shine.globalCompositeOperation = 'source-over'; shine.clearRect(0, 0, w, h);
            const offset = (this.royalLogo.naturalWidth + w) * crestTime / .95 - w;
            shine.fillStyle = this.royalBand; shine.fillRect(0, 0, w, h);
            shine.globalCompositeOperation = 'destination-in'; shine.drawImage(this.royalLogo, -offset, 0);
            const scale = width / this.royalLogo.naturalWidth;
            this.sprite(this.royalShine, x - width / 2 + (offset + w / 2) * scale, logoY, w * scale, 0, entry, 1, height);
        }
        const unfold = this.reduced ? 1 : this.ease(crestTime / .58);
        if (unfold > 0) {
            const baseline = y + height / 2 + 12, span = width * .24 * unfold;
            c.save(); c.translate(x, baseline); c.globalAlpha = this.alpha * unfold;
            c.fillStyle = this.rgba(this.palette.accent, .85);
            c.beginPath(); c.moveTo(0,-4); c.lineTo(5,0); c.lineTo(0,4); c.lineTo(-5,0); c.closePath(); c.fill();
            for (const side of [-1, 1]) {
                c.beginPath(); c.moveTo(side * 9, -.9); c.lineTo(side * (9 + span), 0); c.lineTo(side * 9, .9); c.closePath(); c.fill();
            }
            c.restore();
        }
        if (!this.reduced && crestTime >= 0 && crestTime < 1.1) for (let i = 0; i < 20; i++) {
            const born = ROYAL_YAMB_CREST_SECONDS + this.seed(i + 98) * 0.25;
            const life = (t - born) / 0.85;
            if (life <= 0 || life >= 1) continue;
            const angle = this.seed(i + 102) * Math.PI * 2;
            const px = x + Math.cos(angle) * (width * 0.52 + life * 17);
            const py = y + Math.sin(angle) * (height * 0.57 + life * 12);
            const size = Math.sin(life * Math.PI) * (2.2 + this.seed(i + 108) * 2.5);
            this.line([[px - size, py], [px + size, py]], this.palette.accent, (1 - life) * 0.8, 1);
            this.line([[px, py - size], [px, py + size]], '248, 252, 255', (1 - life) * 0.8, 1);
        }
    }
}
