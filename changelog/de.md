## [1.12.0] — 2026-10-21

### Anmeldung und Registrierung
- Neu gestalteter Anmeldebildschirm mit Hintergrundbild und neuen Texten.
- **Anmelden**: mit einem Klick über Google oder über **„E-Mail“** mit E-Mail und Passwort auf derselben Karte.
- **Konto erstellen**: Die Registrierung erfolgt nur über Google und verlangt einen **eindeutigen Nickname**, deinen Creator-Namen, den niemand sonst verwenden kann.

### Fenster „Mein Konto“
- Ein Klick auf deine E-Mail oder auf **Mein Konto** im Kontomenü öffnet jetzt ein eigenes Fenster mit Seitenmenü, statt den Bildschirm zu wechseln.
- **Profil**: Foto und Banner ändern, Nickname mit einem Klick bearbeiten, Google verknüpfen, abmelden oder Konto löschen – alles an einem Ort.
- **Abrechnung**: dein Plan mit Verlängerungsdatum, deine Zahlungsmethode, der Rechnungsverlauf mit PDF-Download und die Option, den Plan zu kündigen – alles auf einem Bildschirm.
- **Barrierefreiheit**: Textgröße (Normal, Mittel, Groß, Sehr groß), weniger Bewegung in Overlays, langsame TTS-Stimme und hoher Kontrast. Änderungen gelten sofort.
- **Hilfe** öffnet direkt unseren Discord.
- Das Fenster passt sich der App-Größe an, wird beim Maximieren größer und verdeckt die Fensterschaltflächen nicht.

### Änderungen
- Die Barrierefreiheits-Einstellungen wandern aus den erweiterten Einstellungen nach **Mein Konto → Barrierefreiheit**.

## [1.11.2] — 2026-10-09

### Chat-Moderation
- Neue **Rust Chat Guard**-Engine, ab Werk im Beobachtungsmodus aktiv (sie blockiert nichts, sondern protokolliert nur, was sie gefiltert hätte).
- Neuer Bereich **«Chat-Moderation»** in den Einstellungen: Stufe, Sprachen, erlaubte Wörter, blockierte Wörter und Engine-Status.
- Die Sprachen des Filters **folgen automatisch der Sprache der TTS-Stimme**.
- Popup der **blockierten Nachrichten** über das Badge der Warteschlange (blockiert, Wörter und TTS-Warteschlange).
- Verwaltung blockierter Wörter vereinheitlicht und **pro Konto gespeichert** (wird automatisch aus dem alten Format übernommen).
- Der Filter beachtet die Urteile des Guards, und Moderationsaktionen werden sofort gespeichert.
- Neuer Filter für **sinnlosen Text** (zufälliges Tastenhämmern wie «asdfghjkl;»): Schickt jemand mehrere davon hintereinander, erscheint die Nachricht im Chat, wird aber nicht vorgelesen. Er ist ab Werk aktiv und lässt sich unter Einstellungen > «Chat-Moderation» auf «Nur warnen» oder «Aus» stellen. Er schaltet nie jemanden stumm: Das entscheidest du. Nachrichten mit echten Wörtern, Lachen (`jajaja`, `wkwkwk`, `ㅋㅋㅋ`), Emotes oder Links werden nicht markiert.
- Im Popup der blockierten Nachrichten haben die mit sinnlosem Text einen Button **«Nutzer stummschalten»**, falls du den Spammer stoppen willst.
- **Blockierte Wörter importieren** aus einer `.json`-Datei, mit einem Assistenten in 3 Schritten: «Format» (Beispiel zum Kopieren), «Importieren» (Datei ziehen oder auswählen) und «Bestätigen» (wie viele neu sind, plus Vorschau). Die Wörter werden zu deiner Liste hinzugefügt und ersetzen sie nicht.

### OBS-Overlays
- Neues **TikTok-Zuschauer-Overlay** mit Anpassung, Vorschau und Test-Button.
- Chat, Top Likers und **Top Spender** mit vollständigen Einstellungen unter «Anpassen»; Avatare, Rollen (Moderator/Abonnent) und Ring mit Plattform-Blase am Avatar.
- **Vorschau mit Beispieldaten**, ohne verbunden zu sein (Chat mit allen 4 Plattformen, feste Alerts).
- Vereinfachte Follow-/Share-Alerts und Akzentfarbe in Top Likers. Der eigene Hintergrund entfällt.

### Kanäle
- **TikTok mit dauerhafter Sitzung pro Konto**: An-/Abmelden direkt unter «Kanal hinzufügen», Hinweis bei abgelaufener Sitzung und ein Tutorial, das die Anmeldung erklärt.
- Deutlich stabilere Wiederverbindung: erholt sich bei Raumwechsel, überwacht mit doppeltem Signal, damit ruhige Lives nicht neu verbinden, und versucht es bei Twitch und YouTube nach Funkstille erneut.
- Die Verbindungsversuche der Kanäle bleiben zwischen den Versuchen erhalten.
- Schnellerer Start (der TikTok-Client wird erst geladen, wenn er gebraucht wird).

### Konto und Pläne
- Button **Konto löschen** im Profil, mit Passwort und Bestätigung durch Eintippen des Wortes.
- Umschalter **monatlich / jährlich** und Intervallwechsel im Konto; Plan-Popup und Checkout öffnen mit monatlich.
- Pro-Upgrade-Banner unter der Leiste «Liest:» (nur im Free-Plan), rotierendes Banner im Chat und Fenster für Rabattcodes.
- Neu gestaltete Fenster für **Spenden** und **Pro-Kündigung**; Demo-Videos der Pro-Funktionen; **Clips** wird zur Pro-Funktion mit eigener Demo.
- Der Upgrade-Button öffnet den Planvergleich; das Popup erscheint nicht mehr beim Start.
- Paywall für das Mobil-Panel und Mobil-Panel mit Pro-Badge und Kontomenü.

