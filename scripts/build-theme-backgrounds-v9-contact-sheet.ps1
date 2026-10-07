Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'docs/theme-backgrounds-v9.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$items = @($manifest.themes)
$thumbW = 375
$thumbH = 665
$gap = 22
$labelH = 56
$margin = 25
$top = 78
$sheet = New-Object System.Drawing.Bitmap(($margin * 2 + 2 * $thumbW + $gap), ($top + 2 * ($thumbH + $labelH) + $gap + 20))
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(17, 23, 34))
$titleFont = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Bold)
$nameFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font('Segoe UI', 10)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(185, 209, 232))
try {
  $g.DrawString('V9 - cetiri nove pozadine', $titleFont, $white, $margin, 17)
  $g.DrawString('Svetlo Zlato i Trula Visnja V9 su prihvaceni; Plavi Okean i Mesecev Sjaj V9 odbijeni.', $smallFont, $muted, $margin, 53)
  for ($i = 0; $i -lt $items.Count; $i++) {
    $x = $margin + ($i % 2) * ($thumbW + $gap)
    $y = $top + [Math]::Floor($i / 2) * ($thumbH + $labelH + $gap)
    $src = [System.Drawing.Image]::FromFile((Join-Path $projectRoot $items[$i].path))
    try { $g.DrawImage($src, $x, $y, $thumbW, $thumbH) } finally { $src.Dispose() }
    $g.DrawString($items[$i].nameSr, $nameFont, $white, $x, ($y + $thumbH + 3))
    $state = if ($items[$i].reviewStatus -eq 'accepted-locked') { 'V9 - PRIHVACENA' } elseif ($items[$i].reviewStatus -eq 'rejected-by-user') { 'V9 - odbijena' } else { 'V9 - ceka izbor' }
    $g.DrawString($state, $smallFont, $muted, $x, ($y + $thumbH + 34))
  }
  $out = Join-Path $projectRoot 'docs/theme-backgrounds-v9-contact-sheet.png'
  $sheet.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $out
} finally {
  $g.Dispose(); $sheet.Dispose(); $titleFont.Dispose(); $nameFont.Dispose(); $smallFont.Dispose(); $white.Dispose(); $muted.Dispose()
}
