// pravilaigre.js - Pravila igre i mogućnosti aplikacije (Bilingual + Glassmorphism Carousel UI)

const RulesData = {
    sr: [
        {
            title: "📜 Cilj Igre",
            content: `
                <p><b>Yamb</b> se igra sa 5 kockica. Cilj igre je sakupiti što više poena ispunjavanjem polja u tabeli.</p><br>
                <p>Igrač ima pravo na <b>3 bacanja</b> u svakom potezu. Posle svakog bacanja, može zadržati kockice koje mu odgovaraju, a ostale ponovo baciti.</p><br>
                <p>Tabela se sastoji od redova (kombinacija) i kolona (pravila upisa).</p>
            `
        },
        {
            title: "📐 Kolone u Tabeli",
            content: `
                <p>Postoji 5 osnovnih kolona, svaka sa svojim pravilom upisa:</p><br>
                <ul>
                    <li><b class="c-nadole">⬇ Nadole:</b> Polja se moraju popunjavati isključivo redom od vrha prema dnu (od 1 do Yamba).</li>
                    <li><b class="c-nagore">⬆ Nagore:</b> Polja se moraju popunjavati redom odozdo prema gore (od Yamba do 1).</li>
                    <li><b class="c-slobodna">↕ Slobodna:</b> Polja se mogu popunjavati bilo kojim redosledom.</li>
                    <li><b class="c-najava">📢 Najava:</b> Polje se mora najaviti <b>posle prvog bacanja</b>. Ne možete upisati u drugo polje osim onog koje ste najavili.</li>
                    <li><b class="c-rucno">✋ Ručno:</b> Polje se može popuniti <b>samo posle prvog bacanja</b> (iz ruke). Ako bacite drugi put, ova kolona je zaključana.</li>
                </ul>
            `
        },
        {
            title: "🎲 Kombinacije i Bodovanje",
            content: `
                <p><b>Brojevi (1-6):</b> Zbir dobijenih brojeva. Ako je zbir svih brojeva veći od 60, dobijate bonus +30.</p><br>
                <p><b>Max i Min:</b> Max treba da bude što veći, a Min što manji. Boduju se: (Max - Min) * Broj Kečeva (Jedinica).</p><br>
                <p><b>Kenta (Skala):</b> 1-2-3-4-5 ili 2-3-4-5-6. Nosi 66 poena (iz prvog bacanja), 56 (iz drugog), 46 (iz trećeg).</p><br>
                <p><b>Ful:</b> 3 iste i 2 iste kockice. Zbir kockica + 30 poena.</p>
                <p><b>Poker:</b> 4 iste kockice. Zbir te 4 kockice + 40 poena.</p>
                <p><b>Yamb:</b> 5 istih kockica. Zbir kockica + 50 poena.</p>
            `
        },
        {
            title: "⭐ Mogućnosti Aplikacije",
            content: `
                <p><b>Dukati i Prodavnica:</b> Igranjem sakupljate dukate koje možete potrošiti u prodavnici na nove skinove kockica i specijalne efekte (npr. konfete).</p><br>
                <p><b>Turniri (Kup):</b> Prijavite se za turnir, igrajte eliminacione mečeve (četvrtfinale, polufinale, finale) i osvojite velike nagrade!</p><br>
                <p><b>Kvartalna Liga:</b> Vaši rezultati se beleže na tabeli koja se resetuje na svaka 3 meseca. Najbolji dobijaju bedževe i dukate.</p><br>
                <p><b>Prijatelji i Chat:</b> Dodajte prijatelje, izazovite ih na privatni duel i dopisujte se putem in-game chata.</p>
            `
        }
    ],
    en: [
        {
            title: "📜 Goal of the Game",
            content: `
                <p><b>Yamb</b> is played with 5 dice. The goal is to score as many points as possible by filling the fields in the table.</p><br>
                <p>You have <b>3 rolls</b> per turn. After each roll, you can hold the dice you want and re-roll the rest.</p><br>
                <p>The score table consists of rows (combinations) and columns (entry rules).</p>
            `
        },
        {
            title: "📐 Columns Overview",
            content: `
                <p>There are 5 basic columns, each with specific rules:</p><br>
                <ul>
                    <li><b class="c-nadole">⬇ Down:</b> Fields must be filled strictly from top to bottom (from 1 to Yamb).</li>
                    <li><b class="c-nagore">⬆ Up:</b> Fields must be filled strictly from bottom to top (from Yamb to 1).</li>
                    <li><b class="c-slobodna">↕ Free:</b> Fields can be filled in any order at any time.</li>
                    <li><b class="c-najava">📢 Call (Announce):</b> You must announce the specific field <b>after the first roll</b>. You cannot score anywhere else.</li>
                    <li><b class="c-rucno">✋ Hand:</b> Field can be filled <b>only after the first roll</b>. If you roll twice, this column is locked.</li>
                </ul>
            `
        },
        {
            title: "🎲 Combinations & Scoring",
            content: `
                <p><b>Numbers (1-6):</b> Sum of the specified dice. If the total is > 60, you get a +30 bonus.</p><br>
                <p><b>Max & Min:</b> Max should be high, Min should be low. Score: (Max - Min) * Number of 1s.</p><br>
                <p><b>Straight (Kenta):</b> 1-2-3-4-5 or 2-3-4-5-6. Scores 66 (1st roll), 56 (2nd roll), 46 (3rd roll).</p><br>
                <p><b>Full House:</b> 3 of a kind + a pair. Sum of all 5 dice + 30 points.</p>
                <p><b>Poker:</b> 4 of a kind. Sum of those 4 dice + 40 points.</p>
                <p><b>Yamb:</b> 5 of a kind. Sum of those 5 dice + 50 points.</p>
            `
        },
        {
            title: "⭐ App Features",
            content: `
                <p><b>Coins & Shop:</b> Earn coins by playing and spend them in the shop to unlock new dice skins and special win effects (like confetti).</p><br>
                <p><b>Tournaments (Cup):</b> Join an 8-player bracket tournament. Win quarter-finals, semi-finals, and finals for massive rewards!</p><br>
                <p><b>Quarterly League:</b> Your highest scores are recorded on a leaderboard that resets every 3 months. Top players earn badges and coins.</p><br>
                <p><b>Friends & Chat:</b> Add friends, challenge them to private duels, and chat using the in-game floating chat window.</p>
            `
        }
    ]
};

