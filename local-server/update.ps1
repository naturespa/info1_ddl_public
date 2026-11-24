param([string]$Target)
$ErrorActionPreference = 'Stop'
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js が見つかりません。既存サーバーと同じPCで実行してください。' }
  $listening = Get-NetTCPConnection -LocalPort 3003 -State Listen -ErrorAction SilentlyContinue
  if ($listening) { throw '3003番のサーバーが起動中です。サーバー画面で Ctrl+C を押して終了してから実行してください。' }
  if (-not $Target) {
    $defaultFolder = @('C:\1nen\ddl1', 'C:\ddl1-json') | Where-Object { Test-Path (Join-Path $_ 'server.cjs') } | Select-Object -First 1
    $prompt = '現在の管理サーバーのフォルダー（server.cjs のある場所）'
    if ($defaultFolder) { $prompt += " [$defaultFolder]" }
    $Target = Read-Host $prompt
    if (-not $Target) { $Target = $defaultFolder }
  }
  if (-not $Target -or -not (Test-Path (Join-Path $Target 'server.cjs'))) { throw '指定先に server.cjs がありません。新しいフォルダーではなく、現在使っているフォルダーを指定してください。' }
  $destination = (Resolve-Path -LiteralPath $Target).Path
  if ($destination -eq $PSScriptRoot) { throw '更新ZIPは、現在のサーバーとは別のフォルダーへ展開してください。' }
  $files = @('server.cjs', 'admin.html', 'reports.cjs', 'report-catalog.cjs', 'xlsx.cjs', 'admin-state.cjs')
  foreach ($name in $files) { if (-not (Test-Path (Join-Path $PSScriptRoot $name))) { throw "更新用の $name がありません。ZIPをすべて展開してください。" } }
  $backupFolder = Join-Path $destination ('.ddl-admin-backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
  $existing = @()
  foreach ($name in $files) {
    $old = Join-Path $destination $name
    if (Test-Path -LiteralPath $old) { Copy-Item -LiteralPath $old -Destination (Join-Path $backupFolder $name); $existing += $name }
  }
  try {
    foreach ($name in $files) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $destination $name) -Force }
    & node -e "require(process.argv[1])" (Join-Path $destination 'server.cjs')
    if ($LASTEXITCODE -ne 0) { throw '新しいファイルの読み込み検証に失敗しました。' }
  } catch {
    foreach ($name in $files) {
      $installed = Join-Path $destination $name
      if ($existing -contains $name) { Copy-Item -LiteralPath (Join-Path $backupFolder $name) -Destination $installed -Force }
      elseif (Test-Path -LiteralPath $installed) { Remove-Item -LiteralPath $installed }
    }
    throw '更新に失敗したため、プログラムを更新前に戻しました。data・名簿・start.bat は変更していません。'
  }
  Write-Host "更新しました: $destination" -ForegroundColor Green
  Write-Host "更新前プログラムの保存先: $backupFolder"
  Write-Host 'data フォルダー・名簿・start.bat・環境変数の設定は変更していません。'
  Write-Host 'いつもの start.bat で起動し、http://localhost:3003/admin を開き直してください。'
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
