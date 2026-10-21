$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$master = Join-Path $repo 'source-assets/theme-icon-packs/neon/main-rooms-v1/economy-master-v2.png'
$pack = Join-Path $repo 'www/assets/theme-packs/neon'
if (-not (Test-Path -LiteralPath $master)) { throw "Missing Neon economy master: $master" }

$image = [System.Drawing.Image]::FromFile($master)
try {
    foreach ($spec in @(
        @{ Size = 384; Relative = 'runtime/menu/ducats-undo-free-v3.png' },
        @{ Size = 512; Relative = 'ducats-undo-free-v3.png' }
    )) {
        $size = $spec.Size
        $target = Join-Path $pack $spec.Relative
        $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $drawSize = [int][math]::Round($size * .88)
            $inset = [int][math]::Round(($size - $drawSize) / 2)
            $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle($inset, $inset, $drawSize, $drawSize)))
            $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
        Write-Output "$($spec.Relative): $size x $size"
    }
} finally { $image.Dispose() }
