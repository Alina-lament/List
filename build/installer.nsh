; ── 检测上次安装位置，覆盖安装时自动填入 ──
!macro __uninstall_old
  ; 从注册表读取上次安装路径
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${If} $0 != ""
    StrCpy $INSTDIR $0
  ${EndIf}
!macroend

; 在目录选择页面前触发检测
!macro customInit
  !insertmacro __uninstall_old
!macroend

; 安装完成后将路径写入注册表（供下次升级检测）
!macro customInstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation" "$INSTDIR"
!macroend
