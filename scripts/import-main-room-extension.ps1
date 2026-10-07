$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifest = Get-Content (Join-Path $repo 'docs/theme-main-room-extension-sources.json') -Raw | ConvertFrom-Json
$generatedRoot = Join-Path $env:USERPROFILE ".codex\generated_images\$($manifest.generatedFolder)"
$roles = @('treasury','tournament','economy')
$targets = @{
  treasury = @('runtime/menu/treasury-free-v3.png','treasury-free-v3.png')
  tournament = @('canonical/tournament-awards/champion-trophy-v1.png','canonical/tournament-awards/champion-trophy-room-v1.png')
  economy = @('runtime/menu/ducats-undo-free-v3.png','ducats-undo-free-v3.png')
}
foreach ($theme in $manifest.themes.PSObject.Properties) {
  $sourceDir = Join-Path $repo "source-assets/theme-icon-packs/$($theme.Name)/main-rooms-v1"
  $packDir = Join-Path $repo "www/assets/theme-packs/$($theme.Name)"
  New-Item -ItemType Directory -Path $sourceDir -Force | Out-Null
  $record = [ordered]@{ theme = $theme.Name; generatedFolder = $manifest.generatedFolder; roles = [ordered]@{} }
  for ($i=0; $i -lt 3; $i++) {
    $role = $roles[$i]
    $generated = Join-Path $generatedRoot $theme.Value[$i]
    if (-not (Test-Path -LiteralPath $generated)) { throw "Missing $generated" }
    $master = Join-Path $sourceDir "$role-master-v1.png"
    Copy-Item -LiteralPath $generated -Destination $master -Force
    $record.roles[$role] = [ordered]@{ master = "$role-master-v1.png"; source = $theme.Value[$i]; outputs = $targets[$role] }
    $image = [System.Drawing.Image]::FromFile($master)
    try {
      for ($j=0; $j -lt 2; $j++) {
        $size = @(384,512)[$j]
        $out = Join-Path $packDir $targets[$role][$j]
        New-Item -ItemType Directory -Path (Split-Path $out -Parent) -Force | Out-Null
        $bitmap = New-Object System.Drawing.Bitmap($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
          $graphics.Clear([System.Drawing.Color]::Transparent)
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $drawSize = [int][math]::Round($size * .88)
          $inset = [int][math]::Round(($size - $drawSize) / 2)
          $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle($inset,$inset,$drawSize,$drawSize)))
          $bitmap.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $graphics.Dispose(); $bitmap.Dispose() }
      }
    } finally { $image.Dispose() }
  }
  $record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $sourceDir 'main-room-extension-v1-generation.json') -Encoding UTF8
  Write-Output "Imported $($theme.Name): three masters, six runtime PNGs"
}
