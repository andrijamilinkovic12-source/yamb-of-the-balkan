$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifest = Get-Content (Join-Path $repo 'docs/theme-main-room-extension-sources.json') -Raw | ConvertFrom-Json
$root = Join-Path $env:USERPROFILE ".codex\generated_images\$($manifest.generatedFolder)"
$themes = @('light','medium','winter','neon','amethyst','easter','desert','moon','severna')
$names = @('Svetlo Zlato','Trula Visnja','Plavi Okean','Neon Cyber','Kraljevski Ametist','Vaskrsnja','Pustinjsko Staklo','Mesecev Sjaj','Severna Maglina')
$roles = @('Riznica','Turnir','Dukati / Ispravka')
$cellW = 250; $cellH = 236; $headH = 48
$sheet = New-Object System.Drawing.Bitmap(($cellW * 3), ($headH + $cellH * 9), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sheet)
try {
  $g.Clear([System.Drawing.Color]::FromArgb(239,238,236))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $font = New-Object System.Drawing.Font('Arial', 12, [System.Drawing.FontStyle]::Bold)
  $smallFont = New-Object System.Drawing.Font('Arial', 10)
  $brush = [System.Drawing.Brushes]::Black
  for ($c=0; $c -lt 3; $c++) { $g.DrawString($roles[$c], $font, $brush, [float]($c*$cellW+12), [float]12) }
  for ($r=0; $r -lt 9; $r++) {
    $files = $manifest.themes.($themes[$r])
    for ($c=0; $c -lt 3; $c++) {
      $x = $c*$cellW; $y = $headH+$r*$cellH
      $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250,249,246))
      try { $g.FillRectangle($bg, $x+4, $y+4, $cellW-8, $cellH-8) } finally { $bg.Dispose() }
      $path = Join-Path $root $files[$c]
      if (-not (Test-Path -LiteralPath $path)) { throw "Missing $path" }
      $img = [System.Drawing.Image]::FromFile($path)
      try { $g.DrawImage($img, (New-Object System.Drawing.Rectangle(($x+23),($y+5),204,204))) } finally { $img.Dispose() }
      $g.DrawString($names[$r], $smallFont, $brush, [float]($x+12), [float]($y+207))
    }
  }
  $out = Join-Path $repo 'docs/theme-main-room-extension-contact-sheet.png'
  $sheet.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $out
} finally { $g.Dispose(); $sheet.Dispose() }
