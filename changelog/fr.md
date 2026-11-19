## [1.12.2] — 2026-11-19

### Un seul lien OBS pour toutes vos scènes
- **Copier le lien pour OBS** permet maintenant de choisir entre **« Toutes mes scènes dans une source »** (recommandé), qui affiche la scène active et change avec un raccourci clavier sans toucher à OBS, et **« Cette scène uniquement »**.
- Attribuez un raccourci clavier à chaque scène par un clic droit dessus. La première fois que vous copiez le lien, un guide pas à pas apparaît, et vous pouvez le revoir avec **« Voir le tutoriel »**.
- Les raccourcis enregistrés sont prêts à chaque ouverture de l'app, sans passer par l'éditeur, et acceptent plusieurs touches modificatrices (par exemple **Ctrl+Shift+1**).

### Transitions entre scènes
- Nouvel accordéon **« Transitions de scènes »** dans l'éditeur, avec 56 transitions : glissements, zoom, rotations, volets, 34 de style OBS (Horloge, Aquarelle, Zigzag…), **fondu vers une couleur** et **stinger** avec image ou vidéo.
- Réglez la durée, la couleur et **inverser l'animation**, et voyez l'**aperçu** dans une carte flottante à côté de l'accordéon.
- Le stinger se choisit dans votre bibliothèque **Media** (ou s'y téléverse directement) ou avec l'URL d'une vidéo.

### Scènes et éditeur
- Chaque scène garde sa propre mise en forme. Exportez des scènes dans un fichier (ou un par scène) et importez-les dans un autre compte.
- Un overlay placé sur une photo ou une vidéo plein écran peut maintenant être sélectionné et déplacé, et le glisser ne saccade plus.
- **Couvrir le canevas** ajuste un GIF ou une image à tout le canevas, et la taille totale n'a plus de plafond.
- **Overlay clavier et souris** personnalisable : ajoutez ou retirez des touches (jusqu'à 20), changez leur largeur, utilisez des préréglages (WASD, MOBA, FPS…) ou enregistrez les vôtres, et mettez la souris à gauche.

### Corrections
- L'alerte de **partage** TikTok affiche maintenant la photo de profil.
- Les raccourcis avec **Shift + chiffre** (Shift+1) peuvent maintenant être attribués, et un changement de raccourci refusé ne laisse plus la scène sans raccourci.
- Des textes qui s'affichaient avec « ? » ont été corrigés dans plusieurs langues.

## [1.12.0] — 2026-10-21

### Connexion et inscription
- Écran de connexion repensé, avec image de fond et nouveaux textes.
- **Se connecter** : connecte-toi avec Google en un clic ou choisis **« E-mail »** pour utiliser ton e-mail et ton mot de passe sur la même carte.
- **Créer un compte** : l’inscription se fait uniquement avec Google et demande un **pseudo unique**, ton nom de créateur, que personne d’autre ne peut utiliser.

### Fenêtre « Mon compte »
- Un clic sur ton e-mail ou sur **Mon compte** dans le menu du compte ouvre une fenêtre dédiée avec un menu latéral, au lieu de changer d’écran.
- **Profil** : change ta photo et ta bannière, modifie ton pseudo en un clic, associe Google, déconnecte-toi ou supprime ton compte au même endroit.
- **Facturation** : ton forfait et sa date de renouvellement, ton moyen de paiement, l’historique des factures avec téléchargement en PDF et l’option pour annuler ton forfait, sur un seul écran.
- **Accessibilité** : taille du texte (Normal, Moyen, Grand, Très grand), réduire les animations des overlays, voix TTS lente et contraste élevé. Les changements s’appliquent immédiatement.
- **Aide** ouvre directement notre Discord.
- La fenêtre s’adapte à la taille de l’app, s’agrandit quand tu la maximises et ne couvre pas les boutons de la fenêtre.

### Changements
- Les réglages d’accessibilité quittent les Réglages avancés et passent dans **Mon compte → Accessibilité**.

## [1.11.2] — 2026-10-09

### Modération du chat
- Nouveau moteur **Rust Chat Guard**, activé par défaut en mode observation (il ne bloque rien, il note seulement ce qu'il aurait filtré).
- Nouveau bloc **«Modération du chat»** dans les Réglages : niveau, langues, mots autorisés, mots bloqués et état du moteur.
- Les langues du filtre **suivent la langue de la voix** du TTS automatiquement.
- Popup des **messages bloqués** depuis le badge de la file (bloqués, mots et file TTS).
- Gestion des mots bloqués unifiée et **enregistrée par compte** (migration automatique depuis l'ancien format).
- Le filtre respecte les verdicts du guard et les actions de modération sont enregistrées immédiatement.
- Nouveau filtre de **texte sans sens** (tapotages au hasard comme «asdfghjkl;») : si quelqu'un en envoie plusieurs d'affilée, le message s'affiche dans le chat mais n'est pas lu. Il est activé par défaut et vous pouvez le passer sur «Avertir seulement» ou «Désactivé» dans Réglages > «Modération du chat». Il ne rend jamais personne muet : c'est vous qui décidez. Les messages avec de vrais mots, des rires (`jajaja`, `wkwkwk`, `ㅋㅋㅋ`), des emotes ou des liens ne sont pas signalés.
- Dans le popup des messages bloqués, ceux de texte sans sens ont un bouton **«Rendre muet»** si vous voulez couper le spammeur.
- **Importer des mots bloqués** depuis un fichier `.json`, avec un assistant en 3 étapes : «Format» (exemple prêt à copier), «Importer» (glissez ou choisissez le fichier) et «Confirmer» (combien sont nouveaux et un aperçu). Les mots s'ajoutent à votre liste actuelle, ils ne la remplacent pas.

### Overlays OBS
- Nouvel **overlay des spectateurs TikTok** avec personnalisation, aperçu et bouton de test.
- Chat, Top Likers et **Top Donateurs** avec des réglages complets depuis «Personnaliser» ; avatars, rôles (modérateur/abonné) et anneau avec bulle de plateforme sur l'avatar.
- **Aperçu avec des données d'exemple** sans être connecté (chat avec les 4 plateformes, alertes fixes).
- Alertes Follow/Share simplifiées et couleur d'accent dans Top Likers. Le fond personnalisé est retiré.

### Chaînes
- **TikTok avec session persistante par compte** : connexion/déconnexion dans «Ajouter chaîne», avis de session expirée et tutoriel qui explique la connexion.
- Reconnexion beaucoup plus stable : reprise en cas de changement de salle, surveillance à double signal pour ne pas reconnecter les lives calmes, et nouvelles tentatives pour Twitch et YouTube après un silence.
- Les tentatives de connexion des chaînes sont conservées d'un essai à l'autre.
- Démarrage plus rapide (le client TikTok ne se charge que lorsqu'il est utilisé).

### Compte et abonnements
- Bouton **Supprimer le compte** dans le profil, avec mot de passe et confirmation en tapant le mot.
- Sélecteur **mensuel / annuel** et changement d'intervalle depuis le compte ; le popup des abonnements et le paiement s'ouvrent sur mensuel.
- Bannière de passage à Pro sous la barre «Lit :» (abonnement Free uniquement), bannière tournante dans le chat et fenêtre de code de réduction.
- Fenêtres de **dons** et d'**annulation de Pro** repensées ; vidéos de démo des fonctions Pro ; **Clips** devient une fonction Pro avec sa démo.
- Le bouton pour améliorer l'abonnement ouvre la comparaison des offres ; le popup n'apparaît plus au démarrage.
- Paywall du panneau mobile et panneau mobile avec badge Pro et menu du compte.

### Mentions légales et confidentialité
- **Conditions et Politique de confidentialité v2.1** (avec traduction en anglais).
- L'installateur demande de les accepter à chaque installation et mise à jour ; sans acceptation, ni télémétrie, ni analytique, ni rapport d'erreurs ne démarrent.
- Les conditions sont présentées à l'inscription.

### Interface
- **Voix et audio** repensé en 3 cartes, adaptées à la largeur de la fenêtre.
- **Raccourcis clavier en onglets** : TTS et chat, Musique et Général.
- Icônes SVG au lieu de symboles dans les Réglages, retour visuel au clic et Chaînes aux styles unifiés.
- Effets d'événement et avis de connexion échouée.
- Nouveautés avec vidéo YouTube intégrée.
- Connexion de l'agent **MCP** simplifiée (extraits plus clairs).
- Vous pouvez maintenant fermer la fenêtre sans éteindre l'app. Si vous activez **Réduire dans la zone de notification à la fermeture** dans les Réglages, un clic sur le X cache TikLiveTTS dans la zone de notification (près de l'horloge) et il continue de lire le chat. Pour le fermer complètement, faites un clic droit sur son icône et choisissez **Quitter**. C'est désactivé par défaut : le X continue de fermer l'app comme avant tant que vous ne l'activez pas.
- Nouvelle option **Ouvrir au démarrage de Windows** : TikLiveTTS se lance tout seul quand vous allumez le PC, il est donc prêt quand vous commencez votre live.

### Corrections
- Badge de la file avec un texte clair, redessiné au chargement de la langue.
- La bannière Pro s'affiche de nouveau à chaque ouverture.
- Textes corrompus (mojibake) réparés dans les 10 langues et nouvelles clés traduites.
- Le tutoriel des chaînes pointait vers un élément masqué ; la connexion TikTok ne disparaissait pas après s'être connecté.
- Les puces de plateforme de l'overlay du chat affichaient mal leur état coché.
- Barre latérale par défaut sur une nouvelle installation (chat, overlays, clips, modération).
- Le Soundpad valide mieux la liste reçue ; message de chat simulé avec un id unique.
- TTS : l'audio bloqué est coupé et la longueur du texte est limitée.
- `--user-data-dir` est respecté lorsqu'il est indiqué explicitement.
- Plusieurs retouches d'icônes, de fenêtres et d'états dans l'interface.
- L'import de mots bloqués n'accepte plus les fichiers au format invalide : un JSON cassé ou qui n'est pas une liste de mots est refusé avec un avis clair, au lieu d'une erreur générique ou d'une liste remplie de texte inutile.
- Annonces vocales de TikLiveTTS plus intelligentes : la première sonne au bout de 15 minutes et les suivantes au plus toutes les 25 minutes, et seulement quand il y a du monde dans votre live. Si le live est vide, elles attendent l'arrivée du public au lieu de sonner quand même. Avant, elles pouvaient se répéter trop souvent ou mettre très longtemps à sonner. Avec l'abonnement Pro, elles ne sonnent pas.
- La voix ne lit plus les longs nombres des pseudos : `pablito434435433453` est lu «pablito», et les comptes sans vrai nom (`user14423423…`, `usuario14423423…`) sont lus «utilisateur», dans la langue de l'app. Cela vaut pour le chat et pour les annonces d'arrivées, follows, cadeaux, likes et partages. Les noms avec peu de chiffres (`lu15`, `pablo2024`) sont lus comme avant, et à l'écran, dans OBS et dans les classements le pseudo reste affiché en entier.
- Bot musical : demander une chanson avec un lien YouTube (`!p https://youtu.be/...`) joue de nouveau cette chanson. Avant, le lien se perdait et le bot cherchait le mot « link », donc une autre chanson se lançait. Dans le chat et dans la voix, le lien s'affiche toujours comme « link ».
- Bot musical : le moteur YouTube reçoit désormais les correctifs le jour même de leur sortie, au lieu d'attendre des semaines la prochaine version stable, donc les demandes cessent d'échouer bien plus tôt quand YouTube change quelque chose. Si une mise à jour du moteur restait à moitié faite parce que de la musique jouait, elle s'applique toute seule à la prochaine ouverture de l'app.
- Kick : le chat se reconnecte. Kick a changé le système qu'il utilise pour son chat en direct et l'app ne pouvait plus le lire : la connexion échouait. Elle utilise maintenant le nouveau système de Kick, toujours sans compte ni connexion, et la connexion se maintient seule pendant tout le live.

### Videos de YouTube
- [Voir la vidéo des nouveautés](https://www.youtube.com/watch?v=TNSqxGlOCyE)
