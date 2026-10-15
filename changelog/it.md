## [1.11.2] — 2026-10-09

### Moderazione della chat
- Nuovo motore **Rust Chat Guard**, attivo di fabbrica in modalità osservazione (non blocca nulla, registra solo cosa avrebbe filtrato).
- Nuovo blocco **«Moderazione della chat»** nelle Impostazioni: livello, lingue, parole consentite, parole bloccate e stato del motore.
- Le lingue del filtro **seguono la lingua della voce** del TTS automaticamente.
- Popup dei **messaggi bloccati** dal badge della coda (bloccati, parole e coda TTS).
- Gestione delle parole bloccate unificata e **salvata per account** (si migra da sola dal formato precedente).
- Il filtro rispetta i verdetti del guard e le azioni di moderazione si salvano all'istante.
- Nuovo filtro del **testo senza senso** (tasti a caso come «asdfghjkl;»): se qualcuno ne manda diversi di fila, il messaggio si vede in chat ma non viene letto. È attivo di fabbrica e puoi cambiarlo in «Solo avviso» o «Spento» in Impostazioni > «Moderazione della chat». Non silenzia mai nessuno: lo decidi tu. I messaggi con parole vere, risate (`jajaja`, `wkwkwk`, `ㅋㅋㅋ`), emote o link non vengono segnalati.
- Nel popup dei messaggi bloccati, quelli di testo senza senso hanno un pulsante **«Silenzia utente»** se vuoi fermare lo spammer.
- **Importa parole bloccate** da un file `.json`, con una procedura in 3 passi: «Formato» (esempio pronto da copiare), «Importa» (trascina o scegli il file) e «Conferma» (quante sono nuove e un'anteprima). Le parole si aggiungono alla tua lista attuale, non la sostituiscono.

### Overlay di OBS
- Nuovo **overlay degli spettatori di TikTok** con personalizzazione, anteprima e pulsante di prova.
- Chat, Top Likers e **Top Donatori** con impostazioni complete da «Personalizza»; avatar, ruoli (moderatore/abbonato) e anello con bolla della piattaforma sull'avatar.
- **Anteprima con dati di esempio** senza bisogno di essere connessi (chat con le 4 piattaforme, avvisi fissi).
- Avvisi di Follow/Share semplificati e colore d'accento in Top Likers. Rimosso lo sfondo personalizzato.

### Canali
- **TikTok con sessione persistente per account**: login/logout dentro «Aggiungi canale», avviso di sessione scaduta e tutorial che spiega il login.
- Riconnessione molto più stabile: si riprende quando cambia la stanza, controlla con doppio segnale per non riconnettere le live tranquille e riprova Twitch e YouTube dopo i silenzi.
- I tentativi di connessione dei canali si conservano tra un tentativo e l'altro.
- Avvio più veloce (il client di TikTok si carica solo quando serve).

### Account e piani
- Pulsante **Elimina account** nel profilo, con password e conferma scrivendo la parola.
- Selettore **mensile / annuale** e cambio di intervallo dall'account; il popup dei piani e il checkout si aprono sul mensile.
- Banner di upgrade a Pro sotto la barra «Legge» (solo piano Free), banner a rotazione in chat e finestra del codice sconto.
- Finestre di **donazioni** e di **annullamento di Pro** ridisegnate; video demo delle funzioni Pro; **Clips** diventa una funzione Pro con la sua demo.
- Il pulsante per migliorare il piano apre il confronto dei piani; il popup non appare più all'avvio.
- Paywall del pannello mobile e pannello mobile con badge Pro e menu account.

### Note legali e privacy
- **Termini e Informativa sulla privacy v2.1** (con traduzione in inglese).
- L'installer chiede di accettarli a ogni installazione e aggiornamento; senza accettarli non partono telemetria, analisi né segnalazione errori.
- I termini vengono mostrati alla registrazione.

### Interfaccia
- **Voce e audio** ridisegnato in 3 schede, adattabile alla larghezza della finestra.
- **Scorciatoie da tastiera in schede**: TTS e chat, Musica e Generale.
- Icone SVG al posto dei simboli nelle Impostazioni, feedback al clic e Canali con stili unificati.
- Effetti evento e avviso di connessione non riuscita.
- Novità con video di YouTube incorporato.
- Connessione dell'agente **MCP** semplificata (snippet più chiari).
- Ora puoi chiudere la finestra senza spegnere l'app. Se attivi **Riduci nell'area di notifica alla chiusura** nelle Impostazioni, premendo la X TikLiveTTS si nasconde nell'area di notifica (vicino all'orologio) e continua a leggere la chat. Per chiuderla del tutto, clic destro sulla sua icona e scegli **Esci**. È disattivato di fabbrica, quindi la X continua a chiudere l'app come prima finché non lo attivi.
- Nuova opzione **Apri all'avvio di Windows**: TikLiveTTS si avvia da solo quando accendi il PC, così è già pronto quando inizi la tua live.

