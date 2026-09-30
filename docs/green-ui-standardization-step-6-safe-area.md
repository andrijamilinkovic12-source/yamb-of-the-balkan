# Green UI standardizacija — korak 6: safe area i responsivnost (S1)

Datum: 2026-09-30. Opseg: Zelena tema (`dark`). Bez builda, commita i objavljivanja.

## Konkretni nalazi i ispravke

1. **Kratak telefon / glavni meni.** Na 320 × 568 lokalni DOM je imao 722 px sadržaja u meniju visine 568 px, dok je `overflow-y: hidden` onemogućavao pristup donjim ikonama. Za Green ekrane do 740 px visine i 599 px širine meni sada koristi unutrašnji skrol, ne sabija direktnu decu i ostavlja donji sistemski inset. Posle izmene: 721 px sadržaja, `overflow-y: auto`, zadržan donji razmak 35 px u browseru bez notch insets. Standardni 390 × 844 prikaz ostaje na dosadašnjem rasporedu.
2. **Global chat i tastatura.** Zajednički `globalchat.js` drži staru promenljivu `--global-chat-height` na najmanje 320 px. Kad vidljivi viewport padne ispod 320 px, Green chat je zbog toga mogao da ostane ispod tastature. Kod sada beleži i stvarnu `--green-visible-viewport-height`; samo Green telo preusmerava `--global-chat-height` na tu vrednost. Druge teme ostaju na staroj promenljivoj. Na testnom viewportu 320 × 280 izračunata Green visina je 280 px, a chat panel 254 px; korenska/ostale teme i dalje imaju minimum 320 px.

## Pregled ostalih površina

| Površina | Nalaz u kodu/lokalnom DOM-u | Status |
|---|---|
| Statistika, Podešavanja, Top lista, Turnir | Na 320 × 568 izračunate granice panela ostaju unutar viewporta; unutrašnji skrol postoji u telima panela. | CSS/DOM provera; aktivne sobe na telefonu otvorene. |
| Pravila | Na 320 × 568 kartica je od 10 do 552 px, sa odvojenim skrolom sadržaja i podnožjem. | CSS/DOM provera; svih šest strana i dodir pri sistemskoj navigaciji otvoreni. |
| Global chat, Online igrači, Dukati/Undo | Chat i Online igrači koriste gornji/donji inset; ekonomija ima full-screen shell, ali unutrašnji header/footer i stranice čuvaju safe zonu. | CSS provera; aktivni overlay, tastatura i native ad banner otvoreni. |
| Dnevni izazov, Kvartalna liga | Green overlay koristi `env(safe-area-inset-*)`, ograničenje visine kartice i sopstveni skrol. | Kod proveren; stvarni rezultati, duga lista i kratki ekran otvoreni. |
| Igra i waiting modovi | `--safe-top`/`--safe-bottom` i skrol waiting ekrana postoje; landscape ispod 600 px je zaključan posebnim overlayem. | Kod proveren; board, kontrole i online stanja na emulatoru otvoreni. |

## Granica potvrde

Browser merenje simulira širinu i visinu viewporta, ali ne Android status bar, izrez/notch, gesture bar, otvorenu virtuelnu tastaturu ili native reklamni banner. Emulator se prethodno nije mogao pouzdano snimiti alatom, pa **S1 još nije vizuelno zatvoren** u tim stanjima. `npm test` prolazi; regresiona provera sada zaključava kratki Green meni i promenljivu vidljivog viewporta.

Sledeći planirani korak iz mape je N1 — navigacija između strana Pravila, Statistike/H2H i Kvartalne lige.
