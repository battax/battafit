# battafit

Dashboard privata sui dati del proprio Apple Watch: attività quotidiana,
allenamenti con tracce GPS, cuore, sonno e composizione corporea. Più una
sezione **Recupero** per il protocollo post-ricostruzione del legamento crociato
anteriore, che è l'unica parte scritta a mano invece che letta dai sensori.

L'export di Apple Salute è un file XML che può superare il gigabyte e contiene
milioni di campioni singoli. Il progetto è diviso in due parti proprio per
questo:

- **`ingest/`** — una CLI che gira sul tuo computer. Legge l'export in
  streaming, riduce i milioni di campioni ad aggregati giornalieri ed estrae
  allenamenti e tracce, poi spedisce alla dashboard qualche megabyte di dati già
  pronti.
- **`src/`** — l'app SvelteKit. Riceve solo dati aggregati, quindi le query sono
  immediate e il database resta piccolo.

---

## Cosa serve

- Node 22 o successivo
- Un database Postgres — [Neon](https://neon.tech) ha un piano gratuito adatto,
  ma va bene qualsiasi Postgres, anche locale

## Primo avvio

```bash
npm install
cp .env.example .env
```

Genera i tre segreti e mettili nel `.env`:

```bash
npm run auth:secret                       # per AUTH_SECRET
npm run auth:secret                       # di nuovo, per INGEST_TOKEN
npm run auth:hash -- "la-tua-password"    # per AUTH_PASSWORD_HASH
```

La password non viene mai salvata in chiaro: nel `.env` finisce solo il suo
hash PBKDF2. Aggiungi la stringa di connessione in `DATABASE_URL`, poi crea le
tabelle e avvia:

```bash
npm run db:push
npm run dev
```

## Importare i dati

**Sull'iPhone:** apri **Salute**, tocca la tua foto profilo in alto a destra,
scorri fino in fondo e scegli **Esporta tutti i dati sanitari**. Ci mette
qualche minuto e produce un `export.zip`. Mandalo a te stesso e salvalo sul
computer.

**Sul computer:**

```bash
npm run ingest -- ~/Downloads/export.zip
```

Il primo import di dieci anni di storico richiede qualche minuto. Per gli
aggiornamenti successivi conviene limitare il periodo:

```bash
npm run ingest -- ~/Downloads/export.zip --since 2026-01-01
```

L'importazione è idempotente: rilanciarla sugli stessi giorni aggiorna i valori
invece di duplicarli.

Altre opzioni:

| Opzione | Effetto |
|---|---|
| `--dry-run` | analizza e mostra il riepilogo senza scrivere niente |
| `--out file.json` | salva su file quello che ha letto, per controllarlo |
| `--url <indirizzo>` | manda i dati a un'istanza diversa da quella nel `.env` |
| `--since <AAAA-MM-GG>` | importa solo da quella data in poi |

Accetta lo `.zip`, un `export.xml` sciolto, o la cartella già scompattata.

## Deploy

Il progetto usa `@sveltejs/adapter-vercel`. Su Vercel: collega il repository e
imposta le stesse quattro variabili d'ambiente del `.env` locale. Poi punta la
CLI alla dashboard online:

```bash
npm run ingest -- ~/Downloads/export.zip --url https://tuo-dominio.vercel.app
```

Con un adattatore diverso (`adapter-node`, `adapter-cloudflare`) funziona
uguale: cambia solo la riga dell'adapter in `vite.config.ts`.

---

## Decisioni che vale la pena conoscere

**I passi non si sommano fra sorgenti.** iPhone e Apple Watch contano entrambi
gli stessi passi. Nell'app Salute Apple ne mostra una sola, ma nell'export ci
sono tutti i record di tutte le sorgenti: sommarli darebbe giornate da 25.000
passi mai fatti. Per le metriche cumulative la CLI tiene i totali separati per
sorgente e ne sceglie una sola al giorno, preferendo l'Apple Watch, che è al
polso tutto il giorno mentre l'iPhone resta sulla scrivania.

**Il sonno si calcola sull'unione degli intervalli.** Se Watch, iPhone e
un'eventuale app di terze parti registrano la stessa notte, sommare le durate
darebbe dodici ore di sonno per una notte di otto. Le fasi vengono unite come
intervalli sovrapposti, non addizionate.

**Le tracce GPS non finiscono su una mappa di terzi.** Un basemap richiederebbe
una chiave API e manderebbe a un fornitore di tile le coordinate di ogni uscita
— in pratica il tuo indirizzo di casa. I percorsi sono disegnati come tracciato
SVG con una barra della scala: restano sul tuo server e la forma del giro si
riconosce comunque.

**Gli anelli non usano i colori di Apple.** La coppia rosso/verde di Movimento
ed Esercizio ha una separazione di 4.3 per chi ha un deficit di visione dei
rossi e dei verdi: sono lo stesso colore. Gli anelli usano tre tinte di una
palette verificata a macchina (banda di luminosità, croma, separazione per
daltonismo e contrasto) sul fondo scuro dell'interfaccia.

**Le date si prendono come sono scritte.** Apple scrive `2024-03-15 08:30:00
+0100`, che non è ISO valido. I giorni si ricavano dai primi dieci caratteri
della stringa, cioè dal fuso in cui si trovava l'orologio: è il "giorno" che ci
si aspetta di vedere, e non sposta gli allenamenti serali al giorno dopo.

**Il recupero non richiede quello che l'orologio sa già.** Il registro
giornaliero chiede dolore, gonfiore, sedute svolte e alimentazione; peso, passi,
sonno e minuti di corsa li mostra e basta, letti da Salute. Il peso resta
scrivibile a mano perché senza bilancia connessa non arriva a Salute, e il
girovita perché Salute non lo prevede affatto; quando Salute ha il peso di quel
giorno, vince quello.

**Il protocollo sta nel codice, i dati nel database.** Date dei controlli,
progressione della corsa, soglie di dolore e segnali d'allarme vivono in
`src/lib/rehab.ts`: sono indicazioni cliniche, non impostazioni. Solo i numeri
che il proprietario può cambiare da sé — calorie, proteine, acqua, sonno, peso
obiettivo — stanno in `rehab_config` e si modificano dalla pagina Protocollo.

**La sezione si semina da sola.** Al primo caricamento di `/recupero` vengono
scritte le dodici sedute di corsa, le scadenze cliniche e i tre recapiti. È
idempotente e non tocca mai una riga esistente: dopo un `db:push` la sezione
funziona senza passaggi manuali, e una data spostata a mano resta spostata.

**Il giorno di riferimento è oggi in Italia, non l'ultimo giorno importato.** Le
altre sezioni ancorano i periodi all'ultimo dato disponibile; qui si compila la
sera stessa, e il server gira in UTC: all'una di notte registrerebbe il giorno
prima.

**Non è un dispositivo medico.** L'app mostra i valori che le vengono dati e le
regole già concordate con i professionisti. Non ne deduce di nuove.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione |
| `npm run check` | controllo dei tipi |
| `npm run ingest -- <file>` | importa un export di Salute |
| `npm run db:push` | allinea lo schema del database |
| `npm run db:studio` | interfaccia web sul database |
| `npm run auth:secret` | genera un segreto casuale |
| `npm run auth:hash -- "pw"` | genera l'hash di una password |
