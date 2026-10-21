param([switch]$Check)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$themes = @(
    @{ id = 'easter'; coins = @(@(35, 12, 106, -12), @(170, 15, 96, 15), @(93, 132, 99, 10), @(270, 105, 94, -17)) },
    @{ id = 'desert'; coins = @(@(36, 20, 108, -17), @(166, 4, 112, 13), @(122, 122, 108, 15), @(271, 129, 92, -13)) },
    @{ id = 'severna'; coins = @(@(43, 16, 105, -12), @(169, 9, 114, 13), @(108, 130, 107, -9), @(279, 117, 92, 18)) }
)

function Render-Preview($theme, $masterPath, $coinPath) {
    $bitmap = New-Object System.Drawing.Bitmap(768, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $coin = [System.Drawing.Image]::FromFile($coinPath)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.ScaleTransform(2, 2)
        # Staggered sizes and heights suggest falling while preserving the exact canonical coin artwork.
        foreach ($placement in $theme.coins) {
            $x = [float]$placement[0]; $y = [float]$placement[1]
            $size = [float]$placement[2]; $angle = [float]$placement[3]
            $state = $g.Save()
            $g.TranslateTransform($x + $size / 2, $y + $size / 2)
            $g.RotateTransform($angle)
            $destination = [System.Drawing.RectangleF]::new([float](-$size / 2), [float](-$size / 2), $size, $size)
            $g.DrawImage($coin, $destination)
            $g.Restore($state)
        }
        $bitmap.Save($masterPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $g.Dispose(); $coin.Dispose(); $bitmap.Dispose()
    }
}

function Resize-Png($sourcePath, $outputPath, $width, $height) {
    $source = [System.Drawing.Image]::FromFile($sourcePath)
    $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($source, (New-Object System.Drawing.Rectangle(0, 0, $width, $height)))
        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $g.Dispose(); $bitmap.Dispose(); $source.Dispose()
    }
}

$entries = @()
foreach ($theme in $themes) {
    $sourceDir = Join-Path $repo "source-assets/theme-gold-rain-canonical-v2/$($theme.id)"
    $productionDir = Join-Path $repo "www/assets/theme-packs/$($theme.id)/canonical"
    $master = Join-Path $sourceDir 'preview-gold-rain-master-v2.png'
    $preview = Join-Path $productionDir 'treasury-effect-previews/preview-gold-rain-v2.png'
    $thumbnail = Join-Path $productionDir 'treasury-effect-thumbnails/preview-gold-rain-v2.png'
    $coin = Join-Path $productionDir 'ducat/ducat-front-v2.png'
    if (-not (Test-Path -LiteralPath $coin)) { throw "Missing canonical ducat: $coin" }
    if (-not $Check) {
        New-Item -ItemType Directory -Path $sourceDir -Force | Out-Null
        Render-Preview $theme $master $coin
        Resize-Png $master $preview 384 256
        Resize-Png $master $thumbnail 192 128
    }
    foreach ($path in @($master, $preview, $thumbnail)) {
        if (-not (Test-Path -LiteralPath $path)) { throw "Missing Gold Rain PNG: $path" }
    }
    $entries += [ordered]@{
        id = $theme.id
        canonicalCoin = (Resolve-Path -LiteralPath $coin -Relative).TrimStart('.','\','/') -replace '\\','/'
        canonicalCoinSha256 = (Get-FileHash -LiteralPath $coin -Algorithm SHA256).Hash.ToLowerInvariant()
        master = (Resolve-Path -LiteralPath $master -Relative).TrimStart('.','\','/') -replace '\\','/'
        masterSha256 = (Get-FileHash -LiteralPath $master -Algorithm SHA256).Hash.ToLowerInvariant()
        preview = (Resolve-Path -LiteralPath $preview -Relative).TrimStart('.','\','/') -replace '\\','/'
        thumbnail = (Resolve-Path -LiteralPath $thumbnail -Relative).TrimStart('.','\','/') -replace '\\','/'
        previewSha256 = (Get-FileHash -LiteralPath $preview -Algorithm SHA256).Hash.ToLowerInvariant()
        thumbnailSha256 = (Get-FileHash -LiteralPath $thumbnail -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
$manifestPath = Join-Path $repo 'source-assets/theme-gold-rain-canonical-v2/manifest.json'
$manifest = [ordered]@{
    schemaVersion = 1
    method = 'Deterministic composition using each theme canonical ducat-front-v2 PNG; technical resize only'
    masterSize = @(768, 512)
    previewSize = @(384, 256)
    thumbnailSize = @(192, 128)
    themes = $entries
} | ConvertTo-Json -Depth 6
if ($Check) {
    if (-not (Test-Path -LiteralPath $manifestPath) -or (Get-Content -LiteralPath $manifestPath -Raw).Trim() -ne $manifest.Trim()) {
        throw 'Gold Rain manifest or PNG hashes are stale'
    }
    Write-Output 'PASS: three canonical Gold Rain previews and thumbnails'
} else {
    [System.IO.File]::WriteAllText($manifestPath, $manifest + "`n", (New-Object System.Text.UTF8Encoding($false)))
    Write-Output 'WROTE: three canonical Gold Rain previews and thumbnails'
}
