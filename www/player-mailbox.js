(function () {
    const label = key => t(`mailbox_${key}`);
    const byId = name => document.getElementById(name ? `player-mailbox-${name}` : 'player-mailbox');
    const room = byId();
    const trigger = byId('button');
    const badge = byId('unread');
    const status = byId('status');
    const list = byId('list');
    const retry = byId('retry');
    const close = byId('close');
    const back = byId('back');
    const reportButton = byId('report');
    const reportForm = byId('report-form');
    const reportStatus = byId('report-status');
    const supportList = byId('support-list');
    const supportStatus = byId('support-status');
    const supportMore = byId('support-more');
    const publishForm = byId('publish-form');
    const publishStatus = byId('publish-status');
    const readRetry = byId('read-retry');
    const more = byId('more');
    const archiveButton = byId('archive');
    const deleteButton = byId('delete');
    const manageStatus = byId('manage-status');
    const icons = document.querySelectorAll('[data-mailbox-icon]');
    const uid = () => localStorage.getItem('yamb_uid') || '';
    const language = () => localStorage.getItem('yamb_lang') === 'en' ? 'en' : 'sr-Latn';
    const rpc = (event, data) => window.app.emitSocketAck(event, data, 7000);
    const connectedAs = account => Boolean(account && boundSocket?.connected && window.app?.socketVerifiedUid === account && uid() === account);
    const privateReply = message => /^(moderation_|support_reply$)/.test(message.type);
    const subject = message => message.title || label(`${message.type}_title`);
    const errorLabel = response => label(response?.reason || 'unavailable');
    let dateLanguage;
    let dateFormatter;
    const timeText = value => {
        const date = new Date(value);
        const locale = language();
        if (dateLanguage !== locale) {
            dateLanguage = locale;
            dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
        }
        return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : '';
    };
    function messageBody(message) {
        if (message.type === 'game_notice' || (privateReply(message) && message.text)) return message.text;
        if (message.type === 'android_update') {
            return label('android_update').replace('{version}', () => String(message.versionName || message.versionCode));
        }
        if (message.type === 'tournament_match_warning' && message.tournamentWarning) {
            const warning = message.tournamentWarning;
            const date = value => Number.isFinite(value) ? new Intl.DateTimeFormat(language(), {
                dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Belgrade'
            }).format(value) : '';
            const heading = label('tournament_match').replace('{number}', () => String(warning.tournamentNumber))
                .replace('{round}', () => label(`tournament_round_${warning.round}`));
            const opponent = warning.opponentName ? label('tournament_warning_opponent').replace('{name}', () => warning.opponentName) : '';
            const body = label(`tournament_warning_${warning.stage}`).replace(/\{(deadline|actionDeadline|scheduled)\}/g, (_, field) =>
                date(field === 'deadline' ? warning.deadlineAt : field === 'actionDeadline' ? warning.actionDeadlineAt : warning.scheduledAt));
            return [heading, opponent, body, label('tournament_warning_info')].filter(Boolean).join('\n\n');
        }
        if (['power_index_milestone', 'fire_streak_milestone', 'fire_streak_ended'].includes(message.type) && message.statistics) {
            return label(message.type).replace(/\{(milestone|value|next|best)\}/g, (_, field) =>
                Number(message.statistics[field] || 0).toLocaleString(language()));
        }
        if (message.type === 'league_rank_changed' && message.leagueRank) {
            const { year, quarter, previousRank, nextRank, score, direction } = message.leagueRank;
            return label(`league_rank_${direction}`)
                .replace('{previous}', () => t(`rank_${previousRank}`))
                .replace('{rank}', () => t(`rank_${nextRank}`))
                .replace('{score}', () => Number(score || 0).toLocaleString(language()))
                .replace('{quarter}', () => String(quarter)).replace('{year}', () => String(year));
        }
        if (message.type === 'leaderboard_record' && message.leaderboard) {
            const { playerName, score, periods } = message.leaderboard;
            const number = value => Number(value || 0).toLocaleString(language());
            const heading = label('leaderboard_record').replace('{name}', () => playerName || label('player'))
                .replace('{score}', () => number(score));
            const changes = periods.map(({ period, change, previousScore, periodStartedAt }) => {
                const date = periodStartedAt ? new Intl.DateTimeFormat(language(), { dateStyle: 'medium', timeZone: 'Europe/Belgrade' })
                    .format(periodStartedAt) : '';
                const periodLabel = label(`record_period_${period}`).replace('{date}', () => date);
                const description = label(`record_${change}`).replace('{previous}', () => number(previousScore));
                return `${periodLabel}\n${description}`;
            });
            return [heading, ...changes].join('\n\n');
        }
        if (['tournament_champion', 'league_champion'].includes(message.type) && message.champion) {
            const champion = message.champion;
            const name = champion.playerName || label('player');
            return label(message.type)
                .replace('{name}', () => name)
                .replace('{number}', () => String(champion.tournamentNumber))
                .replace('{year}', () => String(champion.year))
                .replace('{quarter}', () => String(champion.quarter))
                .replace('{score}', () => Number(champion.score || 0).toLocaleString(language()));
        }
        if (message.type === 'tournament_unplayed' && message.tournament) {
            const { tournamentNumber, round, outcome, reason, deadlineAt } = message.tournament;
            const prefix = label('tournament_match').replace('{number}', String(tournamentNumber)).replace('{round}', label(`tournament_round_${round}`));
            const result = label(`tournament_${outcome}`).replace('{deadline}', () => new Intl.DateTimeFormat(language(), {
                dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Belgrade'
            }).format(deadlineAt));
            const explanation = ['verified_no_show', 'unanswered_valid_proposal'].includes(reason) ? ` ${label(`tournament_${reason}`)}` : '';
            return `${prefix}\n\n${result}${explanation}`;
        }
        const body = message.type === 'referral_reward' && Number.isSafeInteger(message.rank) && message.rank >= 1 && message.rank <= 3
            ? label('referral_reward_progress') : label(message.type);
        return body
            .replace('{name}', () => message.fromName || label('player'))
            .replace('{reward}', () => Number(message.reward || 0).toLocaleString(language()))
            .replace('{rank}', () => String(message.rank || ''));
    }
    function element(tag, text) {
        const node = document.createElement(tag);
        node.textContent = text;
        return node;
    }
    let boundSocket;
    let activeUid = '';
    let request;
    let queued = false;
    let unread = 0;
    let messages = [];
    let ready = false;
    let roomState = 'loading';
    let view = 'inbox';
    let selected;
    let supportOwner = false;
    let supportAvailable = false;
    let readPending = new Set();
    let reportRequest = '';
    let reportBusy = false;
    let supportRequest = 0;
    let supportCursor = '';
    let publishRequest = '';
    let publishBusy = false;
    let menuActive = true;
    let menuVisit = 0;
    let inboxScroll = 0;
    let renderedRows = '';
    let readRevision = 0;
    let openedAt = null;
    let folder = 'inbox';
    let nextCursor = '';
    let manageBusy = false;

    function renderBadge() {
        badge.hidden = !unread;
        badge.textContent = unread > 99 ? '99+' : String(unread);
        trigger.setAttribute('aria-label', unread ? label('unread').replace('{0}', unread) : label('title'));
    }

    function renderMessages(state = '') {
        roomState = state;
        if (!room.open || view !== 'inbox') return;
        const messagesToShow = ready ? messages : [];
        status.textContent = label(state || (messagesToShow.length ? 'title' : folder === 'archive' ? 'archive_empty' : 'empty'));
        status.hidden = !state && !!messagesToShow.length;
        retry.hidden = state !== 'unavailable';
        more.hidden = !nextCursor || !!state;
        more.disabled = !!request;
        for (const name of ['inbox', 'archive']) byId(`folder-${name}`).setAttribute('aria-pressed', String(name === folder));
        const signature = JSON.stringify([language(), messagesToShow]);
        if (signature === renderedRows) return;
        renderedRows = signature;
        const rows = messagesToShow.map(message => {
            const row = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.messageId = message.id;
            button.append(element('strong', subject(message)), element('time', timeText(message.createdAt)));
            const flags = document.createElement('div');
            flags.className = 'player-mailbox-row-flags';
            if (message.pinned) flags.append(element('span', label('pinned')));
            if (!message.readAt) flags.append(element('span', label('new')));
            if (flags.children.length) button.append(flags);
            row.classList.toggle('is-new', !message.readAt);
            row.classList.toggle('is-pinned', message.pinned === true);
            row.append(button);
            return row;
        });
        const focused = document.activeElement?.dataset.messageId;
        list.replaceChildren(...rows);
        if (view === 'inbox' && focused) [...list.querySelectorAll('button')].find(button => button.dataset.messageId === focused)?.focus({ preventScroll: true });
    }

    function showView(next) {
        const content = room.querySelector('.player-mailbox-content');
        if (view === 'inbox' && next !== 'inbox') inboxScroll = content.scrollTop;
        view = next;
        for (const [id, name] of [['inbox', 'inbox'], ['detail', 'detail'], ['report-form', 'report'], ['support-panel', 'support'], ['publish-form', 'publish']]) {
            byId(id).hidden = next !== name;
        }
        back.hidden = next === 'inbox';
        if (next === 'inbox') renderMessages(roomState);
        content.scrollTop = next === 'inbox' ? inboxScroll : 0;
    }

    list.addEventListener('click', event => {
        if (uid() !== activeUid) { refresh(); return; }
        const button = event.target.closest('button[data-message-id]');
        const message = button && messages.find(entry => entry.id === button.dataset.messageId);
        if (message) openMessage(message);
    });

    function renderDetail() {
        byId('subject').textContent = subject(selected);
        byId('date').textContent = timeText(selected.createdAt);
        byId('body').textContent = messageBody(selected);
        byId('reference').textContent = selected.reference ? label('reference').replace('{0}', selected.reference) : '';
        const action = byId('action');
        action.hidden = !selected.action;
        action.classList.toggle('is-facebook', selected.action?.type === 'facebook');
        if (selected.action) {
            action.href = selected.action.url;
            const caption = selected.type === 'facebook_follow' ? label('facebook_follow_action') : label(`action_${selected.action.type}`);
            if (selected.action.type === 'facebook') {
                const mark = document.createElement('img');
                mark.className = 'player-mailbox-facebook-mark';
                mark.src = 'assets/auth/facebook-logo.png';
                mark.alt = '';
                mark.width = mark.height = 24;
                mark.setAttribute('aria-hidden', 'true');
                action.replaceChildren(mark, element('span', caption));
            } else action.textContent = caption;
        } else action.removeAttribute('href');
        const referral = byId('referral');
        const referralsEnabled = selected.type === 'facebook_follow' && window.yambReferrals?.isEnabled();
        if (referral) referral.hidden = !referralsEnabled;
        if (byId('referral-panel')) byId('referral-panel').hidden = !referralsEnabled;
        byId('protected-note').hidden = selected.protected !== true;
        archiveButton.hidden = deleteButton.hidden = selected.protected === true;
        archiveButton.textContent = label(selected.archived ? 'restore' : 'archive');
        archiveButton.disabled = manageBusy;
        deleteButton.disabled = manageBusy;
    }

    window.addEventListener('yamb:referralConfig', () => {
        if (selected) renderDetail();
    });

    function openMessage(message) {
        selected = message;
        manageStatus.textContent = '';
        readRetry.hidden = true;
        renderDetail();
        showView('detail');
        byId('subject').focus({ preventScroll: true });
        requestAnimationFrame(() => { if (selected === message) void markOpened(); });
    }

    function resetAccount(id) {
        if (id === activeUid) return;
        activeUid = id;
        ready = false;
        unread = 0;
        messages = [];
        folder = 'inbox';
        nextCursor = '';
        readRevision++;
        selected = null;
        openedAt = null;
        list.replaceChildren();
        renderedRows = '';
        inboxScroll = 0;
        readPending = new Set();
        supportOwner = false;
        supportAvailable = false;
        byId('support').hidden = true;
        byId('compose').hidden = true;
        reportButton.disabled = true;
        supportList.replaceChildren();
        supportStatus.textContent = '';
        supportRequest++;
        reportRequest = '';
        reportStatus.textContent = '';
        reportForm.reset();
        resetPublisher();
        showView('inbox');
        renderBadge();
        renderMessages('loading');
    }

    async function markOpened() {
        if (!room.open || document.hidden || view !== 'detail' || !selected || selected.readAt) return;
        const message = selected;
        const account = activeUid;
        if (readPending.has(message.id) || uid() !== account) return;
        if (!connectedAs(account)) { readRetry.hidden = false; return; }
        const pendingReads = readPending;
        pendingReads.add(message.id);
        try {
            const response = await rpc('player_mailbox_read', { ids: [message.id] });
            if (pendingReads !== readPending || uid() !== account) return;
            if (!response?.ok) throw new Error('Read failed');
            const row = messages.find(entry => entry.id === message.id);
            const countedUnread = row && !row.readAt && !row.archived;
            message.readAt = Date.now();
            readRevision++;
            if (row) row.readAt = message.readAt;
            if (countedUnread) unread = Math.max(0, unread - 1);
            renderBadge();
            renderMessages(roomState);
            if (selected === message) readRetry.hidden = true;
            if (!row) refresh();
        } catch (_) {
            if (pendingReads === readPending && selected === message) readRetry.hidden = false;
        } finally {
            pendingReads.delete(message.id);
        }
    }

    function refresh(before = '') {
        if (typeof before !== 'string') before = '';
        const id = uid();
        resetAccount(id);
        if (!menuActive || document.hidden) return;
        if (!connectedAs(id)) {
            if (room.open) renderMessages('unavailable');
            return;
        }
        if (request) {
            if (!before) queued = true;
            return;
        }
        const socket = boundSocket;
        const summary = !room.open;
        const revision = readRevision;
        const requestedFolder = folder;
        request = rpc('player_mailbox_get', { summary, folder: requestedFolder, before });
        more.disabled = true;
        Promise.resolve(request).then(result => {
            if (id !== activeUid || socket !== boundSocket || !connectedAs(id)) return;
            if (revision !== readRevision || requestedFolder !== folder) { queued = true; return; }
            if (!result?.ok || result.recipientUid !== id || !Number.isInteger(result.unread)
                || (!summary && !Array.isArray(result.messages))) {
                renderMessages('unavailable');
                return;
            }
            unread = result.unread;
            renderBadge();
            if (summary) return;
            const known = new Set(before ? messages.map(message => message.id) : []);
            messages = [...(before ? messages : []), ...result.messages.filter(message => !known.has(message.id))];
            nextCursor = result.next || '';
            ready = true;
            supportOwner = result.supportOwner === true;
            supportAvailable = result.supportAvailable === true;
            byId('support').hidden = !supportOwner;
            byId('compose').hidden = !supportOwner;
            reportButton.disabled = !supportAvailable;
            renderMessages();
        }).catch(() => { if (id === uid() && socket === boundSocket) renderMessages('unavailable'); }).finally(() => {
            request = null;
            more.disabled = false;
            if (queued) {
                queued = false;
                refresh();
            }
        });
    }

    more.addEventListener('click', () => { if (nextCursor && !request) refresh(nextCursor); });
    for (const name of ['inbox', 'archive']) byId(`folder-${name}`).addEventListener('click', () => {
        if (folder === name) return;
        folder = name;
        readRevision++;
        nextCursor = '';
        messages = [];
        ready = false;
        inboxScroll = 0;
        renderMessages('loading');
        room.querySelector('.player-mailbox-content').scrollTop = 0;
        refresh();
    });

    async function manageMessage(action) {
        if (manageBusy || !selected) return;
        if (selected.protected) { manageStatus.textContent = label('protected'); return; }
        const message = selected;
        const account = activeUid;
        if (uid() !== account || !connectedAs(account)) { manageStatus.textContent = label('unavailable'); return; }
        if (action === 'delete' && !window.confirm(label('delete_confirm'))) return;
        manageBusy = true;
        manageStatus.textContent = label('saving');
        renderDetail();
        try {
            const result = await rpc('player_mailbox_manage', { id: message.id, action });
            if (uid() !== account || activeUid !== account) return;
            if (!result?.ok || result.recipientUid !== account) throw new Error('Mail action failed');
            readRevision++;
            messages = messages.filter(row => row.id !== message.id);
            selected = null;
            showView('inbox');
            byId(`folder-${folder}`).focus({ preventScroll: true });
            refresh();
        } catch (_) {
            if (account === activeUid && selected === message) manageStatus.textContent = label('unavailable');
        } finally {
            manageBusy = false;
            if (selected) renderDetail();
        }
    }
    archiveButton.addEventListener('click', () => void manageMessage(selected?.archived ? 'restore' : 'archive'));
    deleteButton.addEventListener('click', () => void manageMessage('delete'));

    function requestId() {
        return [...crypto.getRandomValues(new Uint8Array(18))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    function updatePublishAction() {
        const facebook = byId('publish-action').value === 'facebook';
        byId('publish-url-wrap').hidden = !facebook;
        byId('publish-url').required = facebook;
    }

    function resetPublisher() {
        publishForm.reset();
        updatePublishAction();
        publishStatus.textContent = '';
        publishRequest = '';
    }

    byId('compose').addEventListener('click', () => { showView('publish'); byId('publish-subject').focus(); });
    byId('publish-action').addEventListener('change', updatePublishAction);
    publishForm.addEventListener('input', () => { if (!publishBusy) publishRequest = ''; });
    publishForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (publishBusy || !supportOwner) return;
        const account = activeUid;
        if (!connectedAs(account)) { publishStatus.textContent = label('unavailable'); return; }
        const fields = new FormData(publishForm);
        const type = fields.get('action');
        const title = fields.get('title').trim();
        const text = fields.get('text').trim();
        if (!title || !text) { publishStatus.textContent = label('publish_invalid'); return; }
        if (!window.confirm(label('publish_confirm'))) return;
        const action = type ? { type, url: type === 'facebook' ? fields.get('url').trim()
            : 'https://play.google.com/store/apps/details?id=com.yamb.balkan' } : undefined;
        publishRequest ||= requestId();
        publishBusy = true;
        const controls = [...publishForm.elements];
        controls.forEach(control => { control.disabled = true; });
        try {
            const result = await rpc('player_mailbox_publish', { requestId: publishRequest, title, text, action });
            if (uid() !== account || activeUid !== account) return;
            if (result?.ok && result.recipientUid === account) {
                resetPublisher();
                publishStatus.textContent = label('publish_sent');
                refresh();
            } else publishStatus.textContent = errorLabel(result);
        } catch (_) {
            if (uid() === account && activeUid === account) publishStatus.textContent = label('unavailable');
        } finally {
            publishBusy = false;
            controls.forEach(control => { control.disabled = false; });
        }
    });

    reportButton.addEventListener('click', () => {
        showView('report');
        byId('category').focus({ preventScroll: true });
    });
    reportForm.addEventListener('input', () => { if (!reportBusy) reportRequest = ''; });
    reportForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (reportBusy || !supportAvailable) return;
        const account = activeUid;
        if (!connectedAs(account)) { reportStatus.textContent = label('unavailable'); return; }
        const controls = [...reportForm.elements];
        const data = new FormData(reportForm);
        reportRequest ||= requestId();
        reportBusy = true;
        controls.forEach(control => { control.disabled = true; });
        reportStatus.textContent = label('support_sending');
        try {
            const result = await rpc('player_support_submit', { requestId: reportRequest, category: data.get('category'),
                description: data.get('description'), attachDiagnostics: data.has('attachDiagnostics') });
            if (account !== activeUid || uid() !== account) return;
            if (result?.ok && result.recipientUid === account) {
                reportForm.reset();
                reportRequest = '';
                reportStatus.textContent = label('support_sent').replace('{0}', result.reference);
            } else reportStatus.textContent = errorLabel(result);
        } catch (_) {
            if (account === activeUid) reportStatus.textContent = label('unavailable');
        } finally {
            reportBusy = false;
            controls.forEach(control => { control.disabled = false; });
        }
    });

    function supportCard(ticket, account) {
        const card = document.createElement('article');
        const form = document.createElement('form');
        const title = element('h4', label(`category_${ticket.category}`));
        const reply = document.createElement('textarea');
        reply.required = true;
        reply.maxLength = 550;
        const caption = element('label', label('support_reply_title'));
        caption.append(reply);
        const submit = element('button', label('support_send_reply'));
        submit.type = 'submit';
        const resultMessage = element('p', '');
        resultMessage.setAttribute('role', 'status');
        form.append(caption, submit, resultMessage);
        card.append(title, element('small', timeText(ticket.createdAt)), element('p', label('reference').replace('{0}', ticket.reference)),
            element('p', ticket.description));
        if (ticket.diagnostics) {
            const details = document.createElement('details');
            details.append(element('summary', label('support_attach')));
            for (const key of ['match', 'submission', 'disconnect']) {
                if (ticket.diagnostics[key]) {
                    const fields = Object.entries(ticket.diagnostics[key]).map(([field, value]) => `${field} = ${value}`).join('\n');
                    details.append(element('strong', label(`support_${key}`)), element('pre', fields));
                }
            }
            if (details.children.length === 1) details.append(element('p', label('support_no_diagnostics')));
            card.append(details);
        }
        card.append(form);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (submit.disabled || !reply.value.trim()) return;
            if (!connectedAs(account)) { resultMessage.textContent = label('unavailable'); return; }
            submit.disabled = true;
            reply.readOnly = true;
            try {
                const result = await rpc('player_support_reply', { reference: ticket.reference, text: reply.value });
                if (uid() !== account || activeUid !== account) return;
                if (result?.ok && result.recipientUid === account) {
                    card.remove();
                    supportStatus.textContent = label('support_reply_sent');
                } else resultMessage.textContent = errorLabel(result);
            } catch (_) { resultMessage.textContent = label('unavailable'); }
            finally { submit.disabled = false; reply.readOnly = false; }
        });
        return card;
    }

    async function loadSupport(before = '') {
        const account = activeUid;
        const current = ++supportRequest;
        supportMore.hidden = true;
        if (!before) supportList.replaceChildren();
        byId('support-retry').hidden = true;
        supportCursor = before;
        supportStatus.textContent = label('loading');
        try {
            if (!connectedAs(account)) throw new Error('Support unavailable');
            const result = await rpc('player_support_list', { before });
            if (current !== supportRequest || uid() !== account) return;
            if (!result?.ok || result.recipientUid !== account) throw new Error('Unable to load support');
            supportList.append(...result.rows.map(ticket => supportCard(ticket, account)));
            supportStatus.textContent = supportList.children.length ? '' : label('support_empty');
            supportCursor = result.next;
            supportMore.hidden = !supportCursor;
        } catch (_) {
            if (current === supportRequest) {
                supportStatus.textContent = label('unavailable');
                byId('support-retry').hidden = false;
            }
        }
    }

    byId('support').addEventListener('click', () => { showView('support'); back.focus(); void loadSupport(); });
    supportMore.addEventListener('click', () => void loadSupport(supportCursor));
    byId('support-retry').addEventListener('click', () => void loadSupport(supportCursor));
    back.addEventListener('click', () => {
        const previous = view;
        const message = selected?.id;
        selected = null;
        showView('inbox');
        const target = previous === 'detail' ? [...list.querySelectorAll('button')].find(button => button.dataset.messageId === message)
            : previous === 'support' ? byId('support') : previous === 'publish' ? byId('compose') : reportButton;
        (target || close).focus({ preventScroll: true });
    });
    readRetry.addEventListener('click', () => void markOpened());

    function openInbox() {
        if (room.open) return;
        room.showModal();
        close.focus({ preventScroll: true });
        resetAccount(uid());
        openedAt = Date.now();
        inboxScroll = 0;
        showView('inbox');
        renderMessages(ready ? roomState : 'loading');
        refresh();
    }

    function closeInbox(showAd = false) {
        if (!room.open) return;
        const viewedLongEnough = openedAt !== null && Date.now() - openedAt >= 8000;
        openedAt = null;
        room.close();
        if (showAd && viewedLongEnough) {
            void Promise.resolve().then(() => {
                const app = window.app;
                if (menuActive && !document.hidden && app?.nativeAppActive !== false
                    && !app?.gameActive && !app?.onlineMode && !app?.isSpectator) return app?.adMob?.showInterstitial?.();
            }).catch(() => {});
        }
    }

    trigger.addEventListener('click', () => {
        const app = window.app;
        if (!app?.shouldPlayThemedRoomIntro?.('mailbox')) { openInbox(); return; }
        const visit = menuVisit;
        const account = uid();
        // Native dialogs sit above the intro overlay in the browser's top layer.
        app.playEasterRoomIntro('mailbox', () => {
            if (menuActive && visit === menuVisit && account === uid()) openInbox();
        }, { afterIntro: true });
    });
    retry.addEventListener('click', refresh);
    close.addEventListener('click', () => closeInbox(true));
    room.addEventListener('cancel', event => {
        event.preventDefault();
        closeInbox(true);
    });
    room.addEventListener('close', () => {
        if (room.open) return;
        selected = null;
        openedAt = null;
        if (menuActive) trigger.focus({ preventScroll: true });
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { refresh(); void markOpened(); }
    });
    window.addEventListener('storage', event => {
        if (event.key === 'yamb_uid') refresh();
    });
    window.addEventListener('yamb:languageChanged', () => {
        renderBadge();
        renderMessages(roomState);
        if (view === 'detail' && selected) renderDetail();
    });

    window.playerMailbox = {
        iconSource(theme) {
            const root = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
            return `${root}/canonical/player-mailbox/post-v1.png`;
        },
        applyTheme(theme) {
            const source = this.iconSource(theme);
            icons.forEach(icon => { if (icon.getAttribute('src') !== source) icon.src = source; });
        },
        navigate(screen) {
            menuActive = screen === 'main-menu';
            if (menuActive) refresh();
            else {
                menuVisit++;
                closeInbox();
            }
        },
        refresh,
        bindSocket(socket) {
            if (boundSocket === socket) return;
            boundSocket = socket;
            socket.on('player_mailbox_changed', data => {
                if (socket === boundSocket && data?.recipientUid === uid()) refresh();
            });
            socket.on('player_mailbox_official_changed', () => { if (socket === boundSocket) refresh(); });
            socket.on('disconnect', () => { if (socket === boundSocket) renderMessages('unavailable'); });
        }
    };
})();
