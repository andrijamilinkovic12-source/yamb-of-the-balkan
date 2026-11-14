/* Animated effect scenes. PNGs are physical components; motion, light and particles are drawn live. */
const LIVE_STAGE_EFFECT_DURATIONS = Object.freeze({
    ice_age: 6500, neon_pulse: 5000, thunder: 4500, balkan: 8600, fireworks: 7000,
    drones: 8200, cosmic_dust: 6000, ufo_abduction: 7500, dragon_fire: 5500, royal_yamb: 8000
});
const LIVE_STAGE_EFFECT_IDS = Object.freeze(Object.keys(LIVE_STAGE_EFFECT_DURATIONS));
const ICE_AGE_GROWTH_SECONDS = 2.8;
const ROYAL_YAMB_CREST_SECONDS = 3.2;
const THUNDER_STRIKE_SECONDS = 1.35;
const THUNDER_GROW_SECONDS = 0.13;
const THUNDER_COLORS = Object.freeze({ blue: '136, 195, 255', violet: '170, 151, 255', white: '244, 250, 255' });
const FIREWORK_COLORS = Object.freeze(['255, 198, 83', '255, 91, 111', '82, 224, 245', '129, 239, 158', '244, 249, 255']);
const FIREWORK_SHOW = Object.freeze([
    { launch: 0, rise: 0.72, kind: 'sphere', x: 0.28, y: 0.29, color: 1 },
    { launch: 0.52, rise: 0.7, kind: 'ring', x: 0.72, y: 0.28, color: 2 },
    { launch: 1.08, rise: 0.76, kind: 'willow', x: 0.49, y: 0.22, color: 0 },
    { launch: 1.83, rise: 0.68, kind: 'sphere', x: 0.23, y: 0.37, color: 3 },
    { launch: 2.36, rise: 0.72, kind: 'ring', x: 0.76, y: 0.35, color: 1 },
    { launch: 2.86, rise: 0.7, kind: 'sphere', x: 0.54, y: 0.29, color: 2 },
    { launch: 3.48, rise: 0.69, kind: 'sphere', x: 0.24, y: 0.26, color: 1, finale: true },
    { launch: 3.55, rise: 0.69, kind: 'ring', x: 0.76, y: 0.28, color: 3, finale: true },
    { launch: 3.81, rise: 0.74, kind: 'willow', x: 0.5, y: 0.3, color: 0, finale: true }
]);
const DRAGON_BREATH_RIG = Object.freeze({
    headPivot: [0.51597, 0.58412], jawPivot: [0.09735, 0.31559],
    upperMouth: [0.9697, 0.58294], lowerMouth: [0.94985, 0.55133], jawWidth: 0.55528
});
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

class LiveEffectsStage {
    static imageCache = new Map();

    static sources(type, theme) {
        const root = 'assets/effects/stage-v1/';
        const png = name => root + name + '.png?v=1';
        if (type === 'ice_age') return { frost: png('frost-corner') };
        if (type === 'balkan') return { trumpet: png('trumpet') };
        if (type === 'thunder') return { cloud: 'assets/effects/thunder-storm-v1/storm-cloud-v1.png' };
        if (type === 'dragon_fire') return {
            head: 'assets/effects/dragon-breath-v1/head-v1.png',
            jaw: 'assets/effects/dragon-breath-v1/jaw-v1.png', flame: png('flame')
        };
        if (type === 'drones') return { drone: `assets/effects/drones-v1/${theme}-drone-v1.png` };
        if (type === 'ufo_abduction') return { ship: png(`ufo-${theme}`) };
        if (type === 'royal_yamb') {
            const ducatRoot = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
            const version = ['easter', 'desert', 'severna'].includes(theme) ? 2 : 1;
            return {
                logo: theme === 'dark' ? 'assets/green-soft-clay/splash-title-soft-clay-v2.png?v=1'
                    : `assets/theme-packs/${theme}/splash-title-soft-clay-v1.png?v=1`,
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
            if (this.imageCache.size <= 7) break;
            if (key !== source && !/stage-v1\/(?:trumpet|flame|frost-corner)\.png/.test(key)) this.imageCache.delete(key);
        }
        return promise;
    }

    static async preload(type, theme) {
        const entries = await Promise.all(Object.entries(this.sources(type, theme))
            .map(async ([role, source]) => [role, await this.loadImage(source)]));
        return Object.fromEntries(entries);
    }

    constructor(owner, type) {
        this.owner = owner;
        this.type = type;
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
        this.images = await LiveEffectsStage.preload(this.type, this.theme);
        if (this.stopped || document.hidden || this.theme !== this.owner.getGoldRainThemeId()) return this.stop();
        const needed = Object.keys(LiveEffectsStage.sources(this.type, this.theme));
        if (needed.some(role => !this.images[role])) {
            console.warn(`Effect component unavailable: ${this.type}/${this.theme}`);
            return this.stop();
        }
        this.table = this.owner.getTargetTable?.() || document.querySelector('.player-table');
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
        this.scores = [...(this.table?.querySelectorAll?.('.score-btn.filled, .qa-board-grid span') || [])]
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
        if (!this.reduced) {
            const sound = { balkan: 'balkanTrumpet', drones: 'epicDroneShow', ufo_abduction: 'ufoAbduction' }[this.type];
            if (sound) window.app?.soundMgr?.[sound]?.();
        }
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
        this.iceAudioCleanup?.();
        this.iceAudioCleanup = null;
        this.royalAudioCleanup?.();
        this.royalAudioCleanup = null;
        this.dragonAudioCleanup?.();
        this.dragonAudioCleanup = null;
        this.fireworkAudioCleanups?.forEach(cleanup => cleanup());
        this.fireworkAudioCleanups?.clear();
        this.thunderAudioCleanup?.();
        this.thunderAudioCleanup = null;
        if (this.type === 'balkan') window.app?.soundMgr?.stopBalkanMusic?.(true);
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
            if (t >= ICE_AGE_GROWTH_SECONDS) this.once('ice-lock', () => window.app?.soundMgr?.iceAgeCrack?.());
        }
        if (progress <= 0) return;
        const front = Math.hypot(b.width, b.height) * 0.5 * progress;
        const radius = front + Math.min(front * 0.75, 32);
        this.shade(0.09);
        c.save(); c.beginPath(); c.rect(b.x, b.y, b.width, b.height); c.clip();
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
            const lockGlow = 1 - this.ease((t - ICE_AGE_GROWTH_SECONDS) / 0.42);
            this.glow(b.x + b.width / 2, b.y + b.height / 2, Math.min(b.width, b.height) * 0.27,
                '229, 250, 255', lockGlow * 0.32);
        }
        c.restore();
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

