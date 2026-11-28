// Lo que puede salir de la Mystery Ball. `id` = clave de texto en temporada.mysteryBall.<id>; `peso` es la probabilidad
// en % y solo lo usa el sorteo: es interna y nunca se muestra. El orden es el de las cartas en pantalla.
export const PREMIOS_MISTERIOSOS = [
  // Meme provisional: el gato y la risa del aviso de conexion fallida, mientras no esten los memes definitivos.
  {
    id: 'meme', rareza: 'comun', icono: 'icons/sentiment_very_satisfied.svg', peso: 30, sinPremio: true,
    media: 'img/mascota/gato-grito.webp', sonido: { src: 'audio/ui/cat-laugh.mp3', volumen: 0.4 },
  },
  { id: 'wallpaper', rareza: 'comun', icono: 'icons/insert_photo.svg', peso: 35 },
  { id: 'sinAds', rareza: 'raro', icono: 'icons/block.svg', peso: 27 },
  { id: 'overlay', rareza: 'epico', icono: 'icons/palette.svg', peso: 8 },
];
