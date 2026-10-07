throw 'V5 candidates were rejected. This contact sheet is historical and must not be rebuilt as current work.'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$items = @(
  @{ Name = 'Neon Cyber'; Status = 'PRIHVACENO V4'; Path = 'source-assets/theme-backgrounds-v4/neon-background-master-v4.png' },
  @{ Name = 'Severna Maglina'; Status = 'PRIHVACENO V4'; Path = 'source-assets/theme-backgrounds-v4/severna-background-master-v4.png' },
  @{ Name = 'Svetlo Zlato'; Status = 'NOVO V5'; Path = 'source-assets/theme-backgrounds-v5/light-background-master-v5.png' },
  @{ Name = 'Trula Visnja'; Status = 'NOVO V5'; Path = 'source-assets/theme-backgrounds-v5/medium-background-master-v5.png' },
  @{ Name = 'Plavi Okean'; Status = 'NOVO V5'; Path = 'source-assets/theme-backgrounds-v5/winter-background-master-v5.png' },
  @{ Name = 'Kraljevski Ametist'; Status = 'NOVO V5'; Path = 'source-assets/theme-backgrounds-v5/amethyst-background-master-v5.png' },
  @{ Name = 'Vaskrsnja'; Status = 'NOVO V5'; Path = 'source-assets/theme-backgrounds-v5/easter-background-master-v5.png' },
  @{ Name = 'Pustinjsko Staklo'; Status = 'NOVO V5'; Path = 'source-assets/theme-backgrounds-v5/desert-background-master-v5.png' },
  @{ Name = 'Mesecev Sjaj'; Status = 'NOVO V5'; Path = 'source-assets/theme-backgrounds-v5/moon-background-master-v5.png' }
)

$thumbWidth = 300
$thumbHeight = 533
$gap = 22
$labelHeight = 58
$left = 26
$top = 74
$sheetWidth = $left * 2 + 3 * $thumbWidth + 2 * $gap
$sheetHeight = $top + 3 * ($thumbHeight + $labelHeight) + 2 * $gap + 24
$sheet = New-Object System.Drawing.Bitmap($sheetWidth, $sheetHeight)
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$background = [System.Drawing.Color]::FromArgb(13, 22, 40)
$graphics.Clear($background)
$headingFont = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Bold)
$nameFont = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$statusFont = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Regular)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(189, 202, 219))
$graphics.DrawString('Pozadine tema - pregled V5', $headingFont, $whiteBrush, 26, 22)

try {
  for ($index = 0; $index -lt $items.Count; $index++) {
    $item = $items[$index]
    $column = $index % 3
    $row = [Math]::Floor($index / 3)
    $x = $left + $column * ($thumbWidth + $gap)
    $y = $top + $row * ($thumbHeight + $labelHeight + $gap)
    $path = Join-Path $projectRoot $item.Path
    $source = [System.Drawing.Image]::FromFile($path)
    try {
      $graphics.DrawImage($source, $x, $y, $thumbWidth, $thumbHeight)
    } finally {
      $source.Dispose()
    }
    $graphics.DrawString($item.Name, $nameFont, $whiteBrush, $x, ($y + $thumbHeight + 4))
    $graphics.DrawString($item.Status, $statusFont, $mutedBrush, $x, ($y + $thumbHeight + 31))
  }
  $output = Join-Path $projectRoot 'docs/theme-backgrounds-v5-contact-sheet.png'
  $sheet.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output $output
} finally {
  $graphics.Dispose()
  $sheet.Dispose()
  $headingFont.Dispose()
  $nameFont.Dispose()
  $statusFont.Dispose()
  $whiteBrush.Dispose()
  $mutedBrush.Dispose()
}
