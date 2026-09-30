# Green UI standardizacija — korak 4: kartice i kontrole (G1/G2)

Datum: 2026-09-29. Opseg: samo Zelena tema (`dark`). Bez builda, commita i objavljivanja.

## Nalazi i izmene

- Standardni veliki paneli (Top lista, Statistika, Podešavanja, Turnir, Global chat, Online igrači) već su imali ciljnu mobilnu širinu i radijus 20 px, ali je generičko `.modal-box { max-width: 450px; }` na desktopu ograničavalo prva tri panela. Green pravilo sada dopušta njihove predviđene širine i svima daje zajednički radijus/box-sizing.
- Top lista je imala kasnije pravilo u `index.html` koje je nadjačavalo Green clay pozadinu i vraćalo generičko staklo. Green selektor sada ima dovoljnu specifičnost da sačuva njenu zelenu površinu.
- Zatvaranje: postojeća Green X dugmad dele 44 × 44 px zonu dodira, kružni oblik i isti clay izgled. Generički modal je prikazivao slovo `X`; u Green temi sada prikazuje isti znak `×` kao sobe. Zaglavlja imaju najmanje 58 px i razmak prema X dugmetu.
- Dnevni izazov (430 px), Kvartalna liga (450 px) i Riznica (full-screen ekonomija) nisu slepo presvedeni na široki standardni panel: njihove posebne mere prate funkciju i zahtevaju zaseban vizuelni prolaz.

## Merena provera u lokalnom browseru

Izračunati CSS na stvarnim DOM elementima (ne statička ilustracija), nakon osvežavanja `teme.css?v=6.87`:

| Površine | 1280 × 720 | 390 × 844 | Radijus |
|---|---:|---:|---:|
| Top lista, Statistika, Podešavanja, Turnir, Global chat, Online igrači | 760 px svaka | 370 px svaka | 20 px svaka |

Devet trenutno prisutnih X elemenata u DOM-u (Statistika, Podešavanja, Top lista, Riznica, Global chat, Online igrači, Turnir, Undo i zajednički modal) vratili su 44 × 44 px, 50% radius i isti Green gradijent. Top lista je vratila Green gradijent površine, a ne generički stakleni panel. Lokalni browser je služio za merenje; aplikacija je bila na splash stanju, pa ovo **nije** vizuelna potvrda otvorenih soba, liginih/dnevnih dinamičkih stanja ili rada klikova u emulatoru.

## Status i otvorena provera

- **Kod i CSS merenje potvrđeni** za šest standardnih panela i devet prisutnih X kontrola na dve širine; `npm test` prolazi.
- **Vizuelno otvoreno**: svaka soba u aktivnom stanju na emulatoru, uključujući Pravila, Kvartalnu ligu, Dnevni izazov i modal preko igranja; oba jezika i duži naslovi; pritiskanje X i primarnih/sekundarnih dugmadi; uski/kratki ekran. Bez toga G1/G2 nije proglašen potpuno završenim.
- Sledeći planirani korak iz mape je P1 — centriranje kockica, Google avatara i containment sadržaja u karticama. To nije deo ove CSS geometrijske provere.