class RulesUI {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'sr';
        this.currentSlide = 0;
        this.overlay = null;
        this.sliderTrack = null;
        this.dots = [];
    }

    init() {
        // Obriši ako već postoji da ne duplira
        const existing = document.getElementById('rules-overlay-ui');
        if (existing) existing.remove();

        // Kreiranje overlay-a
        this.overlay = document.createElement('div');
        this.overlay.id = 'rules-overlay-ui';
        this.overlay.className = 'modal-overlay';
        
        // CSS specifičan za slider generisan inline kako ne bi morao da menjaš style.css mnogo
        this.overlay.innerHTML = `
            <div class="rules-card modal-box" style="padding: 0; width: 90%; max-width: 450px; height: 75vh; overflow: hidden; display: flex; flex-direction: column; position: relative;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--glass-border); flex-shrink: 0;">
                    <h3 id="rules-main-title" style="color: var(--gold-main); margin: 0; font-size: 1.1rem; text-transform: uppercase;">
                        ${this.currentLang === 'sr' ? 'Pravila i Uputstvo' : 'Rules & Guide'}
                    </h3>
                    <button id="btn-close-rules" style="background: transparent; border: none; color: var(--danger); font-size: 1.5rem; cursor: pointer; font-weight: bold;">&times;</button>
                </div>

                <div style="flex: 1; overflow: hidden; position: relative; width: 100%;">
                    <div id="rules-slider-track" style="display: flex; height: 100%; transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); width: ${RulesData[this.currentLang].length * 100}%;">
                        ${this.generateSlides()}
                    </div>
                </div>

                <div id="rules-dots-container" style="display: flex; justify-content: center; gap: 10px; padding: 15px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--glass-border); flex-shrink: 0;">
                    ${this.generateDots()}
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.sliderTrack = document.getElementById('rules-slider-track');
        this.dots = Array.from(document.querySelectorAll('.rule-dot'));

        this.attachEvents();
    }

    generateSlides() {
        const data = RulesData[this.currentLang];
        return data.map((slide, index) => `
            <div class="rules-slide" style="width: 100%; height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box;">
                <h4 style="color: var(--gold-main); font-size: 1.2rem; margin-bottom: 15px; text-align: center;">${slide.title}</h4>
                <div class="pravni-tekst-container" style="flex: 1; overflow-y: auto; padding-right: 10px; max-height: none; border: none; background: transparent;">
                    ${slide.content}
                </div>
            </div>
        `).join('');
    }

    generateDots() {
        const data = RulesData[this.currentLang];
        return data.map((_, index) => `
            <div class="rule-dot ${index === 0 ? 'active' : ''}" data-index="${index}" style="width: 12px; height: 12px; border-radius: 50%; background: ${index === 0 ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; cursor: pointer; transition: 0.3s; box-shadow: ${index === 0 ? '0 0 10px var(--gold-glow)' : 'none'};"></div>
        `).join('');
    }

    attachEvents() {
        // Zatvaranje
        document.getElementById('btn-close-rules').addEventListener('click', () => this.close());
        
        // Klik na tačkice
        this.dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                this.goToSlide(parseInt(e.target.getAttribute('data-index')));
            });
        });

        // Swipe funkcionalnost za telefone
        let touchStartX = 0;
        let touchEndX = 0;

        this.sliderTrack.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.sliderTrack.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    handleSwipe() {
        const threshold = 50; // Minimum px za swipe
        if (touchEndX < touchStartX - threshold) {
            // Swipe Left (Next)
            if (this.currentSlide < RulesData[this.currentLang].length - 1) {
                this.goToSlide(this.currentSlide + 1);
            }
        }
        if (touchEndX > touchStartX + threshold) {
            // Swipe Right (Prev)
            if (this.currentSlide > 0) {
                this.goToSlide(this.currentSlide - 1);
            }
        }
    }

    goToSlide(index) {
        this.currentSlide = index;
        const totalSlides = RulesData[this.currentLang].length;
        
        // Pomeri traku
        const offset = -(index * (100 / totalSlides));
        this.sliderTrack.style.transform = `translateX(${offset}%)`;

        // Ažuriraj tačkice
        this.dots.forEach((dot, i) => {
            if (i === index) {
                dot.style.background = 'var(--gold-main)';
                dot.style.boxShadow = '0 0 10px var(--gold-glow)';
            } else {
                dot.style.background = 'rgba(255,255,255,0.2)';
                dot.style.boxShadow = 'none';
            }
        });
    }

    open() {
        // Proveri jezik pre otvaranja u slučaju da je korisnik promenio u settings
        const currentStoredLang = localStorage.getItem('language') || 'sr';
        if (this.currentLang !== currentStoredLang) {
            this.currentLang = currentStoredLang;
            this.init(); // Ponovo izgradi ako se jezik promenio
        }
        
        // Resetuj na prvi slajd
        this.goToSlide(0);
        
        this.overlay.style.display = 'flex';
        // Mali delay za CSS transition efekat
        setTimeout(() => {
            this.overlay.classList.add('active');
        }, 10);
    }

    close() {
        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 300);
    }
}

// Inicijalizuj instancu
const GameRules = new RulesUI();

// Kreiraj je u DOM-u odmah, ali sakriveno
document.addEventListener('DOMContentLoaded', () => {
    GameRules.init();
});

// Otključavamo globalnu funkciju da bi mogao da je zoveš sa dugmeta u meniju
window.showGameRules = function() {
    GameRules.open();
};