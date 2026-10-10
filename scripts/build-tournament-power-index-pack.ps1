param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna')]
    [string]$Theme
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repo = Split-Path -Parent $PSScriptRoot
$master = Join-Path $repo "source-assets\theme-icon-packs\$Theme\tournament-room-v1\power-index-master-v1.png"
$outputDir = Join-Path $repo "www\assets\theme-packs\$Theme\canonical\statistics-overview"
$output = Join-Path $outputDir 'power-index-v1.png'
if (-not (Test-Path -LiteralPath $master)) { throw "Missing power-index master: $master" }
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$source = [System.Drawing.Bitmap]::new($master)
$target = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
try {
    $left = $source.Width
    $top = $source.Height
    $right = -1
    $bottom = -1
    for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
            if ($source.GetPixel($x, $y).A -le 64) { continue }
            if ($x -lt $left) { $left = $x }
            if ($x -gt $right) { $right = $x }
            if ($y -lt $top) { $top = $y }
            if ($y -gt $bottom) { $bottom = $y }
        }
    }
    if ($right -lt $left -or $bottom -lt $top) { throw "Empty power-index master: $master" }

    $sourceWidth = $right - $left + 1
    $sourceHeight = $bottom - $top + 1
    $scale = [Math]::Min(232.0 / $sourceWidth, 232.0 / $sourceHeight)
    $drawWidth = [int][Math]::Round($sourceWidth * $scale)
    $drawHeight = [int][Math]::Round($sourceHeight * $scale)
    $drawLeft = [int][Math]::Floor((256 - $drawWidth) / 2)
    $drawTop = [int][Math]::Floor((256 - $drawHeight) / 2)
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage(
            $source,
            [System.Drawing.Rectangle]::new($drawLeft, $drawTop, $drawWidth, $drawHeight),
            [System.Drawing.Rectangle]::new($left, $top, $sourceWidth, $sourceHeight),
            [System.Drawing.GraphicsUnit]::Pixel
        )
    }
    finally { $graphics.Dispose() }
    $target.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
    $target.Dispose()
    $source.Dispose()
}
Write-Output $output
