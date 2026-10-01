param(
    [string[]] $Ids = @('wedding', 'thunder', 'fireworks', 'bubbles', 'cosmic-dust', 'dragon-fire', 'royal-yamb', 'fireflies', 'ice-age', 'black-hole', 'supernova', 'neon-pulse', 'drones', 'ufo-abduction')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$masters = Join-Path $projectRoot 'source-assets/green-soft-clay-canonical/treasury-effect-previews'
$runtime = Join-Path $projectRoot 'www/assets/green-soft-clay/canonical/treasury-effect-previews'
$allowedIds = @('wedding', 'thunder', 'fireworks', 'bubbles', 'cosmic-dust', 'dragon-fire', 'royal-yamb', 'fireflies', 'ice-age', 'black-hole', 'supernova', 'neon-pulse', 'drones', 'ufo-abduction')

foreach ($id in $Ids) {
    if ($id -notin $allowedIds) { throw "Unknown effect preview ID: $id" }
    $sourcePath = Join-Path $masters "preview-$id-master-v1.png"
    $targetPath = Join-Path $runtime "preview-$id-v1.png"
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw "Missing master: $sourcePath" }
    if (Test-Path -LiteralPath $targetPath) { throw "Refusing to overwrite: $targetPath" }

    $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
    $target = $null
    $graphics = $null
    try {
        if ($source.Width -ne 1536 -or $source.Height -ne 1024) { throw "Unexpected master size: $sourcePath" }
        if ($source.GetPixel(0, 0).A -ne 0) { throw "Master is not transparent: $sourcePath" }

        $target = [System.Drawing.Bitmap]::new(384, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 384, 256))
        $graphics.Dispose()
        $graphics = $null
        $target.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
        if ($target.GetPixel(0, 0).A -ne 0) { throw "Runtime alpha was lost: $targetPath" }
    } finally {
        if ($graphics) { $graphics.Dispose() }
        if ($target) { $target.Dispose() }
        $source.Dispose()
    }
}