### Correzioni
- Badge della coda con testo chiaro e ridisegnato al caricamento della lingua.
- Il banner Pro torna a vedersi a ogni apertura.
- Testi corrotti (mojibake) corretti in tutte le 10 lingue e nuove chiavi tradotte.
- Il tutorial dei canali puntava a un elemento nascosto; il login di TikTok non spariva dopo l'accesso.
- I chip delle piattaforme dell'overlay della chat mostravano male lo stato selezionato.
- Barra laterale predefinita in una nuova installazione (chat, overlay, clips, moderazione).
- Il Soundpad valida meglio la lista ricevuta; messaggio di chat simulato con id univoco.
- TTS: l'audio che si blocca viene interrotto e la lunghezza del testo è limitata.
- `--user-data-dir` viene rispettato quando indicato esplicitamente.
- Vari ritocchi a icone, finestre e stati dell'interfaccia.
- L'importazione delle parole bloccate non accetta più file con formato non valido: un JSON rotto o che non sia una lista di parole viene rifiutato con un avviso chiaro, invece di dare un errore generico o riempire la lista di testo spazzatura.
- Annunci vocali di TikLiveTTS più intelligenti: il primo suona dopo 15 minuti e i successivi al massimo ogni 25 minuti, e solo quando c'è gente nella tua live. Se la live è vuota, aspettano che arrivi pubblico invece di suonare comunque. Prima potevano ripetersi troppo spesso o metterci tantissimo a suonare. Con il piano Pro non suonano.
- La voce non legge più i numeri lunghi nei nick: `pablito434435433453` si legge «pablito», e gli account senza un nome proprio (`user14423423…`, `usuario14423423…`) si leggono «utente», nella lingua dell'app. Vale per la chat e per gli avvisi di ingressi, follow, regali, like e condivisioni. I nomi con pochi numeri (`lu15`, `pablo2024`) si leggono come prima, e sullo schermo, in OBS e nelle classifiche il nick si vede ancora completo.
- Bot musicale: chiedere una canzone con un link di YouTube (`!p https://youtu.be/...`) riproduce di nuovo quella canzone. Prima il link andava perso e il bot cercava la parola «link», quindi partiva un'altra canzone. Nella chat e nella voce il link continua a comparire come «link».
- Bot musicale: il motore di YouTube ora riceve le correzioni lo stesso giorno in cui escono, invece di aspettare settimane la prossima versione stabile, così le richieste smettono di fallire molto prima quando YouTube cambia qualcosa. Se un aggiornamento del motore restava a metà perché c'era musica in riproduzione, si completa da solo alla successiva apertura dell'app.
- Kick: la chat torna a connettersi. Kick ha cambiato il sistema che usa per la chat in diretta e l'app non riusciva più a leggerla: la connessione falliva. Ora usa il nuovo sistema di Kick, sempre senza account né login, e la connessione resta attiva da sola per tutta la diretta.

### Videos de YouTube
- [Guarda il video delle novità](https://www.youtube.com/watch?v=TNSqxGlOCyE)
