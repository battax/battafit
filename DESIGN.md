# Sistema visivo — battafit

Riferimento per mantenere coerenti gli interventi futuri. Le scelte qui sotto
sono già implementate in `src/app.css`; questo file spiega il perché, che il CSS
da solo non racconta.

## Direzione

**Strumentazione notturna, universo Spider-Man.** Fondo blu quasi nero come il
blu scuro della tuta, dati che emettono luce, tipografia stretta e tabellare,
nessun ornamento. La scena d'uso è la sera, dopo l'allenamento, spesso al
telefono a luci basse: un tema chiaro costringerebbe a guardare un rettangolo
bianco al buio.

Il riferimento è *The Amazing Spider-Man* con Andrew Garfield: notte di New
York, alto contrasto, luce che viene da sorgenti puntuali. La tavolozza non si
ferma al rosso e blu della tuta — prende da tutto l'universo, così ci sono otto
tinte distinte invece di due ripetute.

Il tema è **solo scuro**, per scelta e non per pigrizia. Se un giorno servisse
anche il chiaro, i token sono già isolati in `@theme`: si tratta di aggiungere
un secondo blocco, non di riscrivere i componenti.

Modalità: **Operate**. È uno strumento che si consulta, non una pagina che
convince. Scansionabilità e coerenza vengono prima dell'espressività; il
carattere sta nei dettagli, non negli effetti.

## Colore

Le tinte del logo (`#ff0000`, `#005dff`, `#00e5ff`) sono sature al 100%:
perfette come marchio, inutilizzabili come dati. La palette delle serie sta
nelle stesse famiglie di tonalità ma è **verificata a macchina** contro il fondo
`#0a0d14`, non scelta a occhio. Controlli superati: banda di luminosità, soglia
di croma, separazione per daltonismo (peggior coppia adiacente ΔE 12.1), soglia
per visione normale (ΔE 19.7), contrasto ≥ 3:1.

| Slot | Token | Valore | Nell'universo |
|---|---|---|---|
| 1 | `--color-suit-red` | `#cf3444` | il rosso della tuta |
| 2 | `--color-suit-blue` | `#3d82e8` | l'azzurro della tuta |
| 3 | `--color-street` | `#bd8b22` | i lampioni al sodio di New York |
| 4 | `--color-electro` | `#17a2c4` | l'arco elettrico di Electro |
| 5 | `--color-rose` | `#d55181` | i riflessi rosa del logo |
| 6 | `--color-lizard` | `#3f9445` | il verde di Lizard |
| 7 | `--color-goblin` | `#9085e9` | il viola del Goblin |
| 8 | `--color-oscorp` | `#199e70` | il verdeacqua dei laboratori |

L'**ordine degli slot** non è estetico: è il meccanismo che tiene separate le
coppie che finirebbero vicine. Rimescolarlo obbliga a rilanciare il validatore.
Il ciano sta allo slot 4 e non al 2, subito dopo l'azzurro, proprio per questo.
Coppia da non mettere mai adiacente: **azzurro↔ciano**, ΔE 11.5 contro una
soglia di 15 — sono due azzurri che a colpo d'occhio si somigliano.

Gli anelli usano **rosso, azzurro e ambra**: peggior coppia ΔE 19.6 a vista
normale.

### Sul vincolo per i daltonici

È stato **deliberatamente rinunciato**, su decisione esplicita del proprietario
(14 agosto 2026). La dashboard ha un utente solo, che non ha deficit di visione
dei colori, e il vincolo bloccava proprio la coppia rosso/azzurro della tuta
negli anelli.

Restano attivi gli altri quattro controlli, che servono comunque a chi guarda:
banda di luminosità, soglia di croma, separazione a vista normale (ΔE ≥ 15) e
contrasto ≥ 3:1 sul fondo. Il primo e il terzo sono quelli che fanno il lavoro
vero.

Coppie che ora sono ammesse e prima no: rosso↔ambra (ΔE 4.9 per i daltonici,
16.2 a vista normale) e rosso↔verde (5.5 / 22.2).

**Se un giorno l'app venisse mostrata o pubblicata**, il ripristino è
circoscritto: anelli in rosso, ciano e ambra (ΔE 14.0 per i daltonici) e ciano
riportato allo slot 2. Il resto della palette regge già il controllo.

Il cap per le forme che confrontano tutte le coppie fra loro (dispersione,
mappe) resta a **tre serie**; oltre, si accorpa in "Altro" o si sfaccetta.

Nota storica: i colori di Apple per gli anelli erano comunque da scartare a
prescindere — la sua coppia rosso/verde misura 4.3 per i daltonici *e* non
porta alcun vantaggio a vista normale rispetto alla terna scelta.

**Le fasi del sonno usano una rampa, non quattro tinte.** Profondo, core e REM
sono una grandezza ordinata, non categorie indipendenti: una sola tinta a
intensità decrescente lo dice, quattro colori diversi lo nasconderebbero.

Regola generale: **il colore non porta mai un'informazione da solo.** Le
variazioni hanno la freccia e il numero oltre al colore; le serie hanno la
legenda; gli anelli hanno l'etichetta.

## Tipografia — tre ruoli

Tutti ospitati in locale via `@fontsource-variable`, nessuna richiesta a un CDN.

| Ruolo | Faccia | Dove |
|---|---|---|
| Display | **Archivo Variable**, `wdth 118`, peso 700, maiuscolo (`.display`) | titolo di pagina e cifra d'apertura, e basta |
| Testo | **Geist Variable** | tutto il resto dell'interfaccia |
| Dati | **Geist Mono Variable** | tacche degli assi, colonne, orari, tooltip |

