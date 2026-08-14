# Sistema visivo — battafit

Riferimento per mantenere coerenti gli interventi futuri. Le scelte qui sotto
sono già implementate in `src/app.css`; questo file spiega il perché, che il CSS
da solo non racconta.

## Direzione

**Telemetria.** Un centro di controllo sulla propria salute: fondo quasi nero,
pannelli che sembrano strumenti, e la luce che viene solo dal dato. La scena
d'uso è la sera, dopo l'allenamento, spesso al telefono a luci basse — un tema
chiaro costringerebbe a guardare un rettangolo bianco al buio.

Il tema è **solo scuro**, per scelta e non per pigrizia. Se un giorno servisse
anche il chiaro, i token sono già isolati in `@theme`: si tratta di aggiungere
un secondo blocco, non di riscrivere i componenti.

Modalità: **Operate**. È uno strumento che si consulta, non una pagina che
convince. Scansionabilità e coerenza vengono prima dell'espressività; il
carattere sta nei dettagli, non negli effetti.

> Nota storica: fino ad agosto 2026 il tema era *universo Spider-Man* — fondo blu
> notte, rosso e azzurro della tuta, ambra dei lampioni. È stato sostituito per
> intero. Quello che è sopravvissuto al cambio è il metodo, non le tinte: la
> palette resta verificata a macchina, la spina dorsale è ancora il divisore
> della testata, le regole sui grafici non sono cambiate di una riga.

## Colore — quattro canali, non una tavolozza

La regola che tiene insieme tutto non è cromatica ma semantica. Ogni colore ha
un canale, e **un pannello non sceglie la propria tinta: la eredita dal tipo di
dato che contiene.**

| Canale | Token | Valore | Significa |
|---|---|---|---|
| Movimento | `--color-motion` | `#e31b36` | attività, passi, allenamenti |
| Biometria | `--color-bio` | `#38bdf8` | cuore, sonno, respiro, variabilità |
| Carico | `--color-load` | `#f6b73c` | energia, sforzo, attenzione |
| Completo | `--color-done` | `#22c55e` | **soltanto** ciò che è chiuso |

Il verde non è mai un colore di serie e il rosso non è mai «il primo colore
disponibile». Se una tinta compare fuori dal suo canale, l'interfaccia comincia a
mentire: un pannello rosso che parla di sonno insegna che il rosso non vuol dire
niente, e da lì in poi non lo vuol dire davvero.

`--color-warning` è l'oro del canale carico, e non è una coincidenza: nel
vocabolario di questa interfaccia «attenzione» e «sforzo» sono la stessa
famiglia. `--color-critical` è il rosso acceso, un gradino sopra il rosso
dell'attività, e non compare mai senza un'icona accanto.

### Gli otto posti delle serie

Per i grafici a più metriche servono più di quattro tinte. Gli slot sono in
**ordine fisso**, e l'ordine non è estetico: è il meccanismo che tiene separate
le coppie che finirebbero affiancate.

| Slot | Token | Valore | |
|---|---|---|---|
| 1 | `--color-s1` | `#e31b36` | = canale movimento |
| 2 | `--color-s2` | `#38bdf8` | = canale biometria |
| 3 | `--color-s3` | `#f6b73c` | = canale carico |
| 4 | `--color-s4` | `#a78bfa` | viola |
| 5 | `--color-s5` | `#2dd4bf` | verdeacqua |
| 6 | `--color-s6` | `#fb923c` | arancio |
| 7 | `--color-s7` | `#22d3ee` | ciano |
| 8 | `--color-s8` | `#f472b6` | rosa |

I primi tre coincidono con i canali: chi legge un grafico a una serie sta già
leggendo il colore giusto.

Verificato a macchina contro il fondo `#060910`: peggior coppia adiacente **ΔE
25,3** a vista normale e **8,5** in deuteranopia, croma sopra la soglia,
contrasto oltre 3:1 su tutti e otto. **Rimescolare l'ordine obbliga a rilanciare
il validatore.** Il ciano sta in settima e non in seconda proprio per questo:
accanto all'azzurro sono due azzurri e non si distinguono.

La banda di luminosità è l'unico controllo che questa palette non supera, e la
ragione è nota: le tinte arrivano dal brief e stanno tutte in alto (0,71–0,82 in
OKLab). Su un fondo così scuro il contrasto regge comunque; l'effetto collaterale
è che nessuna serie è visibilmente più «pesante» delle altre, il che per una
dashboard a serie indipendenti va bene.

