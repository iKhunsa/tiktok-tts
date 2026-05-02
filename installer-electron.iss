#define AppSource "C:\Users\liber\AppData\Local\TikTokTTS-build\win-unpacked"

[Setup]
AppName=TikTok TTS
AppVersion=1.0.0
AppPublisher=TikTok TTS
DefaultDirName={localappdata}\TikTokTTS
DefaultGroupName=TikTok TTS
UninstallDisplayIcon={app}\TikTok TTS.exe
OutputDir=C:\Users\liber\AppData\Local\TikTokTTS-build\installer
OutputBaseFilename=TikTokTTS-Setup
Compression=lzma2/ultra64
SolidCompression=yes
SetupIconFile={#AppSource}\resources\tray-icon.ico
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
ShowLanguageDialog=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
; Electron app + Chromium (todos los archivos de win-unpacked)
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\TikTok TTS"; Filename: "{app}\TikTok TTS.exe"; IconFilename: "{app}\resources\tray-icon.ico"; Comment: "TikTok Live Text-to-Speech"
Name: "{autoprograms}\TikTok TTS\TikTok TTS"; Filename: "{app}\TikTok TTS.exe"; IconFilename: "{app}\resources\tray-icon.ico"
Name: "{autoprograms}\TikTok TTS\Desinstalar TikTok TTS"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\TikTok TTS.exe"; Description: "Iniciar TikTok TTS ahora"; Flags: nowait postinstall skipifsilent
