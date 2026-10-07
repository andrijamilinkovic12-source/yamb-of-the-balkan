param(
  [Parameter(Mandatory = $true)][string]$Theme,
  [string]$Output
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$roles = @('solo','hotseat','online-random','invite-friend','daily','global-chat','leaderboard','online-players','quarterly-league','rules','settings','statistics')
$palette = @{
  light = @{ background = '#FFF1D7'; card = '#F3D6A8'; text = '#431F0C' }
  medium = @{ background = '#431720'; card = '#62232B'; text = '#F1C3B2' }
  winter = @{ background = '#FFF4E5'; card = '#D6E3EA'; text = '#173D5B' }
  neon = @{ background = '#080D18'; card = '#152A43'; text = '#56E5D2' }
  amethyst = @{ background = '#2D1D3C'; card = '#493056'; text = '#E0CDE5' }
  easter = @{ background = '#FFF8EA'; card = '#E7E8D5'; text = '#4D6B45' }
  desert = @{ background = '#FFF0DA'; card = '#EFC29F'; text = '#87523C' }
  moon = @{ background = '#181B24'; card = '#30343F'; text = '#E1E2E7' }
  severna = @{ background = '#0B1830'; card = '#1E3A50'; text = '#F5FBFF' }
}
if (-not $palette.ContainsKey($Theme)) { throw "No sheet palette for theme: $Theme" }
if (-not $Output) { $Output = Join-Path $repo "docs\main-room-icons-$Theme-review-v1.png" }

$width = 1000
$height = 840
$bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$font = New-Object System.Drawing.Font('Arial', 15, [System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font('Arial', 11, [System.Drawing.FontStyle]::Regular)
$backgroundBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($palette[$Theme].background))
$cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($palette[$Theme].card))
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($palette[$Theme].text))
try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($palette[$Theme].background))
  $graphics.DrawString("$Theme — main room icon pack v1", $font, $textBrush, 24, 14)
  $graphics.DrawString('Originals shown on theme surface; 384 px menu and 512 px room variants are separate PNGs.', $smallFont, $textBrush, 24, 45)
  for ($index = 0; $index -lt $roles.Count; $index++) {
    $role = $roles[$index]
    $col = $index % 4
    $row = [math]::Floor($index / 4)
    $x = 22 + $col * 245
    $y = 82 + $row * 249
    $graphics.FillRectangle($cardBrush, $x, $y, 224, 222)
    $path = Join-Path $repo "www\assets\theme-packs\$Theme\canonical\$role-room-identity\$role-room-menu-v1.png"
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing PNG: $path" }
    $icon = [System.Drawing.Image]::FromFile($path)
    try { $graphics.DrawImage($icon, (New-Object System.Drawing.Rectangle(($x + 24), ($y + 10), 176, 176))) }
    finally { $icon.Dispose() }
    $graphics.DrawString($role, $smallFont, $textBrush, ($x + 14), ($y + 191))
  }
  $bitmap.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose(); $bitmap.Dispose(); $font.Dispose(); $smallFont.Dispose()
  $backgroundBrush.Dispose(); $cardBrush.Dispose(); $textBrush.Dispose()
}
Write-Output $Output
