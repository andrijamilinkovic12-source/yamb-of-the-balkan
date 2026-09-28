# Green Asset Standardization — Korak 4

## Ishod

Svih sedam složenih Green PNG kompozicija koje su sadržale alternativni prikaz valute prerenderovano je sa kanonskim dukatom. Postojeći smisao, raspored, Soft Clay materijal i transparentna pozadina su sačuvani.

| Kompozicija | Novi master | Runtime |
|---|---|---|
| Dukati / Ispravi upis — free | `ducats-undo-free-v3.png` | 512 px + 384 px menu |
| Dukati / Ispravi upis — pro | `ducats-undo-pro-v2.png` | 512 px |
| Glavna ikona Riznice | `treasury-free-v3.png` | 512 px + 384 px menu |
| Dnevni izazov — nagradni video | `daily/reward-video-v2.png` | 384 px |
| Riznica — nagradni video | `treasury/reward-video-v2.png` | 256 px |
| Solo — dupliranje nagrade | `solo/finish-reward-video-v2.png` | 384 px |
| Pravila — Dukati, tokeni i Riznica | `rules/pages/economy-treasury-v2.png` | 512 px |

## Zajednički render prompt

Za svaki asset korišćen je built-in ImageGen u režimu `precise-object-edit`, uz ciljni PNG kao Image 1 i tri odobrena kanonska mastera kao reference. Osnovni zahtev je bio:

> Zameniti samo novčić ili novčiće kanonskim Green dukatom: terracotta clay lice i telo, debeo zaobljen ivory clay obod i tačno pet tamnozelenih zaobljenih kvadratnih tačaka u rasporedu četiri ugla plus centar. Sačuvati originalnu kompoziciju, ugao, osvetljenje, senke, transparentnost i sve nevalutne simbole.

Posebni invarianti po kompoziciji:

- Undo strelice i Undo token nisu menjani.
- Video okvir, play trougao i filmske perforacije nisu menjani.
- Kovčezi, brave i lisnati ukrasi na samim kovčezima nisu menjani.
- Solo terracotta zraci ispod play trougla nisu menjani.
- Medalje, pehari i takmičarski bedževi nisu deo ovog koraka.

## Integracija i optimizacija

- Aplikacija i Green preload/room paketi sada koriste samo nove verzije.
- Starih devet runtime kopija uklonjeno je iz `www`; originalni high-resolution masteri su zadržani u `source-assets/green-soft-clay-hires`.
- Runtime PNG fajlovi imaju direktan alpha kanal i najveću dimenziju 512 px.
- Reprodukcija runtime paketa je automatizovana skriptom `scripts/build-green-standardized-compositions.py`.