Gli **anelli** restano rosso, blu e oro. La coppia rosso/verde di Apple è
indistinguibile per chi ha un deficit sui rossi e sui verdi — ed è anche il
motivo per cui in questa palette il verde non fa mai il colore di serie.

**Le fasi del sonno usano una rampa, non quattro tinte.** Profondo, core e REM
sono una grandezza ordinata, non categorie indipendenti: un'unica tinta a
intensità decrescente lo dice, quattro colori diversi lo nasconderebbero.

Regola generale: **il colore non porta mai un'informazione da solo.** Le
variazioni hanno la freccia e il numero; le serie hanno la legenda; gli anelli
hanno l'etichetta; gli stati hanno l'icona e la parola.

## Tipografia — tre ruoli

Tutti ospitati in locale via `@fontsource-variable`, nessuna richiesta a un CDN.

| Ruolo | Faccia | Dove |
|---|---|---|
| Display | **Archivo Variable**, `wdth 116`, peso 700, maiuscolo, `0.045em` (`.display`) | titolo di pagina e cifra d'apertura, e basta |
| Testo | **Geist Variable** | tutto il resto dell'interfaccia |
| Dati | **Geist Mono Variable** | cifre, unità, tacche, orari, tooltip |

Il display è la **targhetta incisa sullo strumento**: maiuscolo, espanso,
spaziato. Sta su due soli elementi per pagina — se scendesse anche sulle
intestazioni di sezione, la dashboard diventerebbe un manifesto.

Il carattere dei dati non è un costume «tecnico»: **nessun numero di questa
interfaccia è scritto nel carattere del testo.** Chi misura porta il carattere
della misura.

- `.label` — etichette da strumentazione: 11px, maiuscoletto, spaziate `0.11em`.

## L'elemento firma: la diagonale del canale

Ogni pannello ha **due angoli tagliati in diagonale — in alto a sinistra e in
basso a destra — mai tutti e quattro**: un riquadro smussato su ogni lato torna a
essere un riquadro, mentre due tagli opposti danno una direzione.

Su quella diagonale corre **l'unico accento colorato del pannello, ed è il canale
del dato che contiene**. Prima ancora di leggere una parola si sa se quel riquadro
parla di movimento, di biometria o di carico. Per questo l'accento sta lì e in
nessun altro punto: un bordo luminoso su ogni elemento non direbbe più niente.

Costruzione (`.hud` e `.panel` in `app.css`): due strati sotto il contenuto,
`::before` per il bordo e `::after` per il fondo un pixel più dentro, tagliati
dallo stesso `clip-path`. **Il `clip-path` non sta sul pannello** perché
taglierebbe anche i grafici e i tooltip che ne escono.

Modificatori: `.hud-motion`, `.hud-bio`, `.hud-load`, `.hud-done` cambiano una
variabile sola (`--hud-accent`). `.hud-alert` è l'unico caso in cui il canale
arriva fino al fondo invece di restare sulla diagonale — quando il protocollo
dice di fermarsi, il riquadro deve distinguersi anche per chi sta scorrendo.

Il pallino a sinistra del titolo in `SectionHeader` è l'unico punto in cui il
canale si ripete dentro il pannello: su schermo stretto la diagonale finisce
fuori dal campo visivo mentre si legge il titolo.

### La spina dorsale, che resta

La riga sotto il titolo di ogni pagina non è un filetto: è la **frequenza
cardiaca a riposo degli ultimi 30 giorni** (`PulseSpine.svelte`, montato da
`PageHeader.svelte`). Non costa spazio — occupa quello che sarebbe andato a un
divisore — e il numero all'estremità destra la dichiara una lettura invece che
carta da parati. Resta **identica su tutte le pagine**: è il polso dell'app, non
il dato guida della sezione.

Con meno di due misure disponibili torna a essere ciò che sostituisce: una riga.

### La ghiera oraria del quadrante

`ActivityRings` circonda i tre archi con **ventiquattro tacche, una per ora,
accese fino all'ora corrente**. Risponde alla domanda che gli anelli da soli non
toccano — quanto tempo resta per chiuderli — e **si spegne del tutto quando la
giornata mostrata non è quella in corso**, perché su un giorno chiuso direbbe una
cosa falsa. Al centro non c'è luce: c'è il conto degli obiettivi chiusi.

