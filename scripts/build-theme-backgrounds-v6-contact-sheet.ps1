Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$items = @(
  @{ Name = 'Svetlo Zlato'; File = 'light-background-master-v6.png'; Status = 'DOPADA SE - DORADA' },
  @{ Name = 'Trula Visnja'; File = 'medium-background-master-v6.png'; Status = 'DOPADA SE - DORADA' },
  @{ Name = 'Plavi Okean'; File = 'winter-background-master-v6.png'; Status = 'ODBIJENA V6' },
  @{ Name = 'Kraljevski Ametist'; File = 'amethyst-background-master-v6.png'; Status = 'PRIHVACENA V6' },
  @{ Name = 'Vaskrsnja - verzija 1'; File = 'easter-background-variant-1-v6.png'; Status = 'PRIHVACENA V6' },
  @{ Name = 'Pustinjsko Staklo'; File = 'desert-background-master-v6.png'; Status = 'PRAVAC SE DOPADA' },
  @{ Name = 'Mesecev Sjaj'; File = 'moon-background-master-v6.png'; Status = 'PRAVAC SE DOPADA' }
)
$thumbW = 300
$thumbH = 533
$gap = 22
$labelH = 60
$margin = 26
$top = 85
$sheet = New-Object System.Drawing.Bitmap(($margin * 2 + 3 * $thumbW + 2 * $gap), ($top + 3 * ($thumbH + $labelH) + 2 * $gap + 20))
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(13, 22, 40))
$titleFont = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Bold)
$nameFont = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font('Segoe UI', 10)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(188, 203, 221))
try {
  $g.DrawString('V6 - zabelezeni statusi', $titleFont, $white, $margin, 20)
  $g.DrawString('Plavi Okean V6 je odbijen; nova V7 slika je u posebnom pregledu.', $smallFont, $muted, $margin, 55)
  for ($i = 0; $i -lt $items.Count; $i++) {
    $x = $margin + ($i % 3) * ($thumbW + $gap)
    $y = $top + [Math]::Floor($i / 3) * ($thumbH + $labelH + $gap)
    $path = Join-Path $projectRoot ('source-assets/theme-backgrounds-v6/' + $items[$i].File)
    $src = [System.Drawing.Image]::FromFile($path)
    try { $g.DrawImage($src, $x, $y, $thumbW, $thumbH) } finally { $src.Dispose() }
    $g.DrawString($items[$i].Name, $nameFont, $white, $x, ($y + $thumbH + 4))
    $g.DrawString($items[$i].Status, $smallFont, $muted, $x, ($y + $thumbH + 33))
  }
  $out = Join-Path $projectRoot 'docs/theme-backgrounds-v6-contact-sheet.png'
  $sheet.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $out
} finally {
  $g.Dispose(); $sheet.Dispose(); $titleFont.Dispose(); $nameFont.Dispose(); $smallFont.Dispose(); $white.Dispose(); $muted.Dispose()
}
