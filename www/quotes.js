const quotesDb = [
    // --- CITATI O USPEHU I ISTRAJNOSTI (Originalnih 26) ---
    {
        sr: { text: "Nikad nemoj odustati, jer uvek postoji vreme i mesto kada će se plima promeniti.", author: "Herijet Bičer Stou" },
        en: { text: "Never give up, for that is just the place and time that the tide will turn.", author: "Harriet Beecher Stowe" }
    },
    {
        sr: { text: "Kreativan čovek motivisan je željom da postigne, a ne željom da pobedi druge.", author: "Ajn Rand" },
        en: { text: "A creative man is motivated by the desire to achieve, not by the desire to beat others.", author: "Ayn Rand" }
    },
    {
        sr: { text: "Ama, misli dobro, pa će dobro i biti.", author: "Ivo Andrić" },
        en: { text: "Just think well, and all will be well.", author: "Ivo Andrić" }
    },
    {
        sr: { text: "Neka ti udica bude uvek bačena. U jezeru u kojem najmanje očekuješ, pojaviće se riba.", author: "Ovidije" },
        en: { text: "Let your hook always be cast. In the pool where you least expect it, there will be a fish.", author: "Ovid" }
    },
    {
        sr: { text: "Velika je nesreća kad čovek ne zna šta hoće, a prava katastrofa kad ne zna šta može.", author: "Jovan Dučić" },
        en: { text: "It is a great misfortune when a man does not know what he wants, and a true disaster when he does not know what he can do.", author: "Jovan Dučić" }
    },
    {
        sr: { text: "Odreknite se života sa samosažaljevanjem u zamenu za život sa svrhom.", author: "Nik Vujičić" },
        en: { text: "Give up a life of self-pity in exchange for a life of purpose.", author: "Nick Vujicic" }
    },
    {
        sr: { text: "Jedno ljudsko biće je jedan od 40.000 spermatozoida. Taj jedan je uspeo. 39.999 nisu uspeli. Znači, vi ste šampioni. Svako ko se rodio on je već uspeo.", author: "Zoran Đinđić" },
        en: { text: "A human being is one out of 40,000 spermatozoa. That one succeeded. 39,999 failed. That means you are champions. Everyone who is born has already succeeded.", author: "Zoran Đinđić" }
    },
    {
        sr: { text: "Za dvadeset godina, bićete više razočarani stvarima koje niste učinili nego stvarima koje jeste. Zato isplovite iz sigurne luke. Istražujte. Sanjajte. Otkrijte.", author: "Mark Tven" },
        en: { text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do. So throw off the bowlines. Sail away from the safe harbor. Explore. Dream. Discover.", author: "Mark Twain" }
    },
    {
        sr: { text: "Većinu važnih stvari u svetu postigli su ljudi koji nisu odustajali kada se činilo da uopšte nema nade.", author: "Dejl Karnegi" },
        en: { text: "Most of the important things in the world have been accomplished by people who have kept on trying when there seemed to be no hope at all.", author: "Dale Carnegie" }
    },
    {
        sr: { text: "Preko noći postaje slavan samo onaj ko je danima neumorno radio.", author: "Henri Ford" },
        en: { text: "Only he who has worked tirelessly for days becomes famous overnight.", author: "Henry Ford" }
    },
    {
        sr: { text: "Krenite korak po korak. Ne morate videti čitavo stubište. Samo napravite prvi korak.", author: "Martin Luter King" },
        en: { text: "Take the first step in faith. You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." }
    },
    {
        sr: { text: "Nema više spavanja. Vreme je za akciju. Spavaćete kada odete u penziju.", author: "Zoran Đinđić" },
        en: { text: "No more sleeping. It is time for action. You will sleep when you retire.", author: "Zoran Đinđić" }
    },
    {
        sr: { text: "Pitanje nije ko će da mi dozvoli, već ko će da me zaustavi.", author: "Ajn Rand" },
        en: { text: "The question isn't who is going to let me; it's who is going to stop me.", author: "Ayn Rand" }
    },
    {
        sr: { text: "Sve je dostižno! Nemoguće postoji samo kod ludaka.", author: "Napoleon Bonaparta" },
        en: { text: "Everything is attainable! Impossible is a word to be found only in the dictionary of fools.", author: "Napoleon Bonaparte" }
    },
    {
        sr: { text: "Svi vaši snovi mogu postati stvarnost – ukoliko imate hrabrosti da ih sledite.", author: "Volt Dizni" },
        en: { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney" }
    },
    {
        sr: { text: "Čovek koji premeće planine, započinje premetanjem kamenčića.", author: "Kineska poslovica" },
        en: { text: "The man who moves a mountain begins by carrying away small stones.", author: "Chinese Proverb" }
    },
    {
        sr: { text: "Ja ne verujem u pesimizam. Ako nešto ne ide onako kako mi želimo, idi napred. Ako misliš da će padati kiša, padaće.", author: "Klint Istvud" },
        en: { text: "I don't believe in pessimism. If something doesn't come up the way you want, forge ahead. If you think it's going to rain, it will.", author: "Clint Eastwood" }
    },
    {
        sr: { text: "Oluje čine da hrastovi puštaju dublje korenje.", author: "Džordž Herbert" },
        en: { text: "Storms make oaks take deeper root.", author: "George Herbert" }
    },
    {
        sr: { text: "Nije bitno ko započinje igru već ko je završava.", author: "Džon Vuden" },
        en: { text: "It's not so important who starts the game but who finishes it.", author: "John Wooden" }
    },
    {
        sr: { text: "Bolje je boriti se i gubiti bitku nego nikada se ne izboriti.", author: "Hegel" },
        en: { text: "It is better to fight and lose the battle than never to fight at all.", author: "Georg Wilhelm Friedrich Hegel" }
    },
    {
        sr: { text: "Bez muke se pesma ne ispoja, bez muke se sablja ne sakova!", author: "Petar Petrović Njegoš" },
        en: { text: "Without toil, a song is not sung; without toil, a sword is not forged!", author: "Petar II Petrović-Njegoš" }
    },
    {
        sr: { text: "Ko ima volje, ima i načina.", author: "Džordž Bernard Šo" },
        en: { text: "Where there's a will, there's a way.", author: "George Bernard Shaw" }
    },
    {
        sr: { text: "Pobeda je najslađa kada već okusite poraz.", author: "Malkolm Forbs" },
        en: { text: "Victory is sweetest when you've known defeat.", author: "Malcolm Forbes" }
    },
    {
        sr: { text: "Nikada ne smete odustati. Pobednici nikad ne odustaju, a ljudi koji odustaju nikad ne pobeđuju.", author: "Ted Tarner" },
        en: { text: "You should never give up. Winners never quit, and quitters never win.", author: "Ted Turner" }
    },
    {
        sr: { text: "Izgleda nemoguće, dokle god se ne završi.", author: "Nelson Mandela" },
        en: { text: "It always seems impossible until it's done.", author: "Nelson Mandela" }
    },
    {
        sr: { text: "Prvo te ignorišu, onda ti se smeju, onda te biju, i onda pobeđuješ.", author: "Mahatma Gandi" },
        en: { text: "First they ignore you, then they laugh at you, then they fight you, then you win.", author: "Mahatma Gandhi" }
    },

    // --- CITATI O LJUBAVI (Novih 27) ---
    {
        sr: { text: "Od ljubavi se ne živi ali se za nju gine.", author: "Srpske poslovice" },
        en: { text: "You don't live on love, but you die for it.", author: "Serbian Proverb" }
    },
    {
        sr: { text: "Ljubav se sastoji od jedne duše koja nastanjuje dva tela.", author: "Aristotel" },
        en: { text: "Love is composed of a single soul inhabiting two bodies.", author: "Aristotle" }
    },
    {
        sr: { text: "Nema vremena za svakodnevnu dosadu. Postoji vreme za rad. I vreme za ljubav. To ne ostavlja prostor za neko drugo vreme.", author: "Koko Šanel" },
        en: { text: "There is no time for cut-and-dried monotony. There is time for work. And time for love. That leaves no other time.", author: "Coco Chanel" }
    },
    {
        sr: { text: "Ni haljinu ne valja krpiti, a kamoli ljubav. Bolje je otići.", author: "Meša Selimović" },
        en: { text: "You shouldn't patch up a dress, let alone love. It is better to leave.", author: "Meša Selimović" }
    },
    {
        sr: { text: "Poljubac je divan trik dizajniran od strane prirode da zaustavi govor kada reči postanu suvišne.", author: "Ingrid Bergman" },
        en: { text: "A kiss is a lovely trick designed by nature to stop speech when words become superfluous.", author: "Ingrid Bergman" }
    },
    {
        sr: { text: "Brak čini troje: ljubav, poverenje i strpljenje.", author: "Branislav Nušić" },
        en: { text: "Marriage is made of three things: love, trust, and patience.", author: "Branislav Nušić" }
    },
    {
        sr: { text: "Može li se ikada zaboraviti ono što se jednom ljubilo?", author: "Žan Žak Ruso" },
        en: { text: "Can one ever forget what one has once loved?", author: "Jean-Jacques Rousseau" }
    },
    {
        sr: { text: "Nije važno koliko radiš, već je važno koliko ljubavi unosiš u ono što radiš i koliko to daruješ drugima.", author: "Majka Tereza" },
        en: { text: "It's not how much you do, but how much love you put into the doing and give to others.", author: "Mother Teresa" }
    },
    {
        sr: { text: "Ako voliš nekoga, reci mu to, jer srce može biti slomljeno i rečima koje se ne izgovore…", author: "Žarko Laušević" },
        en: { text: "If you love someone, tell them, because a heart can be broken by words left unspoken...", author: "Žarko Laušević" }
    },
    {
        sr: { text: "Ljubav nema godina, ona se uvek rađa.", author: "Blez Paskal" },
        en: { text: "Love has no age, it is always being born.", author: "Blaise Pascal" }
    },
    {
        sr: { text: "U svaku ženu, koja mi se dopada, smrtno se zaljubim. To traje sve dotle, dok se u drugu ne zaljubim još više.", author: "Đakomo Kazanova" },
        en: { text: "I fall madly in love with every woman I like. That lasts until I fall even more in love with another.", author: "Giacomo Casanova" }
    },
    {
        sr: { text: "Sve što trebate je ljubav.", author: "Džon Lenon" },
        en: { text: "All you need is love.", author: "John Lennon" }
    },
    {
        sr: { text: "Gospođo, ja sam u vas neizlečivo zaljubljen.", author: "Miroslav Mika Antić" },
        en: { text: "Madam, I am incurably in love with you.", author: "Miroslav Mika Antić" }
    },
    {
        sr: { text: "Što manje ženu volimo, to joj se više sviđamo.", author: "Aleksandar Sergejevič Puškin" },
        en: { text: "The less we love a woman, the more she likes us.", author: "Alexander Pushkin" }
    },
    {
        sr: { text: "Kako mogu da mrzim nekoga ko mi je pružio samo ljubav?", author: "Paulo Koeljo" },
        en: { text: "How can I hate someone who gave me nothing but love?", author: "Paulo Coelho" }
    },
    {
        sr: { text: "Zaljubljivanje je nešto dobro, zabavno, i može umnogome da obogati život. Ali razlikuje se od ljubavi. Ljubav nema cenu, i ne treba je menjati ni za šta.", author: "Paulo Koeljo" },
        en: { text: "Falling in love is a good thing, fun, and can enrich life immensely. But it differs from love. Love has no price, and it shouldn't be exchanged for anything.", author: "Paulo Coelho" }
    },
    {
        sr: { text: "Oni koji duboko vole nikad ne ostare; ako i umru od starosti, umru mladi.", author: "Žarko Laušević" },
        en: { text: "Those who love deeply never grow old; they may die of old age, but they die young.", author: "Žarko Laušević" }
    },
    {
        sr: { text: "I ako uopšte znam šta je ljubav, onda to znam zbog tebe.", author: "Herman Hese" },
        en: { text: "If I know what love is, it is because of you.", author: "Hermann Hesse" }
    },
    {
        sr: { text: "Ljubav je igra koju može igrati dvoje, a da oboje pobede.", author: "Eva Gabor" },
        en: { text: "Love is a game that two can play and both win.", author: "Eva Gabor" }
    },
    {
        sr: { text: "Jedino je ljubav prava, i jedino što vredi u životu je ljubav.", author: "Džon Lenon" },
        en: { text: "Only love is real, and the only thing worth living for is love.", author: "John Lennon" }
    },
    {
        sr: { text: "Sami smo na rođenju, sami smo tokom života i umiremo sami. Jedino uz pomoć ljubavi i prijateljstva možemo da stvorimo iluziju, bar na momenat da nismo sami.", author: "Orson Vels" },
        en: { text: "We're born alone, we live alone, we die alone. Only through our love and friendship can we create the illusion for the moment that we're not alone.", author: "Orson Welles" }
    },
    {
        sr: { text: "Ljubav je najjača snaga koju sebi svet može predstaviti, a istovremeno i najskromnija.", author: "Mahatma Gandi" },
        en: { text: "Love is the strongest force the world possesses, and yet it is the humblest imaginable.", author: "Mahatma Gandhi" }
    },
    {
        sr: { text: "Biti duboko voljen od nekog vam daje snagu, a voleti nekoga duboko vam daje hrabrost.", author: "Lao Ce" },
        en: { text: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.", author: "Lao Tzu" }
    },
    {
        sr: { text: "Ljubavnicima je vreme uvek kratko i nijedna staza nije dovoljno dugačka.", author: "Ivo Andrić" },
        en: { text: "For lovers, time is always short and no path is ever long enough.", author: "Ivo Andrić" }
    },
    {
        sr: { text: "Prava ljubav razmišlja o trenutku i o večnosti, ali nikad o trajanju.", author: "Niče" },
        en: { text: "True love thinks of the moment and of eternity, but never of duration.", author: "Friedrich Nietzsche" }
    },
    {
        sr: { text: "Samo se srcem može zaista gledati. Ono što je suštinski važno, nevidljivo je oku.", author: "Antoan de Sent Egziperi" },
        en: { text: "It is only with the heart that one can see rightly; what is essential is invisible to the eye.", author: "Antoine de Saint-Exupéry" }
    },
    {
        sr: { text: "Gravitacija nije odgovorna što se ljudi zaljubljuju.", author: "Albert Ajnštajn" },
        en: { text: "Gravitation is not responsible for people falling in love.", author: "Albert Einstein" }
    }
];