## Superfici e struttura

Ombre profonde e controllate (`0 20px 45px -30px`), una hairline chiara
(`--color-line`, `rgb(120 160 210 / 0.2)`) e una trama a griglia sotto il 5% di
opacità: si deve riconoscere solo dopo aver già letto il dato.

`.glow` mette un alone colorato **sotto** il tracciato, senza schiarire il tratto
— che uscirebbe dalla banda validata. `.glow-soft` è la metà, per i tratti
spessi: sugli archi del quadrante il bagliore pieno si somma su sé stesso e il
bordo si sfrangia.

**Logica a pannelli.** Raggio 3px (l'angolo tecnico qui è il taglio, non lo
smusso), gutter unico di 12px (`--spacing-gutter`), e dimensioni decise
dall'importanza invece che dalla griglia.

`.panel-bleed` esce dai margini e arriva ai bordi. **Uno solo per pagina**, per
il grafico che comanda. Lì il taglio d'angolo sparisce: un angolo tagliato ha
senso su un oggetto che si vede tutto intero, non su uno che esce dallo schermo.

## Il sincrono, che non c'è

Nei mockup di partenza la testata portava un indicatore **LIVE**. Questa app non
è mai live: legge un export di Salute che arriva a mano, ogni tanto, dalla riga
di comando. `SyncStatus.svelte` scrive invece quando è stato fatto l'ultimo
import, con il pallino che passa all'oro dopo una settimana.

Fingere un flusso continuo sarebbe l'unica bugia dell'interfaccia, e anche la più
costosa: nasconderebbe proprio il caso in cui i numeri non vogliono dire più
niente, quello in cui l'ultimo import risale a tre settimane fa.

Per la stessa ragione il pannello di sintesi si chiama **Insight** e non
«Insight AI»: dietro non c'è nessun modello, ci sono delle divisioni
(`src/lib/insight.ts`). Ogni frase è la lettura ad alta voce di un numero che sta
già a schermo; se il dato manca, la frase non esiste — non viene stimata, non
viene arrotondata a zero e non viene sostituita da un incoraggiamento.

## La sezione Recupero

È l'unica parte dell'app che **non arriva dall'orologio**: è il protocollo di
recupero dopo la ricostruzione del legamento crociato anteriore, e si compila a
mano ogni sera. Per questo nella navigazione sta staccata dalle sei sezioni dei
sensori da un filetto: sotto quella riga il dato cambia natura, da letto a
scritto. Il canale della sezione è l'**oro**.

**Il principio che la governa: non chiedere due volte.** Peso, passi, sonno e
minuti di corsa arrivano dall'orologio; calorie, proteine, macro e acqua dall'app
del diario alimentare, che scrive anch'essa su Salute. Il registro non li domanda
— li mostra. Restano da scrivere solo dolore, gonfiore e sedute svolte, che
nessuna app può sapere. Il foglio di calcolo da cui nasce la sezione chiedeva
diciotto numeri al giorno.

Dove i due valori esistono entrambi **vince Salute**, e il campo scritto a mano
resta comunque disponibile: il registro si compila la sera, la sincronizzazione
arriva al prossimo import, e fra i due momenti serve poter scrivere. La
provenienza è dichiarata sotto ogni campo — «Da Salute: 172 g» — perché un numero
che compare da solo in una casella vuota è indistinguibile da uno inventato.

Il conteggio dei giorni compilati resta però legato alla riga scritta a mano: una
giornata con le sole calorie sincronizzate non è compilata, e la formula d'oro
deve continuare a chiederla. Quello che manca è la risposta del ginocchio, che è
il motivo per cui la sezione esiste.

Sette viste sotto un'unica testata (`recupero/+layout.svelte`), non sette voci
nel menu principale: condividono lo stesso blocco di tredici settimane e si passa
dall'una all'altra mentre si compila.

**Il grafico che comanda la sezione è la barra delle tredici settimane**
(`ProtocolBar.svelte`). Non è un avanzamento: ogni colonna dice quante regole
della formula d'oro sono state rispettate in quella settimana, e le tacche
interne dividono la colonna in tante celle quante sono le regole, così il
punteggio si conta a occhio. Una settimana passata senza dati resta muta invece
di valere zero — *non compilata* e *andata male* sono due cose diverse e devono
sembrarlo.

