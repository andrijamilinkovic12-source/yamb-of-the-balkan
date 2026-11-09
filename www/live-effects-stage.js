/* Animated effect scenes. PNGs are physical components; motion, light and particles are drawn live. */
const LIVE_STAGE_EFFECT_DURATIONS = Object.freeze({
    ice_age: 6500, neon_pulse: 5000, thunder: 4500, balkan: 8600, fireworks: 7000,
    drones: 8200, cosmic_dust: 6000, ufo_abduction: 7500, dragon_fire: 5500, royal_yamb: 8000
});
const LIVE_STAGE_EFFECT_IDS = Object.freeze(Object.keys(LIVE_STAGE_EFFECT_DURATIONS));
const ICE_AGE_GROWTH_SECONDS = 2.8;
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
        if (type === 'dragon_fire') return { flame: png('flame') };
        if (type === 'drones') return { drone: `assets/effects/drones-v1/${theme}-drone-v1.png` };
        if (type === 'ufo_abduction') return { ship: png(`ufo-${theme}`) };
        if (type === 'royal_yamb') return {
            logo: theme === 'dark' ? 'assets/green-soft-clay/splash-title-soft-clay-v2.png?v=1'
                : `assets/theme-packs/${theme}/splash-title-soft-clay-v1.png?v=1`,
            coin: theme === 'dark' ? 'assets/green-soft-clay/canonical/ducat/ducat-particle-v1.png?v=1'
                : `assets/theme-packs/${theme}/canonical/ducat/ducat-particle-v${['easter', 'desert', 'severna'].includes(theme) ? 2 : 1}.png`
        };
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
            const sound = { balkan: 'balkanTrumpet', drones: 'epicDroneShow', ufo_abduction: 'ufoAbduction',
                royal_yamb: 'trophy' }[this.type];
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

    thunder(t) {
        this.shade(0.2);
        const b = this.board;
        [0.65, 1.8, 3.05].forEach((strike, index) => {
            const age = t - strike;
            if (age < 0 || age > 0.58) return;
            const intensity = this.reduced ? 0.1 : Math.exp(-age * 9) + (age > 0.13 ? Math.exp(-(age - 0.13) * 20) * 0.5 : 0);
            const x = b.x + b.width * (0.25 + this.seed(index + 3) * 0.5);
            const endY = b.y + b.height * (0.25 + this.seed(index + 8) * 0.45);
            const points = Array.from({ length: 18 }, (_, step) => [x + (this.seed(step * 3 + index * 31) - 0.5) * 44 * Math.sin(step / 17 * Math.PI), endY * step / 17]);
            this.line(points, this.palette.main, intensity * 0.27, 12);
            this.line(points, this.palette.main, intensity * 0.8, 4);
            this.line(points, '248, 250, 255', intensity, 1.3);
            for (let branch = 0; branch < 3; branch++) {
                const origin = points[5 + branch * 3];
                this.line([origin, [origin[0] + (branch % 2 ? -28 : 32), origin[1] + 20],
                    [origin[0] + (branch % 2 ? -47 : 54), origin[1] + 68]], this.palette.main, intensity * 0.6, 1.2);
            }
            this.glow(x, endY, 110, this.palette.main, intensity * 0.55);
            if (!this.reduced) this.once(`thunder-${index}`, () => {
                if (index === 0) window.app?.soundMgr?.thunder?.();
                window.app?.vibrate?.([30, 35, 65]);
            });
        });
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

    fireworks(t) {
        this.shade(0.25);
        const count = this.reduced ? 2 : this.mobile ? 9 : 12;
        for (let i = 0; i < count; i++) {
            const launch = i * (this.reduced ? 0.65 : 0.57);
            const age = t - launch;
            if (age < 0 || age > 2.65) continue;
            const x = this.width * (0.14 + this.seed(i + 9) * 0.72);
            const y = this.height * (0.15 + this.seed(i + 45) * 0.38);
            const color = i % 2 ? this.palette.accent : this.palette.main;
            if (age < 0.64) {
                const rise = this.ease(age / 0.64);
                const rocketY = this.height + 20 + (y - this.height - 20) * rise;
                this.line([[x - 6, rocketY + 45], [x, rocketY]], color, 0.55, 1.8);
                this.glow(x, rocketY, 12, color, 0.8);
                continue;
            }
            const life = age - 0.64;
            if (!this.reduced && i < 4) this.once(`firework-${i}`, () => window.app?.soundMgr?.fireworkExplode?.());
            const sparks = this.reduced ? 15 : this.mobile ? 56 : 80;
            for (let j = 0; j < sparks; j++) {
                const angle = j * Math.PI * 2 / sparks + this.seed(i + j) * 0.1;
                const speed = 65 + this.seed(i * 99 + j) * Math.min(200, this.width * 0.52);
                const radius = speed * (1 - Math.exp(-life * 1.9));
                const fall = life * life * 31;
                const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius + fall;
                const alpha = Math.max(0, 1 - life / 1.9) ** 1.2;
                this.line([[px - Math.cos(angle) * (8 + life * 3), py - Math.sin(angle) * 8 - life * 4], [px, py]], color, alpha * 0.75, 1.2);
                this.dot(px, py, 0.7 + this.seed(j + 3) * 0.8, color, alpha);
                if (j % 9 === 0) this.glow(px, py, 6, color, alpha * 0.2);
            }
            this.glow(x, y, 58, color, Math.exp(-life * 9) * 0.5);
        }
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

    fire(t, p) {
        this.shade(0.1);
        const strength = this.ease(p / 0.15) * this.ease((1 - p) / 0.27);
        const count = this.reduced ? 7 : this.mobile ? 22 : 35;
        const base = this.ctx.createLinearGradient(0, this.height * 0.48, 0, this.height);
        base.addColorStop(0, 'rgba(235,95,25,0)');
        base.addColorStop(0.7, this.rgba('235, 95, 25', strength * this.alpha * 0.12));
        base.addColorStop(1, this.rgba('255, 170, 65', strength * this.alpha * 0.36));
        this.ctx.fillStyle = base; this.ctx.fillRect(0, this.height * 0.48, this.width, this.height * 0.52);
        for (let i = 0; i < count; i++) {
            const breath = 0.75 + Math.sin(t * (2.2 + this.seed(i + 9)) + i * 2) * 0.22;
            const x = (i + 0.5) / count * this.width + Math.sin(t * 2 + i) * 18;
            const height = (this.height * (0.27 + this.seed(i + 84) * 0.4)) * strength * breath;
            const y = this.height + 30 - height / 2;
            this.sprite(this.images.flame, x, y, height * 0.5, Math.sin(t * 2 + i) * 0.07,
                strength * (this.reduced ? 0.14 : 0.53), 1, height);
        }
        this.glow(this.width / 2, this.height + 20, this.width * 0.95, '244, 111, 37', strength * 0.24);
        for (let i = 0; i < (this.reduced ? 8 : 75); i++) {
            const life = (t * (0.12 + this.seed(i + 12) * 0.24) + this.seed(i + 29)) % 1;
            const x = this.width * this.seed(i + 35) + Math.sin(life * 6 + i) * 35;
            const y = this.height - life * this.height * 0.95;
            this.dot(x, y, 0.6 + this.seed(i + 63) * 1.1, i % 4 ? '249, 175, 71' : this.palette.main,
                Math.sin(life * Math.PI) * strength * 0.8);
        }
    }

    royal(t, p) {
        this.shade(0.3);
        const x = this.width / 2, y = this.height * 0.4;
        for (let i = 0; i < 5; i++) {
            const originX = this.width * (i % 2 ? 1.1 : -0.1), originY = this.height * 0.95;
            const angle = -Math.PI / 2 + Math.sin(t * 0.32 + i) * 0.5 + (i - 2) * 0.12;
            const length = this.height * 1.3, spread = 0.055;
            const gradient = this.ctx.createLinearGradient(originX, originY, x, 0);
            gradient.addColorStop(0, this.rgba(this.palette.accent, 0.09 * this.alpha));
            gradient.addColorStop(1, this.rgba(this.palette.main, 0));
            this.ctx.fillStyle = gradient; this.ctx.beginPath(); this.ctx.moveTo(originX, originY);
            this.ctx.lineTo(originX + Math.cos(angle - spread) * length, originY + Math.sin(angle - spread) * length);
            this.ctx.lineTo(originX + Math.cos(angle + spread) * length, originY + Math.sin(angle + spread) * length);
            this.ctx.closePath(); this.ctx.fill();
        }
        this.glow(x, y, Math.min(260, this.width * 0.66), this.palette.main, 0.14);
        const entry = this.ease(p / 0.2);
        this.sprite(this.images.logo, x, y + (1 - entry) * 35, Math.min(350, this.width * 0.83) * (0.88 + entry * 0.12), 0, entry);
        for (let i = 0; i < (this.reduced ? 10 : this.mobile ? 43 : 70); i++) {
            const delay = this.seed(i + 8) * 2.1;
            const life = this.clamp((t - 0.75 - delay) / 4.6);
            if (!life || life >= 1) continue;
            const angle = -Math.PI + this.seed(i + 29) * Math.PI;
            const velocity = 50 + this.seed(i + 45) * 170;
            const px = x + Math.cos(angle) * velocity * life * 2.5 + Math.sin(t + i) * 9;
            const py = y + Math.sin(angle) * velocity * life * 1.8 + life * life * this.height * 1.1;
            const size = 14 + this.seed(i + 66) * 15;
            const flip = 0.22 + Math.abs(Math.cos(t * 3 + i)) * 0.78;
            this.sprite(this.images.coin, px, py, size, life * 4 + i, Math.sin(life * Math.PI) * 0.9, flip, size);
        }
    }
}
