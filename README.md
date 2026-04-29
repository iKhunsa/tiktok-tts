# 🎵 TikTok Live TTS — Tu propio lector de chat

## ¿Qué hace?
Lee en voz alta los comentarios de tu TikTok Live usando el micrófono del navegador (Web Speech API). Completamente gratis, sin límites.

## 📋 Requisitos
- Node.js instalado (https://nodejs.org) — versión 16 o superior
- Tu TikTok Live activo mientras usas la app

## 🚀 Cómo usarlo

### 1. Instalar dependencias
```bash
cd tiktok-tts
npm install
```

### 2. Iniciar el servidor
```bash
node server.js
```

### 3. Abrir en el navegador
```
http://localhost:3000
```

### 4. Conectar
- Escribe tu usuario de TikTok (sin @)
- Presiona **Conectar**
- ¡Empieza tu live y el chat se leerá solo!

## ⚙️ Funciones
- ✅ Lee comentarios del chat en voz alta
- ✅ Elige entre todas las voces instaladas en tu PC
- ✅ Ajusta velocidad, volumen y tono
- ✅ Cola de mensajes (no se pierde ninguno)
- ✅ Opción de anunciar regalos y entradas
- ✅ Historial visual del chat con colores por usuario

## ⚠️ Notas importantes
- Debes estar en VIVO en TikTok para que funcione
- La primera vez puede demorar unos segundos en conectar
- Funciona mejor en Chrome o Edge (mejor soporte de voces TTS)
- Mantén la pestaña del navegador abierta y activa

## 🛠️ Estructura del proyecto
```
tiktok-tts/
├── server.js          ← Backend Node.js
├── package.json       ← Dependencias
├── public/
│   └── index.html    ← Interfaz web
└── README.md
```
