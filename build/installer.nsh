; Terminos y Privacidad: hay que aceptarlos en cada instalacion Y en cada
; actualizacion. Los textos (build/license_<idioma>.txt) y TERMS_VERSION los
; genera scripts/build-license-texts.js desde docs/legal/*.md.
!include "terms-version.nsh"

; electron-builder inserta su licensePage (que ya trae LicenseLangString
; MUILicense) precedida de skipPageIfUpdated: en una actualizacion la omite.
; Esta pagina cubre justo ese caso: se muestra SOLO si es actualizacion, asi en
; cada ejecucion el usuario ve exactamente una pagina de licencia.
; (Va dentro del macro porque isUpdated/FileFunc se definen despues de este include.)
!macro customWelcomePage
  Function showLicenseWhenUpdated
    ${ifNot} ${isUpdated}
      Abort
    ${endIf}
  FunctionEnd

  !insertmacro GetTime
  !define MUI_PAGE_CUSTOMFUNCTION_PRE showLicenseWhenUpdated
  !insertmacro MUI_PAGE_LICENSE "$(MUILicense)"
!macroend

; Registro de aceptacion (mejor esfuerzo). customInstall solo corre cuando el
; instalador llega a instalar, o sea tras pulsar "Acepto". En modo silencioso
; no hay pagina de licencia, asi que no se registra aceptacion.
!macro customInstall
  ${ifNot} ${Silent}
    Push $0
    Push $1
    Push $2
    Push $3
    Push $4
    Push $5
    Push $6
    Push $7
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    CreateDirectory "$APPDATA\tiktok-live-tts"
    FileOpen $7 "$APPDATA\tiktok-live-tts\terminos-aceptados.json" w
    FileWrite $7 '{ "version": "${TERMS_VERSION}", "fecha": "$2-$1-$0T$4:$5:$6" }$\r$\n'
    FileClose $7
    Pop $7
    Pop $6
    Pop $5
    Pop $4
    Pop $3
    Pop $2
    Pop $1
    Pop $0
  ${endIf}
!macroend
