[Setup]
AppName=TikTok TTS
AppVersion=1.0.0
AppPublisher=TikTok TTS
AppPublisherURL=https://github.com/iKhunsa/tiktok-tts
DefaultDirName={localappdata}\TikTokTTS
DefaultGroupName=TikTok TTS
UninstallDisplayIcon={app}\TikTokTTS.exe
OutputDir=installer
OutputBaseFilename=TikTokTTS-Setup
Compression=lzma2/ultra64
SolidCompression=yes
SetupIconFile=tray-icon.ico
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
ShowLanguageDialog=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
Source: "dist\TikTokTTS.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\tray-icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\blocked-words.md"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
Source: "dist\gifts\*"; DestDir: "{app}\gifts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "dist\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "dist\asset\*"; DestDir: "{app}\asset"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\public\uploads"

[Icons]
Name: "{autodesktop}\TikTok TTS"; Filename: "{app}\TikTokTTS.exe"; IconFilename: "{app}\tray-icon.ico"; Comment: "TikTok Live Text-to-Speech"
Name: "{autoprograms}\TikTok TTS\TikTok TTS"; Filename: "{app}\TikTokTTS.exe"; IconFilename: "{app}\tray-icon.ico"
Name: "{autoprograms}\TikTok TTS\Desinstalar TikTok TTS"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\TikTokTTS.exe"; Description: "Iniciar TikTok TTS ahora"; Flags: nowait postinstall skipifsilent