        const { cyan, pink } = NEON_PULSE_COLORS;
        const radius = Math.min(22, width * 0.09, height * 0.09);
        const perimeter = 2 * (width + height - 4 * radius) + 2 * Math.PI * radius;
        const rail = this.ctx.createLinearGradient(x, y, right, bottom);
        rail.addColorStop(0, this.rgba(cyan, 1));
        rail.addColorStop(0.37, this.rgba(cyan, 1));
        rail.addColorStop(0.63, this.rgba(pink, 1));
        rail.addColorStop(1, this.rgba(pink, 1));
        const scan = this.ctx.createLinearGradient(x, 0, right, 0);
        scan.addColorStop(0, this.rgba(cyan, 0));
        scan.addColorStop(0.12, this.rgba(cyan, 1));
        scan.addColorStop(0.5, this.rgba(NEON_PULSE_COLORS.white, 1));
        scan.addColorStop(0.88, this.rgba(pink, 1));
        scan.addColorStop(1, this.rgba(pink, 0));
        this.neonFrame = { x, y, width, height, radius, perimeter, rail, scan };
    }

    neon(t) {
        if (!this.neonFrame) return;
        const c = this.ctx;
        const { x, y, width, height, radius, perimeter, rail, scan } = this.neonFrame;
        const { cyan, pink, white } = NEON_PULSE_COLORS;
        const stroke = (color, weight, alpha) => {
            c.strokeStyle = color;
            c.lineWidth = weight;
            c.globalAlpha = alpha * this.alpha;
            c.stroke();
        };
        const framePath = inset => {
            c.beginPath();
            c.roundRect(x + inset, y + inset, width - 2 * inset, height - 2 * inset, Math.max(0, radius - inset));
        };

        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        framePath(5);
        stroke(rail, 1, 0.36);

        framePath(0);
        // The dark rail beneath the light keeps its silhouette on bright boards.
        stroke('#100d24', 10, 0.87);
        stroke(rail, 21, 0.08);
        stroke(rail, 12, 0.18);
        stroke(rail, 6, 0.44);
        stroke(rail, 2.6, 0.92);
        if (!this.reduced) {
            const length = Math.min(250, perimeter * 0.14);
            const lead = perimeter * (0.08 + t * 0.27);
            const trail = (size, head) => {
                c.setLineDash([size, perimeter - size]);
                c.lineDashOffset = size - head;
            };
            [cyan, pink].forEach((color, i) => {
                const head = lead + perimeter * 0.5 * i;
                trail(length, head);
                stroke(this.rgba(color, 1), 25, 0.15);
                stroke(this.rgba(color, 1), 11, 0.6);
                trail(length * 0.7, head);
                stroke(this.rgba(color, 1), 5.5, 0.97);
                trail(length * 0.32, head);
                stroke(this.rgba(white, 1), 2.1, 0.98);
            });
        }
        c.restore();

        if (this.reduced) return;
        const secondPass = t >= 2.52;
        const progress = (t - (secondPass ? 2.52 : 0.56)) / 1.68;
        if (progress <= 0 || progress >= 1) return;
        const beamY = y + height * (secondPass ? 1 - progress : progress);
        const strength = Math.sin(Math.PI * progress) * this.alpha;
        c.save();
        framePath(6);
        c.clip();
        c.fillStyle = scan;
        // A short falloff behind the scan leaves the score underneath readable.
        const direction = secondPass ? 1 : -1;
        for (let band = 1; band <= 12; band++) {
            c.globalAlpha = strength * 0.18 * (1 - band / 13) ** 1.5;
            c.fillRect(x, beamY + direction * band * 2, width, 2);
        }
        c.globalAlpha = strength * 0.85;
        c.fillRect(x, beamY - 0.75, width, 1.5);
        c.restore();
    }

    prepareThunder() {
        const w = this.width, h = this.height, b = this.board;
        this.thunderImpact = [b.x + b.width * 0.57, Math.min(h - 40, b.y + b.height * 0.62)];
        const start = [w * 0.43, h * 0.11], end = this.thunderImpact;
        let trunk = [start, end];
        const displacement = Math.min(w * 0.12, (end[1] - start[1]) * 0.15, 58);
        for (let depth = 0; depth < 6; depth++) {
            const split = [trunk[0]];
            for (let i = 1; i < trunk.length; i++) {
                const a = trunk[i - 1], b = trunk[i];
                split.push([(a[0] + b[0]) / 2 + (this.seed(i * 17 + depth * 97 + 81) - 0.5)
                    * displacement * Math.pow(0.55, depth), (a[1] + b[1]) / 2], b);
            }
            trunk = split;
        }
        this.thunderTrunk = trunk;
        this.thunderBranches = [];
        for (let branch = 0; branch < 6; branch++) {
            const origin = this.thunderTrunk[10 + branch * 8], side = branch % 2 ? 1 : -1;
            const length = Math.min(w * (0.16 + this.seed(branch + 51) * 0.1), h * 0.18);
            const points = Array.from({ length: 10 }, (_, i) => {
                const u = i / 9;
                return [Math.max(12, Math.min(w - 12, origin[0] + side * length * u
                    + Math.sin(u * Math.PI) * (this.seed(i + branch * 37) - 0.5) * length * 0.38)),
                origin[1] + length * u * 0.83 + Math.sin(u * Math.PI) * (this.seed(i + branch * 29 + 2) - 0.5) * 14];
            });
            this.thunderBranches.push(points);
            const fork = points[4];
            this.thunderBranches.push([fork, [fork[0] - side * length * 0.14, fork[1] + length * 0.14],
                [fork[0] - side * length * 0.09, fork[1] + length * 0.24],
                [fork[0] - side * length * 0.24, fork[1] + length * 0.39]]);
        }
        // Rasterize all glowing branches once; frames reveal and fade this cached layer.
        this.thunderBolt ||= document.createElement('canvas');
        const scale = Math.min(1, 1280 / w, 1280 / h);
        this.thunderBolt.width = Math.ceil(w * scale); this.thunderBolt.height = Math.ceil(h * scale);
        const c = this.thunderBolt.getContext('2d');
        c.setTransform(scale, 0, 0, scale, 0, 0);
        c.lineCap = 'round'; c.lineJoin = 'round';
        const stroke = (points, color, alpha, width) => {
            c.strokeStyle = this.rgba(color, alpha); c.lineWidth = width;
            c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
        };
        for (const points of this.thunderBranches) {
            c.shadowColor = this.rgba(THUNDER_COLORS.blue, 0.85); c.shadowBlur = 11;
            stroke(points, THUNDER_COLORS.blue, 0.65, 1.7);
            c.shadowBlur = 0; stroke(points, THUNDER_COLORS.white, 0.82, 0.65);
        }
        c.shadowColor = this.rgba(THUNDER_COLORS.violet, 0.8); c.shadowBlur = 25;
        stroke(this.thunderTrunk, THUNDER_COLORS.blue, 0.76, 4);
        c.shadowColor = this.rgba(THUNDER_COLORS.blue, 1); c.shadowBlur = 10;
        stroke(this.thunderTrunk, THUNDER_COLORS.blue, 0.95, 2.8);
        c.shadowBlur = 0; stroke(this.thunderTrunk, THUNDER_COLORS.white, 1, 1.6);
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
        this.thunderSparks = Array.from({ length: this.reduced ? 0 : this.mobile ? 48 : 76 }, (_, i) => {
            const angle = Math.PI + this.seed(i + 198) * Math.PI;
            const speed = 35 + this.seed(i + 29) * Math.min(w * 0.3, 130);
            return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 0.85 + this.seed(i + 73) * 0.8, size: 2.5 + this.seed(i + 36) * 3 };
        });
        this.thunderCloudHeight = Math.min(200, h * 0.25, w * 0.42);
        this.thunderClouds = [
            { x: w * 0.13, y: h * 0.035, size: 0.96, speed: 1.8, opacity: 0.64 },
            { x: w * 0.85, y: h * 0.045, size: 1.06, speed: -2.1, opacity: 0.67 },
            { x: w * 0.49, y: h * 0.075, size: 1, speed: 1.2, opacity: 0.88 }
        ];
        this.thunderCloudArcs = [0.34, 0.66].map((offset, index) => Array.from({ length: 9 }, (_, i) =>
            [w * (offset + i * 0.023), h * 0.1 + (this.seed(i + index * 43) - 0.5) * this.thunderCloudHeight * 0.16]));
        this.overlay.dataset.thunderBranches = String(this.thunderBranches.length);
    }

    thunder(t) {
        const c = this.ctx, calm = this.reduced;
        const age = calm ? 0.34 : t - THUNDER_STRIKE_SECONDS;
        const impactAge = age - THUNDER_GROW_SECONDS;
        const strength = calm ? 0.32 : age < 0 ? 0 : age < THUNDER_GROW_SECONDS
            ? 0.2 + 0.8 * this.ease(age / THUNDER_GROW_SECONDS) : Math.exp(-impactAge * 3.3);
        const charged = calm ? 0 : Math.exp(-Math.pow((t - 0.68) / 0.16, 2)) * 0.3
            + Math.exp(-Math.pow((t - 1.21) / 0.16, 2)) * 0.5;
        const flash = calm || impactAge < 0 ? 0 : Math.exp(-impactAge * 11);
        this.overlay.dataset.thunderPhase = calm ? 'holding' : t < THUNDER_STRIKE_SECONDS ? 'gathering'
            : impactAge < 0.65 ? 'strike' : t < 3.5 ? 'afterglow' : 'clearing';
        c.fillStyle = this.rgba('4, 8, 18', this.alpha * (calm ? 0.3 : 0.6));
        c.fillRect(0, 0, this.width, this.height);
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
        const cloudLight = Math.max(charged, flash * 0.68);
        for (const cloud of this.thunderClouds) {
            const height = this.thunderCloudHeight * cloud.size;
            const x = cloud.x + (calm ? 0 : Math.sin(t * 0.45) * cloud.speed * 4);
            const y = cloud.y + (calm ? 0 : Math.sin(t * 0.36 + cloud.size) * 3);
            this.sprite(this.images.cloud, x, y, height * 3, 0, cloud.opacity, 1, height);
            if (cloudLight > 0.01) {
                c.save(); c.globalCompositeOperation = 'screen';
                this.sprite(this.thunderGlow, x, y + height * 0.15, height * 1.55, 0, cloudLight * 0.42, 1, height * 0.65);
                c.restore();
            }
        }
        if (!calm) for (let i = 0; i < this.thunderCloudArcs.length; i++) {
            const pulse = Math.exp(-Math.pow((t - (i ? 1.19 : 0.66)) / 0.095, 2));
            if (pulse > 0.02) this.line(this.thunderCloudArcs[i], THUNDER_COLORS.blue, pulse * 0.48, 0.9);
        }
        if (!calm && impactAge >= 0) {
            this.once('thunder-impact', () => { if (impactAge < 0.16) window.app?.vibrate?.([35, 40, 65]); });
            const [x, y] = this.thunderImpact;
            c.save(); c.globalCompositeOperation = 'screen';
            this.sprite(this.thunderGlow, x, y, Math.min(this.width * 0.72, 300), 0, flash * 0.83);
            if (impactAge < 1.1) {
                const radius = 8 + Math.min(this.width * 0.38, 170) * this.ease(impactAge / 1.1);
                c.beginPath(); c.ellipse(x, y, radius, radius * 0.31, 0, 0, Math.PI * 2);
                c.strokeStyle = this.rgba(THUNDER_COLORS.blue, (1 - impactAge / 1.1) * 0.6 * this.alpha);
                c.lineWidth = 1.3; c.stroke();
            }
            for (const spark of this.thunderSparks) {
                if (impactAge > spark.life) continue;
                const at = time => [x + spark.vx * time, y + spark.vy * time + 45 * time * time];
                const point = at(impactAge), tail = at(Math.max(0, impactAge - 0.055));
                const opacity = Math.pow(1 - impactAge / spark.life, 1.3);
                this.line([tail, point], THUNDER_COLORS.blue, opacity * 0.7, 0.9);
                this.sprite(this.thunderGlow, point[0], point[1], spark.size, 0, opacity);
            }
            c.restore();
        }
    }

    wedding(t, p) {
        this.shade(0.08);
        const beat = Math.sin(t * Math.PI * 5);
        const entry = this.ease(p / 0.14) * this.ease((1 - p) / 0.15);
        const instrumentWidth = Math.min(146, this.width * 0.31);
        const edge = instrumentWidth * 0.27;
        for (let i = 0; i < 4; i++) {
            const left = i % 2 === 0;
            const x = left ? -instrumentWidth * (1 - entry) + edge : this.width + instrumentWidth * (1 - entry) - edge;
            const y = this.height * (i < 2 ? 0.26 : 0.65) + (this.reduced ? 0 : Math.sin(t * 8 + i) * 5);
            this.sprite(this.images.trumpet, x, y, instrumentWidth, (left ? -1 : 1) * beat * 0.035,
                entry, left ? 1 : -1);
            for (let wave = 0; wave < 3 && !this.reduced; wave++) {
                const phase = (t * 1.9 + wave / 3) % 1;
                const radius = 12 + phase * 45;
                this.ctx.beginPath();
                this.ctx.strokeStyle = this.rgba(this.palette.main, (1 - phase) * 0.35 * this.alpha);
                this.ctx.lineWidth = 1.5;
                this.ctx.arc(x + (left ? 1 : -1) * instrumentWidth * 0.42, y - 15, radius,
                    left ? -0.7 : Math.PI - 0.7, left ? 0.7 : Math.PI + 0.7); this.ctx.stroke();
            }
        }
        // A narrow woven band nods to a Balkan tablecloth while leaving the game readable.
        this.ctx.fillStyle = this.rgba(this.palette.shade, 0.14 * this.alpha);
        this.ctx.fillRect(0, this.height * 0.91, this.width, this.height * 0.09);
        for (let x = 0; x < this.width; x += 12) this.line([[x, this.height * 0.91], [x + 12, this.height]], this.palette.main, 0.12, 1);
        for (let i = 0; i < (this.reduced ? 15 : this.mobile ? 65 : 105); i++) {
            const x = (this.seed(i + 5) * this.width + Math.sin(t * 1.8 + i) * 18 + this.width) % this.width;
            const y = ((t * (65 + this.seed(i + 33) * 90) + this.seed(i + 72) * this.height * 2) % (this.height + 50)) - 30;
            this.ctx.save(); this.ctx.translate(x, y); this.ctx.rotate(t * 2 + i);
            this.ctx.fillStyle = this.rgba(i % 3 ? this.palette.main : this.palette.accent, 0.65 * this.alpha);
            this.ctx.fillRect(-2, -4, 3.5 * Math.cos(t * 4 + i), 8); this.ctx.restore();
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
            const x = cue.x * this.width, y = cue.y * this.height;
            const willow = cue.kind === 'willow', ring = cue.kind === 'ring';
            const duration = willow ? 2.25 : ring ? 1.85 : 1.75;
            const count = this.reduced ? 26 : Math.round((this.mobile ? (willow ? 112 : ring ? 80 : 96)
                : (willow ? 176 : ring ? 120 : 144)) * (cue.finale ? 1.15 : 1));
            const radius = Math.max(20, Math.min(this.width * (cue.finale && willow ? 0.34 : 0.26),
                this.height * (cue.finale && willow ? 0.3 : 0.23), x - 12, this.width - x - 12, y - 16));
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
                    size: 4.2 + seed * 3.1,
                    glint: j % 23 === 0,
                    tail: willow ? 0.22 + seed * 0.11 : ring ? 0.08 : 0.12,
                    phase: this.seed(j + index * 47 + 14) * Math.PI * 2
                };
            });
            return { ...cue, index, x, y, radius, particles, duration,
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

    fireworks(t) {
        const c = this.ctx;
        c.fillStyle = this.rgba('3, 6, 14', this.alpha * (this.reduced ? 0.3 : 0.66));
        c.fillRect(0, 0, this.width, this.height);
        this.overlay.dataset.fireworksPhase = this.reduced ? 'holding' : t < 3.48 ? 'launches' : t < 5.25 ? 'finale' : 'embers';
        let active = 0;
        c.save(); c.globalCompositeOperation = 'screen';
        for (const shell of this.reduced ? this.fireworkShells.slice(0, 3) : this.fireworkShells) {
            const age = this.reduced ? shell.rise + 0.7 : t - shell.launch;
            if (age < 0 || age > shell.rise + shell.duration) continue;
            if (age < shell.rise) {
                this.once('firework-launch-' + shell.index, () => {
                    if (age < 0.13) this.fireworkSound('fireworkLaunch', shell.rise, shell.index);
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
                if (life < 0.15) this.fireworkSound('fireworkExplode', shell.kind, shell.index, shell.finale ? 0.78 : 1);
            });
            for (const spark of shell.particles) {
                if (life >= spark.ttl) continue;
                const [x, y] = this.fireworkPoint(shell, spark, life);
                if (x < -20 || x > this.width + 20 || y < -20 || y > this.height + 20) continue;
                const twinkle = this.reduced ? 1 : 0.82 + Math.sin(life * 17 + spark.phase) * 0.18;
                const fade = Math.pow(1 - life / spark.ttl, 0.38) * this.ease((spark.ttl - life) / 0.34);
                const alpha = fade * twinkle;
                const trail = [3, 2, 1, 0].map(step => this.fireworkPoint(shell, spark, Math.max(0, life - spark.tail * step / 3)));
                this.line(trail, FIREWORK_COLORS[spark.color], alpha * (shell.kind === 'willow' ? 0.78 : 0.58),
                    shell.kind === 'willow' ? 1.15 : 0.95);
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
        this.droneTargets = DRONE_FORMATION.map(target => ({ ...target, size, ratio,
            x: this.width / 2 + target.column * size * 1.25,
            y: centerY + (target.row - 0.5) * rowSpacing
        }));
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
        if (pulse > 0) this.glow(this.width / 2, this.height * 0.405, this.droneTargets[0].size * 2.4,
            this.palette.main, pulse * 0.31);

        // Draw the beams behind all five bodies so the PNG details stay readable.
        for (const { lx, ly, width, column, light } of drones) {
            if (light < 0.02 || this.reduced) continue;
            const depth = width * (1.14 + pulse * 0.65);
            const spread = width * (0.22 + pulse * 0.14);
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
        for (const { px, py, lx, ly, width, tilt, light } of drones) {
            this.sprite(this.images.drone, px, py, width, tilt);
            this.sprite(this.droneLight, lx, ly, width * (0.29 + pulse * 0.35), 0, 0.08 + light * 0.84);
            this.dot(lx, ly, Math.max(1, width * 0.021), '255, 254, 248', light * 0.9);
        }
    }

    prepareDust() {
        const atlas = this.dustAtlas = document.createElement('canvas');
        const cell = 24;
        atlas.width = atlas.height = cell * 3;
        const c = atlas.getContext('2d');
        const colors = [this.palette.main, this.palette.accent, '238, 248, 255'];
        for (const [tone, color] of colors.entries()) {
            for (let shape = 0; shape < 3; shape++) {
                c.save();
                c.translate((tone + 0.5) * cell, (shape + 0.5) * cell);
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
        }

        const count = this.reduced ? 45 : this.mobile ? 420 : 720;
        return Array.from({ length: count }, (_, i) => {
            const layer = i % 3;
            const variety = this.seed(i + 217);
            const shape = variety < 0.69 ? 0 : variety < 0.86 ? 1 : variety < 0.92 ? 2 : 3;
            const tone = shape === 2 ? 2 : i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : 0;
            return {
                angle: this.seed(i + 22) * Math.PI * 2,
                radius: 0.08 + this.seed(i + 74) * 0.75,
                speed: this.reduced ? 0 : 0.1 + layer * 0.09,
                shape, tone, color: colors[tone],
                size: [1.5 + layer * 1.1, 6.8 + layer * 2.7, 4.8 + layer * 1.7, 4 + layer * 1.8][shape]
            };
        });
    }

    dust(t) {
        const c = this.ctx;
        c.fillStyle = this.rgba('4, 7, 13', (this.reduced ? 0.3 : 0.6) * this.alpha);
        c.fillRect(0, 0, this.width, this.height);
        for (let cloud = 0; cloud < 3; cloud++) {
            const x = this.width * (0.2 + cloud * 0.3) + Math.sin(t * 0.28 + cloud * 2) * this.width * 0.18;
            const y = this.height * (0.25 + cloud * 0.22) + Math.cos(t * 0.24 + cloud) * 45;
            this.glow(x, y, Math.min(this.width, this.height) * 0.7,
                cloud === 1 ? this.palette.accent : this.palette.main, 0.085);
        }
        const particles = this.dustParticles ||= this.prepareDust();
        const cell = this.dustAtlas.width / 3;
        for (const [i, particle] of particles.entries()) {
            const angle = particle.angle + t * particle.speed;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const x = this.width / 2 + cos * particle.radius * this.width * 0.78 + Math.sin(t * 0.5 + i) * 8;
            const y = this.height / 2 + sin * particle.radius * this.height * 0.75;
            const { size, shape } = particle;
            if (x < -size || x > this.width + size || y < -size || y > this.height + size) continue;
            const alpha = 0.32 + (Math.sin(t + i) + 1) * 0.2;
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
        const beam = this.ease((p - 0.18) / 0.1) * this.ease((0.83 - p) / 0.1);
        if (beam > 0) {
            const bottom = b.bottom, spread = b.width * 0.51;
            const gradient = this.ctx.createLinearGradient(x, y, x, bottom);
            gradient.addColorStop(0, this.rgba(this.palette.accent, 0.32 * beam * this.alpha));
            gradient.addColorStop(1, this.rgba(this.palette.main, 0.025 * beam * this.alpha));
            this.ctx.fillStyle = gradient; this.ctx.beginPath(); this.ctx.moveTo(x - 17, y);
            this.ctx.lineTo(x + 17, y); this.ctx.lineTo(x + spread, bottom); this.ctx.lineTo(x - spread, bottom);
            this.ctx.closePath(); this.ctx.fill();
            for (let i = 0; i < (this.reduced ? 12 : 60); i++) {
                const life = (t * (0.22 + this.seed(i + 9) * 0.2) + this.seed(i + 15)) % 1;
                const py = bottom - (bottom - y) * life;
                const px = x + Math.sin(life * 8 + i) * spread * (1 - life) * 0.75;
                this.dot(px, py, 0.7 + this.seed(i + 52), this.palette.main, beam * 0.55);
            }
            this.scores.forEach((score, i) => {
                const life = this.clamp((t - 1.7 - i * 0.055) / 2.75);
                if (!life || life >= 1 || this.reduced) return;
                if (!this.mutedNodes.has(score.node)) { score.node.classList.add('live-ufo-score-muted'); this.mutedNodes.add(score.node); }
                const travel = this.ease(life), sx = score.rect.left + score.rect.width / 2, sy = score.rect.top + score.rect.height / 2;
                const px = sx + (x - sx) * travel + Math.sin(life * 9 + i) * 18 * Math.sin(life * Math.PI);
                const py = sy + (y - sy) * travel;
                this.ctx.fillStyle = this.rgba(this.palette.accent, (1 - life) * this.alpha);
                this.ctx.font = `700 ${12 * (1 - life * 0.6)}px Arial`; this.ctx.textAlign = 'center';
                this.ctx.fillText(score.text, px, py);
            });
        }
        this.sprite(this.images.ship, x, y - width * 0.07, width, this.reduced ? 0 : Math.sin(t * 1.4) * 0.035);
        this.glow(x, y + 9, 32, this.palette.main, beam * 0.25);
    }

    prepareDragonBreath() {
        const width = Math.min(470, this.width * 0.67, this.height * 0.56);
        const image = this.images.head;
        const jaw = this.images.jaw;
        this.dragonLayout = {
            width, height: width * (image.naturalHeight || image.height) / (image.naturalWidth || image.width),
            jawHeight: width * DRAGON_BREATH_RIG.jawWidth * (jaw.naturalHeight || jaw.height) / (jaw.naturalWidth || jaw.width),
            left: this.mobile ? -width * 0.16 : this.width * 0.035,
            top: Math.max(50, this.height * 0.095)
        };
        if (!this.dragonHeat) {
            const heat = this.dragonHeat = document.createElement('canvas');
            heat.width = 320; heat.height = 96;
            const ctx = heat.getContext('2d');
            const pixels = ctx.createImageData(heat.width, heat.height);
            for (let px = 0; px < heat.width; px++) {
                const progress = px / (heat.width - 1), spread = 3 + progress * 43;
                for (let py = 0; py < heat.height; py++) {
                    const distance = (py - 47.5) / spread;
                    const core = Math.exp(-distance * distance * 3.5);
                    const at = (py * heat.width + px) * 4;
                    pixels.data[at] = 255;
                    pixels.data[at + 1] = 155 + core * 85 - progress * 55;
                    pixels.data[at + 2] = 18 + core * 100 * (1 - progress);
                    pixels.data[at + 3] = Math.round(core * Math.pow(1 - progress, 0.8) * this.ease(progress / 0.04) * 230);
                }
            }
            ctx.putImageData(pixels, 0, 0);
        }
        this.dragonParticles ||= Array.from({ length: this.mobile ? 52 : 76 }, (_, i) => ({
            born: 1.5 + i / (this.mobile ? 52 : 76) * 2.45,
            duration: 0.44 + this.seed(i + 37) * 0.3,
            spread: this.seed(i + 89) * 2 - 1, turn: this.seed(i + 71) * 0.28 - 0.14,
            size: 0.8 + this.seed(i + 61) * 0.5
        }));
    }

    dragonPose(t) {
        const rig = DRAGON_BREATH_RIG, layout = this.dragonLayout;
        const entry = this.reduced ? 1 : this.ease((t - 0.05) / 0.85);
        const leave = this.reduced ? 0 : this.ease((t - 4.55) / 0.8);
        const inhale = this.reduced ? 0 : this.ease((t - 0.8) / 0.65);
        const breath = this.reduced ? 0.22 : this.ease((t - 1.5) / 0.3) * this.ease((4.15 - t) / 0.55);
        const angle = this.reduced ? 0.08 : 0.11 - inhale * 0.07 + breath * 0.14;
        const jawAngle = this.reduced ? 0.1 : 0.025 + inhale * (1 - this.ease((t - 4.05) / 0.38)) * 0.3;
        const x = layout.left + layout.width * rig.headPivot[0] - (1 - entry + leave) * layout.width * 1.25
            - inhale * (1 - breath) * layout.width * 0.025;
        const y = layout.top + layout.height * rig.headPivot[1] - inhale * (1 - breath) * 5;
        const jawWidth = layout.width * rig.jawWidth;
        const upper = [(rig.upperMouth[0] - rig.headPivot[0]) * layout.width,
            (rig.upperMouth[1] - rig.headPivot[1]) * layout.height];
        const lower = [(rig.lowerMouth[0] - rig.jawPivot[0]) * jawWidth,
            (rig.lowerMouth[1] - rig.jawPivot[1]) * layout.jawHeight];
        const lipX = lower[0] * Math.cos(jawAngle) - lower[1] * Math.sin(jawAngle);
        const lipY = lower[0] * Math.sin(jawAngle) + lower[1] * Math.cos(jawAngle);
        const mouthX = (upper[0] + lipX) / 2, mouthY = (upper[1] + lipY) / 2;
        const mouth = { x: x + mouthX * Math.cos(angle) - mouthY * Math.sin(angle),
            y: y + mouthX * Math.sin(angle) + mouthY * Math.cos(angle) };
        const dx = this.width * 0.9 - mouth.x, dy = this.height * 0.72 - mouth.y;
        return { x, y, mouth, angle, jawAngle, jawWidth, entry, leave, breath,
            direction: Math.atan2(dy, dx), reach: Math.hypot(dx, dy) };
    }

    fire(t) {
        const c = this.ctx, layout = this.dragonLayout, rig = DRAGON_BREATH_RIG;
        const pose = this.dragonPose(t);
        const { x, y, mouth, angle, jawAngle, jawWidth, entry, leave, breath, direction, reach } = pose;
        this.overlay.dataset.dragonPhase = this.reduced ? 'holding' : t < 0.8 ? 'arrival'
            : t < 1.5 ? 'inhale' : t < 4.15 ? 'breath' : t < 4.55 ? 'embers' : 'exit';
        this.overlay.dataset.mouth = mouth.x.toFixed(1) + ',' + mouth.y.toFixed(1);
        this.overlay.dataset.jawAngle = jawAngle.toFixed(3);
        if (!this.reduced && t >= 0.6) this.once('dragon-breath', () => {
            this.dragonAudioCleanup = window.app?.soundMgr?.dragonBreath?.(Math.max(0, 1.5 - t));
        });
        c.fillStyle = this.rgba('8, 10, 14', this.alpha * (this.reduced ? 0.24 : 0.56));
        c.fillRect(0, 0, this.width, this.height);
        if (breath > 0) {
            const wash = c.createLinearGradient(mouth.x, mouth.y, this.width * 0.9, this.height);
            wash.addColorStop(0, this.rgba('255, 176, 63', breath * this.alpha * 0.1));
            wash.addColorStop(0.7, this.rgba('244, 105, 29', breath * this.alpha * 0.075));
            wash.addColorStop(1, 'rgba(255,100,20,0)');
            c.fillStyle = wash; c.fillRect(0, 0, this.width, this.height);
            c.save(); c.translate(mouth.x, mouth.y); c.rotate(direction);
            const length = reach * (this.reduced ? 0.5 : 0.6 + breath * 0.4);
            const spread = reach * 0.16;
            c.globalAlpha = breath * this.alpha * 0.82;
            c.drawImage(this.dragonHeat, 0, -spread, length, spread * 2);
            c.restore();
            this.glow(mouth.x, mouth.y, layout.width * 0.07, '255, 183, 69', breath * 0.6);
        }

        if (!this.reduced) this.dragonParticles.forEach((particle, i) => {
            const life = (t - particle.born) / particle.duration;
            if (life <= 0 || t > particle.born + particle.duration + 0.65) return;
            const emitted = this.dragonPose(particle.born);
            const progress = life * (0.78 + particle.size * 0.2);
            const distance = emitted.reach * progress;
            const lateral = Math.sin(life * 8 + i) * emitted.reach * 0.07 * life * particle.spread;
            const px = emitted.mouth.x + Math.cos(emitted.direction) * distance - Math.sin(emitted.direction) * lateral;
            const py = emitted.mouth.y + Math.sin(emitted.direction) * distance + Math.cos(emitted.direction) * lateral;
            const size = emitted.reach * (0.08 + life * 0.24) * particle.size;
            if (life < 1) this.sprite(this.images.flame, px, py, size * 0.5,
                emitted.direction + Math.PI / 2 + particle.turn, Math.sin(life * Math.PI) * 0.78, 1, size);
            const sparkLife = (t - particle.born) / (particle.duration + 0.65);
            if (sparkLife < 1) {
                const sx = emitted.mouth.x + Math.cos(emitted.direction) * emitted.reach * sparkLife
                    + particle.spread * sparkLife * emitted.reach * 0.2;
                const sy = emitted.mouth.y + Math.sin(emitted.direction) * emitted.reach * sparkLife
                    - sparkLife * sparkLife * 60;
                this.line([[sx, sy], [sx - 2, sy + 5]], i % 4 ? '255, 195, 81' : this.palette.accent,
                    Math.sin(sparkLife * Math.PI) * 0.9, 1.1);
            }
        });
        if (this.reduced) this.sprite(this.images.flame, mouth.x + Math.cos(direction) * reach * 0.22,
            mouth.y + Math.sin(direction) * reach * 0.22, reach * 0.16, direction + Math.PI / 2, 0.3, 1, reach * 0.35);

        // Both parts share the cheek pivot; the flame origin is the moving lip midpoint.
        c.save(); c.translate(x, y); c.rotate(angle); c.globalAlpha = this.alpha * entry;
        c.save(); c.rotate(jawAngle);
        c.drawImage(this.images.jaw, -jawWidth * rig.jawPivot[0], -layout.jawHeight * rig.jawPivot[1], jawWidth, layout.jawHeight);
        c.restore();
        c.drawImage(this.images.head, -layout.width * rig.headPivot[0], -layout.height * rig.headPivot[1], layout.width, layout.height);
        c.restore();
    }

    prepareRoyalScene() {
        if (!this.royalLogo) {
            const image = this.images.logo;
            const source = document.createElement('canvas');
            source.width = Math.min(1024, image.naturalWidth || image.width);
            source.height = Math.round(source.width * (image.naturalHeight || image.height) / (image.naturalWidth || image.width));
            const c = source.getContext('2d', { willReadFrequently: true });
            c.drawImage(image, 0, 0, source.width, source.height);
            const pixels = c.getImageData(0, 0, source.width, source.height).data;
            let left = source.width, right = 0, top = source.height, bottom = 0;
            for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
                if (pixels[(y * source.width + x) * 4 + 3] < 12) continue;
                left = Math.min(left, x); right = Math.max(right, x);
                top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
            const logo = this.royalLogo = document.createElement('canvas');
            logo.width = Math.max(1, right - left + 1);
            logo.height = Math.max(1, bottom - top + 1);
            logo.getContext('2d').drawImage(source, left, top, logo.width, logo.height, 0, 0, logo.width, logo.height);
            this.royalShine = document.createElement('canvas');
            this.royalShine.width = logo.width; this.royalShine.height = logo.height;

            const beam = this.royalBeam = document.createElement('canvas');
            beam.width = 160; beam.height = 640;
            const bc = beam.getContext('2d');
            const light = bc.createImageData(beam.width, beam.height);
            const color = this.palette.accent.split(',').map(Number);
            for (let py = 0; py < beam.height; py++) {
                const length = py / (beam.height - 1);
                const spread = 80 * (1 - length) + 4 * length;
                const brightness = this.ease(length / 0.36) * (0.45 + length * 0.2);
                for (let px = 0; px < beam.width; px++) {
                    const across = (px - 79.5) / spread;
                    const alpha = Math.exp(-across * across * 5) * brightness;
                    const at = (py * beam.width + px) * 4;
                    for (let channel = 0; channel < 3; channel++) light.data[at + channel] = 248 * 0.6 + color[channel] * 0.4;
                    light.data[at + 3] = Math.round(alpha * 255);
                }
            }
            bc.putImageData(light, 0, 0);
            this.royalCoins = Array.from({ length: this.mobile ? 84 : 124 }, (_, i) => ({
                side: i % 2 ? 1 : -1, pose: i % 3,
                delay: 1.2 + this.seed(i + 8) * 2.85,
                duration: 2.8 + this.seed(i + 15) * 0.72,
                lift: 0.76 + this.seed(i + 29) * 0.17,
                arc: 0.15 + this.seed(i + 45) * 0.14,
                size: (this.mobile ? 15 : 21) + this.seed(i + 66) * (this.mobile ? 12 : 15)
            }));
        }
        const ratio = this.royalLogo.height / this.royalLogo.width;
        const width = Math.min(660, this.width * 0.88, this.height * 0.38 / ratio);
        this.royalLayout = { x: this.width / 2, y: this.height * 0.385, width, height: width * ratio };
    }

    royal(t) {
        const c = this.ctx;
        const layout = this.royalLayout;
        const { x, y } = layout;
        const entry = this.reduced ? 1 : this.ease((t - 0.6) / 1.05);
        const crestTime = t - ROYAL_YAMB_CREST_SECONDS;
        const crest = this.reduced ? 0 : this.ease(crestTime / 0.12) * (1 - this.ease((crestTime - 0.12) / 0.75));
        const width = layout.width * (0.94 + entry * 0.06);
        const height = width * this.royalLogo.height / this.royalLogo.width;
        const logoY = y + (1 - entry) * 18;
        this.overlay.dataset.ceremony = this.reduced ? 'holding' : t < 1.65 ? 'arrival'
            : crestTime >= 0 && crestTime < 0.9 ? 'crest' : t > 6.8 ? 'exit' : 'holding';
        if (!this.reduced && t >= 0.6) this.once('royal-fanfare', () => {
            this.royalAudioCleanup = window.app?.soundMgr?.royalFanfare?.(Math.max(0, ROYAL_YAMB_CREST_SECONDS - t));
        });
        c.fillStyle = this.rgba('5, 8, 14', this.alpha * (this.reduced ? 0.4 : 0.64));
        c.fillRect(0, 0, this.width, this.height);

        c.save(); c.globalCompositeOperation = 'screen';
        for (let i = 0; i < 4; i++) {
            const side = i % 2 ? 1 : -1;
            const outer = i < 2 ? 1 : 0.72;
            const originX = this.width * (0.5 + side * 0.43 * outer);
            const originY = this.height * 0.94;
            const sweep = this.reduced ? 0 : Math.sin(t * 0.53 + i * 1.9) * (1 - crest) * this.width * 0.12;
            const aimX = x - side * width * 0.16 + sweep;
            const aimY = y - height * 0.65;
            const length = Math.hypot(aimX - originX, aimY - originY) * 1.35;
            c.save(); c.translate(originX, originY);
            c.rotate(Math.atan2(aimY - originY, aimX - originX) + Math.PI / 2);
            c.globalAlpha = this.alpha * (this.reduced ? 0.5 : this.ease((t - i * 0.08) / 0.8)) * (0.74 + crest * 0.26);
            c.drawImage(this.royalBeam, -width * 0.18, -length, width * 0.36, length);
            c.restore();
        }
        c.restore();

        const poses = [this.images.coin, this.images.coinLeft, this.images.coinRight];
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
        this.sprite(this.royalLogo, x, logoY, width, 0, entry, 1, height);

        if (!this.reduced && crestTime >= 0 && crestTime < 0.95) {
            const shine = this.royalShine.getContext('2d');
            const w = this.royalShine.width, h = this.royalShine.height;
            shine.globalCompositeOperation = 'source-over'; shine.clearRect(0, 0, w, h);
            const position = (crestTime / 0.95 * 1.5 - 0.25) * w;
            const band = shine.createLinearGradient(position - w * 0.16, 0, position + w * 0.16, h * 0.25);
            band.addColorStop(0, 'rgba(255,255,255,0)');
            band.addColorStop(0.5, 'rgba(255,255,255,0.62)');
            band.addColorStop(1, 'rgba(255,255,255,0)');
            shine.fillStyle = band; shine.fillRect(0, 0, w, h);
            shine.globalCompositeOperation = 'destination-in'; shine.drawImage(this.royalLogo, 0, 0);
            this.sprite(this.royalShine, x, logoY, width, 0, entry, 1, height);
        }
        if (!this.reduced) for (let i = 0; i < 20; i++) {
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
