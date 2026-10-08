# Nagradni video · paket v1

Datum: 2026-10-07. Zelena tema ostaje zaključana referenca. Devet drugih tema imaju originalne tikete za nagradni video u svom materijalu i paleti, bez prebojavanja tuđe ikone.

Po temi postoji sedam produkcionih RGBA PNG uloga: aktivno 256 × 256, aktivno malo 128 × 128, nedostupno 256 × 256, nedostupno malo 128 × 128, Dnevni izazov sa jednim dukatom 384 × 384, Riznica sa jednim dukatom 256 × 256 i Solo dvostruka nagrada sa dva dukata 384 × 384. Sva tri nagradna prikaza koriste isti video tiket te teme i dukat sa pet tačaka. Ukupno je povezano 63 PNG mesta.

Masteri su u `source-assets/theme-icon-packs/<id>/rewarded-video-v1/`, a isporučni PNG-ovi u `www/assets/theme-packs/<id>/`. `www/theme-rewarded-video-pack.js` bira aktivnu temu na postojećim mestima ekonomije, pravila, Dnevnog izazova, Riznice i Solo završetka. `www/game.js` priprema te fajlove po sobi, ne u početnom učitavanju. Katalog je ažuriran na `linked`; vizuelni QA u stvarnoj aplikaciji i na telefonu ostaje otvoren.

Android QA 2026-10-08: posle prelaska na `Easter_QA_10GB` emulator, `qaLocal` build je učitao svih 7 PNG uloga u svakoj od devet tema, ukupno 63/63. U stvarnom WebView-u provereni su mapiranje postojećih DOM ikona i dekodiranje slika. Pronađen je i uklonjen CSS konflikt zbog kog je stara ikona nedostupnog videa ostajala vidljiva u Pustinjskom Staklu; ponovljena provera potvrđuje nula vidljivih starih ikona u svih devet tema. Dokaz: [qa-theme-rewarded-video-emulator-2026-10-08.json](qa-theme-rewarded-video-emulator-2026-10-08.json). Tok gledanja i dodele nagrade, kao i detaljan vizuelni pregled svakog pojedinačnog ekrana, ostaju zasebna QA stavka.

[Pregled svih devet paketa](theme-rewarded-video-review.html). Provere: `node scripts/check-rewarded-video-pack.js` i `node scripts/check-theme-design-spec.js`.
