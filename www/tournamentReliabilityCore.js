(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.tournamentReliabilityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const VERSION = '2026-11-11-reliability-v1';
    const CLIENT_PROTOCOL = 'yamb-tournament-6';
    const isManaged = state => state?.reliabilityPolicyVersion === VERSION;
    const isNotice = notice => ['reliability_warning', 'reliability_suspension'].includes(notice?.kind);
    const accepts = (state, payload) => !state?.reliabilityPolicyVersion
        || (isManaged(state) && payload?.clientProtocol === CLIENT_PROTOCOL);

    function copy(notice, language) {
        const english = language === 'en';
        if (notice.kind === 'reliability_suspension') return english ? {
            title: 'One tournament suspension',
            body: `You cannot enter tournament ${notice.blockedEdition} after a second verified inactivity incident. You can enter later editions.`
        } : {
            title: 'Suspenzija za jedan turnir',
            body: `Zbog ponovljene dokazane neaktivnosti ne možete da se prijavite za ${notice.blockedEdition}. turnir. Na narednim izdanjima možete ponovo da učestvujete.`
        };
        return english ? {
            title: 'Tournament inactivity warning',
            body: 'A verified inactivity incident was recorded. A repeat in your next three tournament appearances means missing one edition.'
        } : {
            title: 'Upozorenje zbog neaktivnosti',
            body: 'Zabeležena je dokazana neaktivnost. Ako se ponovi u naredna tri nastupa, preskačete jedno izdanje turnira.'
        };
    }

    return { VERSION, CLIENT_PROTOCOL, isManaged, isNotice, accepts, copy };
});