### Rechtliches und Datenschutz
- **Nutzungsbedingungen und Datenschutzerklärung v2.1** (mit englischer Übersetzung).
- Das Installationsprogramm fragt bei jeder Installation und jedem Update nach der Zustimmung; ohne Zustimmung starten weder Telemetrie noch Analyse noch Fehlerberichte.
- Die Bedingungen werden bei der Registrierung angezeigt.

### Oberfläche
- **Stimme & Audio** neu gestaltet in 3 Karten, die sich an die Fensterbreite anpassen.
- **Tastenkürzel in Tabs**: TTS und Chat, Musik und Allgemein.
- SVG-Icons statt Symbolen in den Einstellungen, Feedback beim Klicken und Kanäle mit einheitlichem Stil.
- Event-Effekte und Hinweis bei fehlgeschlagener Verbindung.
- Neuigkeiten mit eingebettetem YouTube-Video.
- Vereinfachte Verbindung des **MCP**-Agenten (klarere Snippets).
- Du kannst das Fenster jetzt schließen, ohne die App zu beenden. Wenn du **Beim Schließen in den Infobereich minimieren** in den Einstellungen aktivierst, versteckt sich TikLiveTTS beim Klick auf das X im Infobereich (neben der Uhr) und liest den Chat weiter. Zum vollständigen Beenden klickst du mit rechts auf das Symbol und wählst **Beenden**. Ab Werk ist es aus, das X schließt die App also wie bisher, bis du es einschaltest.
- Neue Option **Beim Windows-Start öffnen**: TikLiveTTS startet von selbst, wenn du den PC einschaltest, und ist bereit, wenn dein Live beginnt.

### Fehlerbehebungen
- Badge der Warteschlange mit klarem Text, wird beim Laden der Sprache neu gezeichnet.
- Das Pro-Banner erscheint wieder bei jedem Öffnen.
- Beschädigte Texte (Mojibake) in allen 10 Sprachen repariert und neue Schlüssel übersetzt.
- Das Kanal-Tutorial zeigte auf ein verstecktes Element; die TikTok-Anmeldung verschwand nach dem Einloggen nicht.
- Die Plattform-Chips im Chat-Overlay zeigten ihren Auswahlzustand falsch an.
- Standard-Seitenleiste bei einer Neuinstallation (Chat, Overlays, Clips, Moderation).
- Das Soundpad prüft die empfangene Liste besser; simulierte Chatnachricht mit eindeutiger ID.
- TTS: Hängendes Audio wird abgebrochen und die Textlänge begrenzt.
- `--user-data-dir` wird beachtet, wenn es ausdrücklich angegeben ist.
- Mehrere Anpassungen an Icons, Fenstern und Zuständen der Oberfläche.
- Der Import blockierter Wörter akzeptiert keine Dateien mit ungültigem Format mehr: Ein kaputtes JSON oder eines, das keine Wortliste ist, wird mit einem klaren Hinweis abgelehnt, statt einen allgemeinen Fehler zu zeigen oder die Liste mit Datenmüll zu füllen.
- Klügere Sprachansagen von TikLiveTTS: Die erste kommt nach 15 Minuten, die weiteren höchstens alle 25 Minuten und nur, wenn Leute in deinem Live sind. Ist das Live leer, warten sie auf Publikum, statt trotzdem zu laufen. Vorher konnten sie sich zu oft wiederholen oder ewig auf sich warten lassen. Mit dem Pro-Plan gibt es keine Ansagen.
- Die Stimme liest lange Zahlen in Nicknames nicht mehr vor: `pablito434435433453` wird «pablito» gelesen, und Konten ohne echten Namen (`user14423423…`, `usuario14423423…`) werden in der Sprache der App als «Nutzer» gelesen. Das gilt für den Chat und für die Ansagen von Beitritten, Follows, Geschenken, Likes und Shares. Namen mit wenigen Ziffern (`lu15`, `pablo2024`) werden wie bisher gelesen, und auf dem Bildschirm, in OBS und in den Ranglisten wird der Nickname weiterhin vollständig angezeigt.
- Musik-Bot: Ein Songwunsch mit YouTube-Link (`!p https://youtu.be/...`) spielt wieder genau diesen Song. Vorher ging der Link verloren und der Bot suchte nach dem Wort „link“, deshalb lief ein anderer Song. Im Chat und in der Sprachausgabe wird der Link weiterhin als „link“ angezeigt.
- Musik-Bot: Die YouTube-Engine bekommt Korrekturen jetzt noch am selben Tag, statt wochenlang auf die nächste stabile Version zu warten. So funktionieren Wünsche viel schneller wieder, wenn YouTube etwas ändert. Blieb ein Engine-Update halb fertig, weil gerade Musik lief, wird es beim nächsten Start der App automatisch abgeschlossen.
- Kick: Der Chat verbindet sich wieder. Kick hat das System für seinen Live-Chat geändert und die App konnte ihn nicht mehr lesen: Die Verbindung schlug fehl. Jetzt nutzt sie das neue System von Kick, weiterhin ohne Konto oder Login, und die Verbindung hält sich während des ganzen Streams von selbst.

### Videos de YouTube
- [Neuigkeiten-Video ansehen](https://www.youtube.com/watch?v=TNSqxGlOCyE)
