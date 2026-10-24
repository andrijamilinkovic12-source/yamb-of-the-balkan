/* Animated effect scenes. PNGs are physical components; motion, light and particles are drawn live. */
const LIVE_STAGE_EFFECT_DURATIONS = Object.freeze({
    ice_age: 6500, neon_pulse: 5000, thunder: 4500, balkan: 8600, fireworks: 7000,
    drones: 8200, cosmic_dust: 6000, ufo_abduction: 7500, dragon_fire: 5500, royal_yamb: 8000
});
const LIVE_STAGE_EFFECT_IDS = Object.freeze(Object.keys(LIVE_STAGE_EFFECT_DURATIONS));

class LiveEffectsStage {
    static imageCache = new Map();

    static sources(type, theme) {
        const root = 'assets/effects/stage-v1/';
        const png = name => root + name + '.png?v=1';
        if (type === 'ice_age') return { frost: png('frost-corner') };
        if (type === 'balkan') return { trumpet: png('trumpet') };
        if (type === 'dragon_fire') return { flame: png('flame') };
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
        if (this.type === 'drones') this.prepareDroneFormation();
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
                royal_yamb: 'trophy', ice_age: 'iceAge' }[this.type];
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
        const h = height || width * image.naturalHeight / image.naturalWidth;
        this.ctx.save(); this.ctx.translate(x, y); this.ctx.rotate(rotation);
        this.ctx.scale(flip, 1); this.ctx.globalAlpha = this.alpha * alpha;
        this.ctx.drawImage(image, -width / 2, -h / 2, width, h); this.ctx.restore();
    }

    ice(t, p) {
        const c = this.ctx, b = this.board;
        const progress = this.reduced ? this.ease(p / 0.4) : this.ease(t / 2.8);
        this.shade(0.09);
        c.save(); c.beginPath(); c.rect(b.x, b.y, b.width, b.height); c.clip();
        const reach = Math.hypot(b.width, b.height) * progress * 0.63;
        this.overlay.dataset.corners = '4';
        this.overlay.dataset.coverage = progress.toFixed(3);
        [[b.x, b.y, 1, 1], [b.right, b.y, -1, 1], [b.x, b.bottom, 1, -1], [b.right, b.bottom, -1, -1]]
            .forEach(([x, y, sx, sy]) => {
                // Screen-space lengths preserve the full board height on tall phones.
                const ice = c.createRadialGradient(x, y, 0, x, y, Math.max(1, reach));
                ice.addColorStop(0, this.rgba('210, 236, 247', 0.54 * this.alpha));
                ice.addColorStop(0.72, this.rgba('186, 219, 239', 0.32 * this.alpha));
                ice.addColorStop(0.92, this.rgba('230, 247, 251', 0.2 * this.alpha));
                ice.addColorStop(1, 'rgba(210,240,255,0)');
                c.fillStyle = ice; c.fillRect(b.x, b.y, b.width, b.height);
                c.save(); c.translate(x, y); c.scale(sx, sy); c.globalAlpha = this.alpha * 0.88;
                c.drawImage(this.images.frost, 0, 0, b.width * progress * 0.86, b.height * progress * 0.86);
                c.restore();
            });
        // Fine glints follow the advancing freezing front rather than falling from above.
        for (let i = 0; i < 32 && !this.reduced; i++) {
            const x = b.x + this.seed(i + 4) * b.width, y = b.y + this.seed(i + 90) * b.height;
            const cornerDistance = Math.min(Math.hypot(x - b.x, y - b.y), Math.hypot(x - b.right, y - b.y),
                Math.hypot(x - b.x, y - b.bottom), Math.hypot(x - b.right, y - b.bottom));
            const glint = Math.max(0, 1 - Math.abs(cornerDistance - reach * 0.83) / 32);
            this.dot(x, y, 0.8, '243, 252, 255', glint * 0.7);
        }
        c.restore();
    }

    neon(t) {
        const b = this.board, perimeter = 2 * (b.width + b.height);
        const point = distance => {
            let d = ((distance % perimeter) + perimeter) % perimeter;
            if (d < b.width) return [b.x + d, b.y]; d -= b.width;
            if (d < b.height) return [b.right, b.y + d]; d -= b.height;
            if (d < b.width) return [b.right - d, b.bottom]; d -= b.width;
            return [b.x, b.bottom - d];
        };
        const speed = this.reduced ? 0 : 280;
        for (let lane = 0; lane < 3; lane++) {
            for (let trail = 0; trail < 18; trail++) {
                const d = t * speed + lane * perimeter / 3 - trail * 7;
                this.line([point(d - 7), point(d)], lane === 1 ? this.palette.accent : this.palette.main,
                    (1 - trail / 18) * 0.82, 2.4 + trail * 0.15);
            }
            const head = point(t * speed + lane * perimeter / 3);
            this.glow(head[0], head[1], 20, lane === 1 ? this.palette.accent : this.palette.main, 0.42);
        }
        const y = b.y + ((t * 0.32) % 1) * b.height;
        const pulse = this.reduced ? 0.15 : Math.sin(t * Math.PI / 1.5) ** 2 * 0.32;
        this.line([[b.x + 2, y], [b.right - 2, y]], this.palette.main, pulse, 1.5);
        this.glow(b.x + b.width / 2, y, b.width * 0.55, this.palette.main, pulse * 0.16);
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
        const app = window.app;
        const fullName = app?.players?.[app.currentPlayerIdx] || app?.playerName || 'YAMB';
        const name = String(fullName).trim().split(/\s+/)[0].slice(0, 12).toLocaleUpperCase();
        const sample = document.createElement('canvas'); sample.width = 360; sample.height = 100;
        const ctx = sample.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `800 ${Math.min(66, 330 / Math.max(3, name.length) * 1.65)}px Arial`;
        ctx.fillText(name, 180, 50, 345);
        const data = ctx.getImageData(0, 0, 360, 100).data;
        const points = [];
        for (let y = 8; y < 95; y += 6) for (let x = 6; x < 355; x += 6) {
            if (data[(y * 360 + x) * 4 + 3] > 100) points.push([x / 360, y / 100]);
        }
        const max = this.mobile ? 175 : 280;
        this.droneTargets = points.filter((_, i) => i % Math.max(1, Math.ceil(points.length / max)) === 0);
    }

    drones(t, p) {
        this.shade(0.38);
        const assemble = this.ease(p / 0.42), depart = this.ease((p - 0.76) / 0.24);
        (this.droneTargets || []).forEach(([tx, ty], i) => {
            const targetX = this.width * (0.08 + tx * 0.84), targetY = this.height * 0.3 + ty * Math.min(135, this.height * 0.2);
            const originX = this.width * this.seed(i + 4), originY = this.height + 30 + this.seed(i + 15) * 120;
            let x = originX + (targetX - originX) * assemble;
            let y = originY + (targetY - originY) * assemble;
            if (!this.reduced) { x += Math.sin(t * 2 + i) * 24 * (1 - assemble); y += Math.sin(t * 1.4 + i) * 18 * (1 - assemble); }
            x += (this.seed(i + 57) - 0.5) * this.width * depart;
            y -= (this.height * 0.65 + this.seed(i + 81) * 180) * depart;
            if (this.reduced) { x = targetX; y = targetY; }
            const color = i % 7 ? this.palette.main : this.palette.accent;
            const twinkle = 0.68 + Math.sin(t * 3 + i * 2) * 0.13;
            this.glow(x, y, this.mobile ? 6 : 8, color, 0.26 * twinkle);
            this.dot(x, y, this.mobile ? 1.25 : 1.6, color, twinkle);
        });
    }

    dust(t) {
        this.shade(0.21);
        for (let cloud = 0; cloud < 3; cloud++) {
            const x = this.width * (0.2 + cloud * 0.3) + Math.sin(t * 0.28 + cloud * 2) * this.width * 0.18;
            const y = this.height * (0.25 + cloud * 0.22) + Math.cos(t * 0.24 + cloud) * 45;
            this.glow(x, y, Math.min(this.width, this.height) * 0.7,
                cloud === 1 ? this.palette.accent : this.palette.main, 0.085);
        }
        const count = this.reduced ? 45 : this.mobile ? 145 : 250;
        for (let i = 0; i < count; i++) {
            const layer = i % 3, speed = this.reduced ? 0 : 0.1 + layer * 0.09;
            const angle = this.seed(i + 22) * Math.PI * 2 + t * speed;
            const radius = 0.08 + this.seed(i + 74) * 0.75;
            const x = this.width / 2 + Math.cos(angle) * radius * this.width * 0.78 + Math.sin(t * 0.5 + i) * 8;
            const y = this.height / 2 + Math.sin(angle) * radius * this.height * 0.75;
            this.dot(x, y, 0.65 + layer * 0.45, i % 5 ? this.palette.main : this.palette.accent,
                0.24 + (Math.sin(t + i) + 1) * 0.19);
            if (i % 15 === 0) this.line([[x - Math.sin(angle) * 7, y + Math.cos(angle) * 5], [x, y]], this.palette.main, 0.2, 0.8);
            if (i % 37 === 0) this.glow(x, y, 10, this.palette.accent, 0.12);
        }
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
