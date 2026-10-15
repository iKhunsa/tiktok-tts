## [1.11.2] — 2026-10-09

### Moderação do chat
- Novo motor **Rust Chat Guard**, ligado de fábrica em modo observação (não bloqueia nada, só registra o que teria filtrado).
- Novo bloco **«Moderação do chat»** em Ajustes: nível, idiomas, palavras permitidas, palavras bloqueadas e estado do motor.
- Os idiomas do filtro **seguem o idioma da voz** do TTS automaticamente.
- Popup de **mensagens bloqueadas** a partir do badge da fila (bloqueadas, palavras e fila TTS).
- Gestão de palavras bloqueadas unificada e **salva por conta** (migra sozinha do formato anterior).
- O filtro respeita os veredictos do guard e as ações de moderação são salvas na hora.
- Novo filtro de **texto sem sentido** (teclas aleatórias como «asdfghjkl;»): se alguém manda várias seguidas, a mensagem aparece no chat mas não é lida. Vem ativo de fábrica e você pode mudar para «Só avisar» ou «Desligado» em Ajustes > «Moderação do chat». Nunca silencia a pessoa: isso é você quem decide. Mensagens com palavras reais, risadas (`jajaja`, `wkwkwk`, `ㅋㅋㅋ`), emotes ou links não são marcadas.
- No popup de mensagens bloqueadas, as de texto sem sentido têm um botão **«Silenciar usuário»** caso você queira cortar o spammer.
- **Importar palavras bloqueadas** de um arquivo `.json`, com um assistente de 3 passos: «Formato» (exemplo pronto para copiar), «Importar» (arraste ou escolha o arquivo) e «Confirmar» (quantas são novas e uma prévia). As palavras se somam à sua lista atual, não a substituem.

### Overlays do OBS
- Novo **overlay de espectadores do TikTok** com personalização, prévia e botão de teste.
- Chat, Top Likers e **Top Doadores** com ajustes completos em «Personalizar»; avatares, cargos (moderador/inscrito) e anel com bolha da plataforma no avatar.
- **Prévia com dados de exemplo** sem precisar estar conectado (chat com as 4 plataformas, alertas fixos).
- Alertas de Follow/Share simplificados e cor de destaque no Top Likers. O fundo personalizado foi removido.

### Canais
- **TikTok com sessão persistente por conta**: login/logout dentro de «Adicionar canal», aviso de sessão expirada e tutorial que explica o login.
- Reconexão muito mais estável: se recupera quando a sala muda, vigia com sinal duplo para não reconectar lives tranquilas e tenta de novo Twitch e YouTube após silêncios.
- As tentativas de conexão dos canais são mantidas entre tentativas.
- Inicialização mais rápida (o cliente do TikTok só carrega quando é usado).

### Conta e planos
- Botão **Excluir conta** no perfil, com senha e confirmação digitando a palavra.
- Seletor **mensal / anual** e troca de intervalo pela conta; o popup de planos e o checkout abrem no mensal.
- Banner de upgrade para Pro abaixo da barra «Lê» (só no plano Free), banner rotativo no chat e modal de código de desconto.
- Modais de **doações** e de **cancelamento do Pro** redesenhados; vídeos demo das funções Pro; **Clips** passa a ser função Pro com sua demo.
- O botão de melhorar plano abre a comparação de planos; o popup não aparece mais ao iniciar.
- Paywall do painel móvel e painel móvel com badge Pro e menu de conta.

### Legal e privacidade
- **Termos e Política de Privacidade v2.1** (com tradução para o inglês).
- O instalador pede para aceitá-los em cada instalação e atualização; sem aceitar, não inicia telemetria, analítica nem relatório de erros.
- Os termos são informados no cadastro.

### Interface
- **Voz e áudio** redesenhado em 3 cartões, adaptável à largura da janela.
- **Atalhos de teclado em abas**: TTS e chat, Música e Geral.
- Ícones SVG no lugar de símbolos em Ajustes, feedback ao clicar e Canais com estilos unificados.
- Efeitos de evento e aviso de conexão falhada.
- Novidades com vídeo do YouTube incorporado.
- Conexão do agente **MCP** simplificada (snippets mais claros).
- Agora você pode fechar a janela sem desligar o app. Se ativar **Minimizar para a bandeja ao fechar** em Ajustes, ao clicar no X o TikLiveTTS se esconde na bandeja do sistema (perto do relógio) e continua lendo o chat. Para fechar de vez, clique com o botão direito no ícone dele e escolha **Sair**. Vem desativado, então o X continua fechando o app como antes até você ativar.
- Nova opção **Abrir ao iniciar o Windows**: o TikLiveTTS abre sozinho ao ligar o PC, assim já está pronto quando você começa sua live.

### Correções
- Badge da fila com texto claro e redesenhado ao carregar o idioma.
- O banner do Pro volta a aparecer a cada abertura.
- Textos corrompidos (mojibake) corrigidos nos 10 idiomas e chaves novas traduzidas.
- O tutorial de canais apontava para um elemento oculto; o login do TikTok não sumia ao entrar.
- Os chips de plataforma do overlay de chat mostravam errado o estado marcado.
- Barra lateral padrão em instalação nova (chat, overlays, clips, moderação).
- O Soundpad valida melhor a lista recebida; mensagem de chat simulada com id único.
- TTS: o áudio que trava é cortado e o tamanho do texto é limitado.
- `--user-data-dir` é respeitado quando indicado explicitamente.
- Vários ajustes de ícones, modais e estados na interface.
- Importar palavras bloqueadas não aceita mais arquivos com formato inválido: um JSON quebrado ou que não seja uma lista de palavras é rejeitado com um aviso claro, em vez de dar um erro genérico ou encher a lista de lixo.
- Avisos de voz do TikLiveTTS mais inteligentes: o primeiro toca aos 15 minutos e os seguintes no máximo a cada 25 minutos, e só quando há gente na sua live. Se a live estiver vazia, eles esperam chegar público em vez de tocar mesmo assim. Antes podiam se repetir muito seguido ou demorar demais para tocar. Com o plano Pro eles não tocam.
- A voz não lê mais os números longos dos nicks: `pablito434435433453` é lido como «pablito», e as contas sem nome próprio (`user14423423…`, `usuario14423423…`) são lidas como «usuário», no idioma do app. Vale para o chat e para os avisos de entradas, follows, presentes, likes e shares. Nomes com poucos números (`lu15`, `pablo2024`) são lidos como antes, e na tela, no OBS e nos rankings o nick continua aparecendo completo.
- Bot de música: pedir uma música com um link do YouTube (`!p https://youtu.be/...`) volta a tocar essa música. Antes o link se perdia e o bot buscava a palavra «link», então tocava outra música. No chat e na voz o link continua aparecendo como «link».
- Bot de música: o motor do YouTube agora recebe as correções no mesmo dia em que saem, em vez de esperar semanas pela próxima versão estável, então os pedidos param de falhar muito antes quando o YouTube muda algo. Se uma atualização do motor ficava pela metade porque havia música tocando, ela termina de ser aplicada sozinha ao abrir o app de novo.
- Kick: o chat volta a conectar. A Kick mudou o sistema que usa no chat ao vivo e o app não conseguia mais lê-lo: a conexão falhava. Agora ele usa o sistema novo da Kick, continua sem pedir conta nem login, e a conexão se mantém sozinha durante toda a live.

### Videos de YouTube
- [Ver vídeo de novidades](https://www.youtube.com/watch?v=TNSqxGlOCyE)
