Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'docs/theme-blue-moon-all-versions.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$thumbW = 248
$thumbH = 372
$gap = 18
$labelH = 65
$margin = 20
$top = 70
$cols = 3
foreach ($theme in $manifest.themes) {
  $items = @($theme.versions)
  $rows = [Math]::Ceiling($items.Count / $cols)
  $sheet = New-Object System.Drawing.Bitmap(($margin * 2 + $cols * $thumbW + ($cols - 1) * $gap), ($top + $rows * ($thumbH + $labelH) + ($rows - 1) * $gap + 20))
  $g = [System.Drawing.Graphics]::FromImage($sheet)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::FromArgb(16, 23, 35))
  $titleFont = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Bold)
  $nameFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
  $smallFont = New-Object System.Drawing.Font('Segoe UI', 9)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(183, 207, 228))
  try {
    $g.DrawString(($theme.nameSr + ' - sve sacuvane verzije'), $titleFont, $white, $margin, 16)
    $g.DrawString(($items.Count.ToString() + ' slika; pogledati status uz svaku verziju'), $smallFont, $muted, $margin, 49)
    for ($i = 0; $i -lt $items.Count; $i++) {
      $x = $margin + ($i % $cols) * ($thumbW + $gap)
      $y = $top + [Math]::Floor($i / $cols) * ($thumbH + $labelH + $gap)
      $source = Join-Path $projectRoot $items[$i].path
      $src = [System.Drawing.Image]::FromFile($source)
      try { $g.DrawImage($src, $x, $y, $thumbW, $thumbH) } finally { $src.Dispose() }
      $g.DrawString($items[$i].label, $nameFont, $white, $x, ($y + $thumbH + 3))
      $g.DrawString($items[$i].status, $smallFont, $muted, $x, ($y + $thumbH + 34))
    }
    $out = Join-Path $projectRoot $manifest.contactSheets.($theme.themeId)
    $sheet.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output $out
  } finally {
    $g.Dispose(); $sheet.Dispose(); $titleFont.Dispose(); $nameFont.Dispose(); $smallFont.Dispose(); $white.Dispose(); $muted.Dispose()
  }
}