La larghezza espansa di Archivo è la stessa mossa della scritta cromata del
logo: è da lì che viene, non da un catalogo. Le facce espanse hanno già molta
aria fra le lettere, quindi la spaziatura resta a 0.005em — aggiungerne le
farebbe sfaldare.

**Il display sta su due soli elementi per pagina.** Se scendesse anche sulle
intestazioni di sezione, la dashboard diventerebbe un manifesto; è una cosa che
si guarda ogni sera, non un poster.

Il carattere dei dati non è un costume "tecnico": si applica solo dove i numeri
si incolonnano o cambiano sotto il puntatore. Il testo corrente resta Geist.

- `.label` — etichette da strumentazione: 11px, maiuscoletto, spaziate.

## Superfici e struttura

Niente ombre: su un fondo quasi nero non si vedrebbero. La profondità è data da
una hairline chiara (`--color-line`) e da un fondo di pannello appena più
schiarito. La classe `.glow` mette un alone colorato **sotto** il tracciato,
senza schiarire il tratto — che uscirebbe dalla banda di luminosità validata.

**Logica a vignette.** Raggio 4px (non 0, che scivolerebbe nel look da
quotidiano), gutter unico di 12px (`--spacing-gutter`), e dimensioni dei
pannelli decise dall'importanza invece che dalla griglia.

`.panel-bleed` è la vignetta che esce dai margini e arriva ai bordi. **Una sola
per pagina**, per il grafico che comanda: se fossero due, nessuna delle due
comanderebbe più niente. È la variazione di ritmo che tiene la pagina lontana
dalla griglia di schede tutte uguali.

## L'elemento firma: la spina dorsale

La riga sotto il titolo di ogni pagina non è un filetto: è la **frequenza
cardiaca a riposo degli ultimi 30 giorni**, un tracciato ECG sottile da bordo a
bordo (`PulseSpine.svelte`, montato da `PageHeader.svelte`).

Tre ragioni per cui sta in piedi:

1. **Non costa spazio.** Occupa quello che sarebbe andato a un divisore.
2. **È un dato, non un ornamento.** Il numero all'estremità destra la dichiara
   una lettura — senza quello diventerebbe carta da parati.
3. **Viene dal marchio.** È lo stesso battito che attraversa la scritta del
   logo.

Resta **identica su tutte le pagine**, e non cambia metrica per sezione: è il
polso dell'app, un monitor che scorre in alto. Farla diventare "il dato guida
di questa pagina" l'avrebbe trasformata in una sparkline decorativa.

Con meno di due misure disponibili torna a essere ciò che sostituisce: una riga.

## La sezione Recupero

È l'unica parte dell'app che **non arriva dall'orologio**: è il protocollo di
recupero dopo la ricostruzione del legamento crociato anteriore, e si compila a
mano ogni sera. Per questo nella navigazione sta staccata dalle sei sezioni dei
sensori da un filetto: sotto quella riga il dato cambia natura, da letto a
scritto.

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

Sei viste sotto un'unica testata (`recupero/+layout.svelte`), non sei voci nel
menu principale: condividono lo stesso blocco di tredici settimane e si passa
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
un giudizio, è un'identità: è lo stesso rosso della linea del dolore, che è il
dolore di quel ginocchio.

**Le regole cliniche non si sommano in un punteggio.** La formula d'oro è un
contratto settimanale di cinque righe che valgono uguale, e una percentuale
unica nasconderebbe proprio la riga saltata, che è l'unica informazione utile.
Per la stessa ragione l'esito di una seduta di corsa è una funzione pura
(`runOutcome` in `$lib/rehab.ts`) e non una colonna: se domani la soglia cambia,
tutte le sedute passate si rileggono con la regola nuova invece di restare
congelate su un giudizio vecchio.

**I segnali da non ignorare stanno in cima e non si modificano da nessun form.**
Arrivano dalle indicazioni cliniche: l'app li riporta, non li interpreta.

## Movimento

Una sola curva in tutta l'interfaccia: `--ease-settle`, un'uscita esponenziale
che parte veloce e si posa, come uno strumento che si assesta.

Un solo momento autoriale: **i dati si disegnano all'ingresso**. Le linee si
tracciano da sinistra, le barre crescono dalla base, gli anelli si riempiono in
sequenza. Tutto il resto — passaggi del mouse, cambi di stato — è una
transizione di colore da 150 ms, e nient'altro.

`prefers-reduced-motion` azzera tutto.

## Grafici

Un solo componente temporale (`TimeChart`) serve sia le linee che le barre:
assi, mirino, tooltip e stato vuoto vivono in un posto solo, così non possono
divergere.

- Tratto delle linee 2px, marcatori ≥ 8px, griglia e assi recessivi.
- Le barre si arrotondano **solo dall'estremità del dato**; il lato appoggiato
  all'asse resta squadrato (`barPath` in `src/lib/chart-shapes.ts`).
- Fra un segmento e l'altro passano 2px di superficie: la separazione è il
  fondo che si vede, non un bordo colorato.
- Le interruzioni nei dati restano buchi. Una linea che ricuce sopra un giorno
  mancante racconta una continuità che non c'è.
- Ogni grafico ha mirino e tooltip. Le tacche dell'asse si diradano con
  l'altezza: quattro etichette in settanta pixel finiscono una sull'altra.

## Icone

Set disegnato a mano in `src/lib/components/Icon.svelte`: griglia 24×24, tratto
1.5, terminazioni tonde. **Nessuna emoji** — cambiano forma su ogni sistema
operativo, non ereditano il colore del testo e non si allineano fra loro.

## Cose da non fare

- Schede tutte uguali come struttura di pagina. La panoramica alterna un blocco
  di apertura, un grafico dominante, tre riquadri più piccoli e un elenco.
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
