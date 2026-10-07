Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'docs/theme-backgrounds-v8.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$items = @()
foreach ($theme in $manifest.themes) {
  foreach ($variant in $theme.variants) {
    $items += @{ Name = $theme.nameSr; Label = $variant.label; Path = $variant.path }
  }
}
$items += @{ Name = 'Kraljevski Ametist'; Label = 'V6 - PRIHVACENA'; Path = $manifest.acceptedRoyal.path }
$thumbW = 270
$thumbH = 480
$gap = 18
$labelH = 60
$margin = 22
$top = 76
$cols = 3
$rows = [Math]::Ceiling($items.Count / $cols)
$sheet = New-Object System.Drawing.Bitmap(($margin * 2 + $cols * $thumbW + ($cols - 1) * $gap), ($top + $rows * ($thumbH + $labelH) + ($rows - 1) * $gap + 20))
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(17, 23, 34))
$titleFont = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Bold)
$nameFont = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font('Segoe UI', 10)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(185, 209, 232))
try {
  $g.DrawString('V8 - izbor po temi', $titleFont, $white, $margin, 17)
  $g.DrawString('Pustinjsko Staklo V8 verzija 2 je prihvaceno; ostalo je prethodni pregled.', $smallFont, $muted, $margin, 51)
  for ($i = 0; $i -lt $items.Count; $i++) {
    $x = $margin + ($i % $cols) * ($thumbW + $gap)
    $y = $top + [Math]::Floor($i / $cols) * ($thumbH + $labelH + $gap)
    $source = Join-Path $projectRoot $items[$i].Path
    $src = [System.Drawing.Image]::FromFile($source)
    try { $g.DrawImage($src, $x, $y, $thumbW, $thumbH) } finally { $src.Dispose() }
    $g.DrawString($items[$i].Name, $nameFont, $white, $x, ($y + $thumbH + 3))
    $g.DrawString($items[$i].Label, $smallFont, $muted, $x, ($y + $thumbH + 31))
  }
  $output = Join-Path $projectRoot 'docs/theme-backgrounds-v8-contact-sheet.png'
  $sheet.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $output
} finally {
  $g.Dispose(); $sheet.Dispose(); $titleFont.Dispose(); $nameFont.Dispose(); $smallFont.Dispose(); $white.Dispose(); $muted.Dispose()
}
