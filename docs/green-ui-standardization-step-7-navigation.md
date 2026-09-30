# Green UI standardizacija — korak 7: navigacija kroz strane (N1)

Datum: 2026-09-30. Opseg: Zelena tema (`dark`). Bez builda, commita i objavljivanja.

## Nalazi i ispravke

| Soba | Nalaz | Ispravka |
|---|---|---|
| Pravila (6 strana) | Nativni horizontalni scroll-snap i dodatni `touchend` istovremeno obrađuju jedan swipe; u Green temi to može preskočiti stranu. | Green ostavlja nativni scroll-snap kao jedini mehanizam prevlačenja. Scroll događaj i dalje ažurira aktivnu tačku/`aria-current`; klik tačke i dalje ide na traženu stranu. Pri novom otvaranju Pravila počinju od prve strane, kao i ranije. |
| Statistika / H2H (2 strane) | Ranije otvorena H2H strana ostajala je pri ponovnom ulasku u Green Statistiku; deljenje sa nulom ili prevelik indeks mogli su poremetiti aktivnu tačku. | Green pri novom ulasku vraća pregled na stranu 1 i usklađuje tačku. Izbor strane se ograničava brojem strana, a indeks aktivne tačke se štiti od nulte širine. Nativni scroll-snap i `scroll` sinhronizacija ostaju. |
| Kvartalna liga (6 rangova) | Fiksni prag prevlačenja od 120 px previsok je na uskom telefonu; prekinut dodir mogao je ostaviti track pomeren. | Green prag sada zavisi od širine kartice (45–120 px). `touchcancel` vraća track na aktivni rang. Klik tačke i swipe ostaju sinhronizovani preko `updateSlide()` i `aria-current`. Pri otvaranju prikazuje se lični rang, kao i ranije. |
| Sve tri | Tačka je imala vizuelnih 10 px, ali samo 32 px zonu dodira. | Green tačke sada imaju 44 × 44 px interaktivnu zonu uz isti 10 px vizuelni centar, vidljiv fokus tastaturom i zbijen razmak u Pravilima da svih šest stane u širinu 320 px. |

## Provera

- Na lokalnom Green DOM-u pri viewportu 320 × 568: tema `dark`, svih 6 tačaka Pravila širine 44 px; zbir njihovih širina je 264 px, podnožje 298 px. Tačke Statistike su takođe 44 px.
- `npm test` je prošao (JS, pravila, liga, online tokovi, performance i Green asset coverage). `check-theme-performance` uključuje regresione uslove za N1.
- Glavni meni i sobe lokalne stranice zahtevaju prijavu, pa klik/swipe u svim aktivnim sobama **nije potvrđen na Android emulatoru**. DOM merenje i test izvornog koda nisu zamena za vizuelni i dodirni QA na uređaju.

Sledeći korak iz mape: Q1 — stanja, lokalizacija i pristupačnost, pa završni vizuelni prolaz svih soba.
