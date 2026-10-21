$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$themes = @('easter', 'desert', 'severna')

foreach ($theme in $themes) {
    $master = Join-Path $repo "source-assets/theme-icon-packs/$theme/main-rooms-v1/treasury-master-v3.png"
    if (-not (Test-Path -LiteralPath $master)) { throw "Missing master: $master" }
    $pack = Join-Path $repo "www/assets/theme-packs/$theme"
    $image = [System.Drawing.Image]::FromFile($master)
    try {
        foreach ($spec in @(
            @{ Size = 384; Relative = 'runtime/menu/treasury-free-v3.png' },
            @{ Size = 512; Relative = 'treasury-free-v3.png' }
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
        }
    } finally { $image.Dispose() }
    Write-Output "Built $theme treasury PNGs from v3 master"
}
