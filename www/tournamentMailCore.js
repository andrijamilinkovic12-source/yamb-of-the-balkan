(function (root, factory) {
    const node = typeof module === 'object' && module.exports;
    const api = factory(node ? require('./tournamentNotificationsCore') : root.tournamentNotificationsCore,
        node ? require('./tournamentReliabilityCore') : root.tournamentReliabilityCore);
    if (node) module.exports = api; else root.tournamentMailCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (matchNotices, reliability) {
    'use strict';
    function copy(data, language) {
        if (!data || !Number.isSafeInteger(data.tournamentNumber) || data.tournamentNumber < 1) return null;
        const en = language === 'en', pick = (sr, english) => en ? english : sr;
        const round = pick({ qf: 'Četvrtfinale', sf: 'Polufinale', f: 'Finale' }, { qf: 'Quarterfinal', sf: 'Semifinal', f: 'Final' })[data.round];
        const date = value => Number.isFinite(value) ? new Intl.DateTimeFormat(en ? 'en-GB' : 'sr-Latn', {
            dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Belgrade'
        }).format(value) + pick(' (Beograd)', ' (Belgrade time)') : '';
        const player = value => String(value || pick('Igrač', 'Player'));
        const prefix = pick('Turnir br. ', 'Tournament No. ') + data.tournamentNumber;
        let title, body;
        const pairs = (data.matches || []).map(match => {
            const pair = `${player(match.p1)} — ${player(match.p2)}`;
            if (data.kind === 'started') return pair;
            if (match.outcome === 'double_dq') return pair + pick(': oba igrača su diskvalifikovana; niko ne prolazi dalje.', ': both players disqualified; neither advances.');
            if (['void', 'empty'].includes(match.outcome)) return pair + pick(': meč je zatvoren bez pobednika.', ': match closed without a winner.');
            if (match.outcome === 'bye') return player(match.winner) + pick(': slobodan prolaz.', ': advances without an opponent.');
            return pair + (match.outcome === 'technical' ? pick(': tehnički rezultat.', ': technical result.') : (match.score ? `: ${match.score}.` : '.'))
                + (match.winner ? pick(' Prolazi ', ' Advances: ') + match.winner + '.' : '');
        });
        switch (data.kind) {
            case 'started':
                title = pick('Turnir je počeo', 'Tournament started');
                body = pick('Formirani su četvrtfinalni parovi:', 'Quarterfinal pairings are ready:') + '\n\n' + pairs.join('\n'); break;
            case 'round_complete':
                title = (round || '') + pick(' — rezultati', ' — results'); body = pairs.join('\n\n'); break;
            case 'final_scheduled': case 'final_rescheduled':
                title = data.kind === 'final_rescheduled' ? pick('Promenjen je termin finala', 'Final time changed') : pick('Finale je zakazano', 'Final scheduled');
                body = `${player(data.p1)} — ${player(data.p2)}\n\n${date(data.scheduledAt)}`; break;
            case 'cancelled':
                title = pick('Turnir je otkazan', 'Tournament cancelled');
                body = pick('Ciklus prijavljivanja završen je bez početka turnira. Učesnici dobijaju zasebnu potvrdu povraćaja kotizacije.',
                    'The registration cycle ended before the tournament started. Entrants receive a separate entry-fee refund notice.'); break;
            case 'finished_without_winner':
                title = pick('Turnir je završen bez pobednika', 'Tournament ended without a champion');
                body = pick('Finalni meč je zatvoren bez dodeljenog pobednika. Pojedinačne odluke i eventualni povraćaji stižu učesnicima privatno.',
                    'The final was closed without a winner. Individual decisions and any refunds are sent privately to the affected players.'); break;
            case 'registration_confirmed':
                title = pick('Prijava je zabeležena', 'Registration recorded');
                body = pick('Prijavljen si za ovaj turnir. Kada se popune mesta, prati zahtev za potvrdu spremnosti i rok u turniru.',
                    'Your entry for this tournament was recorded. When all places fill, check the readiness request and its deadline in the tournament.'); break;
            case 'readiness_confirmed':
                title = pick('Spremnost je potvrđena', 'Readiness confirmed');
                body = pick('Tvoja potvrda spremnosti je sačuvana. Parovi se formiraju kada svih osam učesnika potvrdi učešće.',
                    'Your readiness confirmation was saved. Pairings are formed when all eight entrants confirm.'); break;
            case 'readiness_requested': case 'readiness_halfway': case 'readiness_last_call':
                title = pick('Potvrdi spremnost', 'Confirm readiness');
                body = pick('Potvrdi učešće do ', 'Confirm your participation by ') + date(data.deadlineAt)
                    + pick('. Bez potvrde mesto se oslobađa prema pravilima turnira.', '. Without confirmation your place is released under the tournament rules.'); break;
            case 'readiness_withdrawn': case 'readiness_expired': case 'readiness_cancelled':
                title = pick('Prijava je zatvorena — kotizacija', 'Entry closed — entry fee');
                body = pick('Prijava je zatvorena bez kazne. Potvrđeno vraćeno: ', 'Your entry was closed without a penalty. Confirmed refund: ')
                    + Number(data.amount || 0).toLocaleString(en ? 'en-GB' : 'sr-Latn') + pick(' dukata.', ' ducats.')
                    + (data.refundPending ? pick(' Preostalo za povraćaj: ', ' Remaining refund: ')
                        + Number(data.refundPending).toLocaleString(en ? 'en-GB' : 'sr-Latn') + pick(' dukata.', ' ducats.') : ''); break;
            case 'match_bye':
                title = pick('Slobodan prolaz', 'Advance without an opponent');
                body = (round ? round + ': ' : '') + pick('Zbog nedostatka protivnika prolaziš dalje. Nije upisan rezultat odigrane partije.',
                    'You advance because there is no opponent. No played-game score was recorded.'); break;
            case 'match_result':
                title = (data.resultType === 'technical' ? pick('Tehnički rezultat', 'Technical result')
                    : data.won ? pick('Pobeda', 'Victory') : pick('Poraz', 'Defeat')) + (round ? ' — ' + round : '');
                body = data.resultType === 'technical' ? (data.won ? pick('Upisana ti je tehnička pobeda.', 'A technical win was recorded for you.')
                    : pick('Upisan ti je tehnički poraz.', 'A technical loss was recorded for you.'))
                    : pick('Potvrđen rezultat: ', 'Confirmed result: ') + (data.score || pick('zabeležen u turniru', 'recorded in the tournament')) + '.';
                body += '\n\n' + (data.won ? data.round === 'f' ? pick('Pobednik si turnira. Potvrda nagrade stiže zasebno nakon uplate.',
                    'You won the tournament. The reward confirmation arrives separately after crediting.') : pick('Prošao si u ', 'You advanced to ')
                        + (data.round === 'qf' ? pick('polufinale.', 'the semifinal.') : pick('finale.', 'the final.'))
                    : pick('Tvoj nastup na ovom turniru je završen.', 'Your run in this tournament has ended.')); break;
            case 'reliability_warning': case 'reliability_suspension': {
                const text = reliability?.copy(data, en ? 'en' : 'sr'); if (!text) return null;
                title = text.title; body = text.body; break;
            }
            default: {
                const text = matchNotices?.copy(data, en ? 'en' : 'sr'); if (!text) return null;
                title = text.title; body = text.body;
            }
        }
        if (data.opponent) body = pick('Protivnik: ', 'Opponent: ') + data.opponent + '\n\n' + body;
        return { title: prefix + ' · ' + title, body };
    }
    return { copy };
});
