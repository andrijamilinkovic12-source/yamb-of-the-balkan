param(
  [Parameter(Mandatory = $true)][string]$Theme,
  [Parameter(Mandatory = $true)][string]$Manifest,
  [switch]$ReplaceDraft
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifestPath = (Resolve-Path -LiteralPath $Manifest).Path
$iconSources = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$generatedRoot = Join-Path $env:USERPROFILE ".codex\generated_images\$($iconSources.generatedFolder)"
$sourceDir = Join-Path $repo "source-assets\theme-icon-packs\$Theme\main-rooms-v1"
$runtimeDir = Join-Path $repo "www\assets\theme-packs\$Theme\canonical"
$roles = @('solo','hotseat','online-random','invite-friend','daily','global-chat','leaderboard','online-players','quarterly-league','rules','settings','statistics')
New-Item -ItemType Directory -Path $sourceDir -Force | Out-Null

foreach ($role in $roles) {
  $sourcePath = Join-Path $generatedRoot $iconSources.icons.$role
  if (-not $sourcePath -or -not (Test-Path -LiteralPath $sourcePath)) { throw "Missing generated $role PNG: $sourcePath" }
  $masterPath = Join-Path $sourceDir "$role-master-v1.png"
  if ((Test-Path -LiteralPath $masterPath) -and -not $ReplaceDraft) { throw "Existing master, use -ReplaceDraft to replace your draft: $masterPath" }
  Copy-Item -LiteralPath $sourcePath -Destination $masterPath -Force
  $roleDir = Join-Path $runtimeDir "$role-room-identity"
  New-Item -ItemType Directory -Path $roleDir -Force | Out-Null
  $inputImage = [System.Drawing.Image]::FromFile($masterPath)
  try {
    $preview = New-Object System.Drawing.Bitmap(384, 384, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $previewGraphics = [System.Drawing.Graphics]::FromImage($preview)
    try {
      $previewGraphics.Clear([System.Drawing.Color]::Transparent)
      $previewGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $previewGraphics.DrawImage($inputImage, (New-Object System.Drawing.Rectangle(0,0,384,384)))
    } finally { $previewGraphics.Dispose() }
    $minX = 384; $minY = 384; $maxX = -1; $maxY = -1
    try {
      for ($y = 0; $y -lt 384; $y++) {
        for ($x = 0; $x -lt 384; $x++) {
          if ($preview.GetPixel($x, $y).A -ge 16) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
          }
        }
      }
    } finally { $preview.Dispose() }
    if ($maxX -lt 0) { throw "Master has no visible pixels: $masterPath" }
    $visibleWidth = $maxX - $minX + 1
    $visibleHeight = $maxY - $minY + 1
    $scale = (384 * .86) / [math]::Max($visibleWidth, $visibleHeight)
    $centerX = ($minX + $maxX + 1) / 2
    $centerY = ($minY + $maxY + 1) / 2
    foreach ($spec in @(@{ size = 384; name = "$role-room-menu-v1.png" }, @{ size = 512; name = "$role-room-v1.png" })) {
      $targetPath = Join-Path $roleDir $spec.name
      if ((Test-Path -LiteralPath $targetPath) -and -not $ReplaceDraft) { throw "Existing PNG, use -ReplaceDraft to replace your draft: $targetPath" }
      $bitmap = New-Object System.Drawing.Bitmap($spec.size, $spec.size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $drawSize = [math]::Round($spec.size * $scale)
        $drawX = [math]::Round($spec.size / 2 - ($centerX / 384) * $drawSize)
        $drawY = [math]::Round($spec.size / 2 - ($centerY / 384) * $drawSize)
        $graphics.DrawImage($inputImage, (New-Object System.Drawing.Rectangle($drawX,$drawY,$drawSize,$drawSize)))
        $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally { $graphics.Dispose(); $bitmap.Dispose() }
    }
  } finally { $inputImage.Dispose() }
}

Write-Output "Imported $($roles.Count) $Theme main-room masters and $($roles.Count * 2) PNG variants."
