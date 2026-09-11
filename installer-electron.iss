; TikTok TTS — Inno Setup Installer Script
; Requiere Inno Setup: https://jrsoftware.org/isdl.php
;
; Uso:
;   1. Compila la app: npm run build:electron
;   2. Genera el installer: iscc installer-electron.iss
;
; Nota: electron-builder ya genera un installer NSIS automáticamente
; en release-output/. Este script es una alternativa con Inno Setup.

#define AppSource "release-output\win-unpacked"
#define AppName "TikTok TTS"
#define AppVersion "1.0.1"
#define AppPublisher "TikTok TTS"
#define AppExeName "TikTok TTS.exe"
#define AppIcon "tray-icon.ico"

[Setup]
AppId={{com.tiktok-tts.app}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\TikTokTTS
DefaultGroupName={#AppName}
UninstallDisplayIcon={app}\{#AppExeName}
OutputDir=release-output
OutputBaseFilename=TikTokTTS-Setup-v{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
SetupIconFile={#AppSource}\resources\{#AppIcon}
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
ShowLanguageDialog=no
WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
; Electron app + Chromium (todos los archivos de win-unpacked)
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\resources\{#AppIcon}"; Comment: "TikTok Live Text-to-Speech"
Name: "{autoprograms}\{#AppName}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\resources\{#AppIcon}"
Name: "{autoprograms}\{#AppName}\Desinstalar {#AppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Iniciar {#AppName} ahora"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\*"
