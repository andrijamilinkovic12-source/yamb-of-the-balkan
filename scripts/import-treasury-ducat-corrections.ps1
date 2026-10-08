$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$generatedRoot = Join-Path $env:USERPROFILE '.codex\generated_images\01a1116e-ca3a-72c0-864c-166cc3b5e76a'
$sources = [ordered]@{
    neon = 'exec-db26bcd7-2b6a-4113-9103-431607f349de.png'
    winter = 'exec-536f2f43-c965-43c5-a432-fcde6ad1e729.png'
    easter = 'exec-58b94dd6-6e85-4540-85a9-7b1612e75474.png'
    desert = 'exec-25179339-fbc3-48ae-b2f1-e16f66d5d734.png'
    moon = 'exec-7f706301-7320-4bf2-b793-5886100cabc4.png'
}

foreach ($entry in $sources.GetEnumerator()) {
    $theme = $entry.Key
    $generated = Join-Path $generatedRoot $entry.Value
    if (-not (Test-Path -LiteralPath $generated)) { throw "Missing generated image: $generated" }
    $sourceDir = Join-Path $repo "source-assets/theme-icon-packs/$theme/main-rooms-v1"
    $packDir = Join-Path $repo "www/assets/theme-packs/$theme"
    $master = Join-Path $sourceDir 'treasury-master-v2.png'
    Copy-Item -LiteralPath $generated -Destination $master -Force

    $image = [System.Drawing.Image]::FromFile($master)
    try {
        foreach ($spec in @(
            @{ Size = 384; Relative = 'runtime/menu/treasury-free-v3.png' },
            @{ Size = 512; Relative = 'treasury-free-v3.png' }
        )) {
            $size = $spec.Size
            $target = Join-Path $packDir $spec.Relative
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
    Write-Output "Updated $theme treasury menu and room PNGs"
}