Le scadenze cliniche sono segnate sull'asse alla loro data esatta, non
all'inizio della settimana che le contiene: sono le uniche date del blocco che
non si possono spostare.

**Dolore e gonfiore stanno nello stesso grafico ma non sullo stesso asse**
(`ResponseChart.svelte`). Il dolore occupa il piano cartesiano con la scala
fissa 0–10 — se si adattasse ai dati, un mese buono sembrerebbe un mese pessimo
— e la soglia 3 è disegnata, non lasciata alla memoria. Il gonfiore vive in una
fascia sotto l'asse, con la sua scala: quattro livelli ordinati resi da un'unica
tinta che cresce insieme all'altezza, così la fascia si legge anche senza colore.

**Il rosso è il ginocchio operato.** Nel confronto fra i due lati — carichi in
palestra, circonferenza delle cosce — la barra rossa è sempre la destra. Non è
un giudizio, è un'identità.

**Le regole cliniche non si sommano in un punteggio.** La formula d'oro è un
contratto settimanale di righe che valgono uguale, e una percentuale unica
nasconderebbe proprio la riga saltata, che è l'unica informazione utile. Per la
stessa ragione l'esito di una seduta di corsa è una funzione pura (`runOutcome`)
e non una colonna: se domani la soglia cambia, tutte le sedute passate si
rileggono con la regola nuova invece di restare congelate su un giudizio vecchio.

**I segnali da non ignorare stanno in cima e non si modificano da nessun form.**
Arrivano dalle indicazioni cliniche: l'app li riporta, non li interpreta.

### Prontezza

La prima scheda della sezione è l'unica che non si compila: legge i sensori e li
confronta con la propria base (`src/lib/readiness.ts`, `RecoveryScore.svelte`).

**Non è un voto da 0 a 100.** Un voto assoluto pretende una scala assoluta — un
72 su cento dovrebbe voler dire qualcosa per chiunque — mentre l'unico metro che
questi dati sostengono davvero è il confronto con sé stessi. Il numero è uno
**scostamento con il segno** fra circa −20 e +20: variabilità cardiaca, frequenza
a riposo, sonno e carico recente, ciascuno misurato in deviazioni standard dalla
media delle sessanta giornate precedenti, tagliato a due deviazioni e combinato
con dei pesi.

Tre vincoli che lo tengono onesto:

1. **I contributi sono sempre visibili, con il loro peso.** Un indice che non si
   può smontare è un oracolo, e un oracolo su un ginocchio operato è esattamente
   quello che questa app ha deciso di non essere. Anche i contributi esclusi
   restano in elenco, con il motivo.
2. **I pesi si rinormalizzano sui contributi presenti**, e quanti ne sono entrati
   è parte del risultato. Il sonno su questo telefono è registrato in meno di una
   notte su dieci: un indice che scendesse ogni volta che manca misurerebbe la
   carica dell'orologio, non il recupero.
3. **Non dice cosa fare.** Nel mockup di partenza c'era un riquadro «Carico
   consigliato oggi → corsa lineare leggera»: è una prescrizione, contraddiceva
   il piano corsa reale in `rehab.ts`, e non è stato costruito.

Sotto le quattordici giornate di storia non si calcola niente. Una media su tre
giorni non è una base, è un altro numero qualsiasi.

Il **modulo ginocchio** (`RehabilitationCard.svelte`) è uno specchio, non una
seconda fonte: ogni valore è già stato scritto nel registro o nei carichi, e ogni
riga porta il collegamento al posto in cui si modifica. ROM in gradi e forza al
dinamometro **non sono registrati da nessuna parte nell'app** e non vengono
finti; al posto della forza c'è lo scarto di carico fra le due gambe, dichiarato
per quello che è.

Il giorno di riferimento qui è **l'ultimo importato da Salute**, non oggi in
Italia come nel resto della sezione: HRV, frequenza a riposo e sonno li scrive
l'orologio, e prima dell'import non esistono.

## Movimento

Una sola curva in tutta l'interfaccia: `--ease-settle`, un'uscita esponenziale
che parte veloce e si posa, come uno strumento che si assesta.

