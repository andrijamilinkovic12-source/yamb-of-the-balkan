$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$themes = @(
  @('light','Svetlo Zlato'), @('medium','Trula Višnja'), @('winter','Plavi Okean'),
  @('neon','Neon Cyber'), @('amethyst','Kraljevski Ametist'), @('easter','Vaskršnja'),
  @('desert','Pustinjsko Staklo'), @('moon','Mesečev Sjaj'), @('severna','Severna Maglina')
)
$bitmap = New-Object System.Drawing.Bitmap(1200, 1215)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#161d26'))
$titleFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
$nameFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font('Segoe UI', 10)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#F1F4F6'))
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#BBC8D3'))
$card = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#26313D'))
try {
  $graphics.DrawString('Dukati sa pet tačaka · 9 tema', $titleFont, $white, 30, 20)
  $graphics.DrawString('Prednji prikaz · 3D Soft Neomorphism · svaka tema ima svoj oblik i materijal', $subFont, $muted, 32, 62)
  for ($i = 0; $i -lt $themes.Count; $i++) {
    $x = 28 + ($i % 3) * 392
    $y = 100 + [math]::Floor($i / 3) * 368
    $graphics.FillRectangle($card, $x, $y, 365, 346)
    $file = Join-Path $repo "www\assets\theme-packs\$($themes[$i][0])\canonical\ducat\ducat-front-v1.png"
    $image = [System.Drawing.Image]::FromFile($file)
    try { $graphics.DrawImage($image, $x + 44, $y + 8, 277, 277) } finally { $image.Dispose() }
    $graphics.DrawString($themes[$i][1], $nameFont, $white, $x + 18, $y + 286)
    $graphics.DrawString($themes[$i][0], $subFont, $muted, $x + 19, $y + 315)
  }
  $target = Join-Path $repo 'docs\theme-ducat-fronts-contact-sheet.png'
  $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $target
} finally {
  $graphics.Dispose(); $bitmap.Dispose()
  $titleFont.Dispose(); $nameFont.Dispose(); $subFont.Dispose()
  $white.Dispose(); $muted.Dispose(); $card.Dispose()
}