Un solo momento autoriale: **i dati si disegnano all'ingresso**. Le linee si
tracciano da sinistra, le barre crescono dalla base, gli archi si riempiono in
sequenza. Tutto il resto — passaggi del mouse, cambi di stato — è una transizione
di colore da 150 ms, e nient'altro.

`.skeleton` batte lento e **si ferma da solo dopo sei giri**: un'animazione
perpetua su una pagina lasciata aperta consuma batteria per non dire niente di
nuovo.

`prefers-reduced-motion` azzera tutto.

## Grafici

Un solo componente temporale (`TimeChart`) serve sia le linee che le barre:
assi, mirino, tooltip e stato vuoto vivono in un posto solo, così non possono
divergere.

- Tratto delle linee 2px, marcatori ≥ 8px, griglia e assi recessivi.
- Le barre si arrotondano **solo dall'estremità del dato**; il lato appoggiato
  all'asse resta squadrato (`barPath` in `src/lib/chart-shapes.ts`).
- Fra un segmento e l'altro passano 2px di superficie: la separazione è il fondo
  che si vede, non un bordo colorato.
- Le interruzioni nei dati restano buchi. Una linea che ricuce sopra un giorno
  mancante racconta una continuità che non c'è.
- La **linea di riferimento è oro** e la sua etichetta si disegna **dopo** i dati,
  con un contorno del colore di fondo: sull'ultimo giorno del periodo c'è quasi
  sempre una barra.
- Il tooltip porta lo **scarto dal riferimento** quando c'è: se la media è
  disegnata, la domanda su un giorno qualsiasi è sempre «quanto sopra o quanto
  sotto», e farla stimare a occhio è farla perdere.
- `areaBase` ancora il velo sotto la linea a una quota diversa dal fondo. Su una
  serie con segno è lo zero: riempire dal fondo farebbe leggere uno scostamento
  di −2 come una grandezza quasi piena.

## Icone

Set disegnato a mano in `src/lib/components/Icon.svelte`: griglia 24×24, tratto
1.5, terminazioni tonde. **Nessuna emoji** — cambiano forma su ogni sistema
operativo, non ereditano il colore del testo e non si allineano fra loro.

Il colore di una disciplina (`workoutTone`) è indicizzato **sull'icona e non sul
tipo**, così i cinquanta tipi di HealthKit non vanno tenuti allineati a mano.
Dove due discipline condividono l'icona *e* si vedono affiancate nei filtri, il
tipo può scavalcare la famiglia con `tone` — è il caso di Pesi e Forza
funzionale.

## Cose da non fare

- **Un bordo o uno sfondo su `.panel` con le utility di Tailwind.** Il fondo del
  pannello sta su uno pseudo-elemento a `z-index: -1`: un `bg-*` sull'elemento
  finisce sotto e non si vede, e un `border-*` senza spessore non disegna niente.
  Per un pannello diverso si aggiunge un modificatore in `app.css`, come
  `.hud-alert`.
- Schede tutte uguali come struttura di pagina. La panoramica alterna un blocco
  di apertura, tre riquadri, un grafico dominante, altri tre riquadri e un elenco.
- Un `<a>` senza `display` attorno a un grafico: resta inline, si adatta alla
  larghezza dell'SVG e sfonda il viewport sui telefoni.
- Testo colorato con la tinta della serie. I valori restano inchiostro; è la
  marca accanto a portare l'identità.
- Due assi verticali nello stesso grafico. Due grandezze di scala diversa sono
  due grafici.
- Una scala che si adatta ai dati dove il **valore assoluto è il punto**. Con lo
  zero fuori scala, mezzo centimetro recuperato sulla coscia riempie tutto il
  grafico e sembra la fine dell'ipotrofia.
- Una linea su due o tre punti. Due misurazioni non sono un andamento: si
  mostrano i numeri, o due barre affiancate.
- Un `sr-only` dentro una tabella che scorre in orizzontale, se il contenitore
  con `overflow-x-auto` non è anche `relative`. Essendo in posizione assoluta,
  il suo blocco contenitore diventa il viewport, il ritaglio non lo tocca e sui
  telefoni trascina l'intera pagina di duecento pixel di lato.
- Una barra di avanzamento larga mille pixel. Sotto i quattro pixel di altezza
  smette di leggersi come una quantità e diventa un righello: se il pannello è
  largo, si divide in colonne.
