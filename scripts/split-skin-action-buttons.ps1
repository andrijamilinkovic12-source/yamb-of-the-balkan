param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Get-LinearChannel([int]$channel) {
    $value = $channel / 255.0
    if ($value -le 0.04045) { return $value / 12.92 }
    return [Math]::Pow(($value + 0.055) / 1.055, 2.4)
}

function Get-Luminance([System.Drawing.Color]$color) {
    return (0.2126 * (Get-LinearChannel $color.R)) +
        (0.7152 * (Get-LinearChannel $color.G)) +
        (0.0722 * (Get-LinearChannel $color.B))
}

function Get-Contrast([double]$first, [double]$second) {
    return ([Math]::Max($first, $second) + 0.05) / ([Math]::Min($first, $second) + 0.05)
}

$diceManifestPath = Join-Path $ProjectRoot 'source-assets/dice-skins-v1/manifest.json'
$sourceFolder = Join-Path $ProjectRoot 'source-assets/skin-action-buttons-v1/masters'
$runtimeFolder = Join-Path $ProjectRoot 'www/assets/skin-action-buttons-v1'
$outputManifestPath = Join-Path $ProjectRoot 'source-assets/skin-action-buttons-v1/manifest.json'
$clientCatalogPath = Join-Path $ProjectRoot 'www/skin-action-buttons-data.js'
$diceManifest = Get-Content -LiteralPath $diceManifestPath -Raw | ConvertFrom-Json
$states = @('roll', 'announce', 'cancel')
$result = @()

foreach ($skin in $diceManifest.skins) {
    $id = [string]$skin.id
    $spritePath = Join-Path $sourceFolder "$id-master-v1.png"
    if (-not (Test-Path -LiteralPath $spritePath)) { continue }

    $sprite = [System.Drawing.Bitmap]::new($spritePath)
    try {
        $entry = [ordered]@{
            id = $id
            style = [string]$skin.style
            direction = [string]$skin.direction
            referenceDiceMaster = [string]$skin.master
            master = "source-assets/skin-action-buttons-v1/masters/$id-master-v1.png"
            states = [ordered]@{}
        }

        # Locate the three isolated silhouettes, including images whose rows
        # are not exactly aligned to one-third boundaries.
        $runs = @()
        $start = -1
        $centerX = [int][Math]::Floor($sprite.Width / 2)
        for ($y = 0; $y -lt $sprite.Height; $y++) {
            $visible = $sprite.GetPixel($centerX, $y).A -ge 64
            if ($visible -and $start -lt 0) { $start = $y }
            if ((-not $visible -or $y -eq ($sprite.Height - 1)) -and $start -ge 0) {
                $last = if ($visible) { $y } else { $y - 1 }
                if (($last - $start) -gt ($sprite.Height / 20)) {
                    $runs += [ordered]@{ top = $start; bottom = $last }
                }
                $start = -1
            }
        }
        if ($runs.Count -ne 3) { throw "$id has $($runs.Count) visible button rows; expected exactly 3." }

        for ($i = 0; $i -lt 3; $i++) {
            $state = $states[$i]
            $run = $runs[$i]
            $midY = [int][Math]::Floor(($run.top + $run.bottom) / 2)
            $left = 0
            while ($left -lt $sprite.Width -and $sprite.GetPixel($left, $midY).A -lt 64) { $left++ }
            $right = $sprite.Width - 1
            while ($right -ge 0 -and $sprite.GetPixel($right, $midY).A -lt 64) { $right-- }
            if ($left -ge $right) { throw "$id/$state has no visible width." }
            $padX = [int][Math]::Ceiling(($right - $left) * 0.025)
            $padY = [int][Math]::Ceiling(($run.bottom - $run.top) * 0.05)
            $x = [Math]::Max(0, $left - $padX)
            $y = [Math]::Max(0, $run.top - $padY)
            $endX = [Math]::Min($sprite.Width, $right + $padX + 1)
            $endY = [Math]::Min($sprite.Height, $run.bottom + $padY + 1)
            $crop = [System.Drawing.Rectangle]::new($x, $y, $endX - $x, $endY - $y)
            $slice = $sprite.Clone($crop, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try {
                $fileName = "$id-$state-v1.png"
                $target = Join-Path $runtimeFolder $fileName
                $runtime = [System.Drawing.Bitmap]::new(768, 240, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
                try {
                    $graphics = [System.Drawing.Graphics]::FromImage($runtime)
                    try {
                        $graphics.Clear([System.Drawing.Color]::Transparent)
                        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                        $graphics.DrawImage($slice, [System.Drawing.Rectangle]::new(0, 0, 768, 240))
                    }
                    finally { $graphics.Dispose() }
                    $runtime.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
                    if ($runtime.GetPixel(0, 0).A -gt 24 -or $runtime.GetPixel(767, 239).A -gt 24) {
                        throw "$id/$state has a non-transparent outer corner."
                    }
                    $darkLuminance = 0.0
                    $lightLuminance = 1.0
                    $darkMin = [double]::PositiveInfinity
                    $lightMin = [double]::PositiveInfinity
                    foreach ($xFraction in @(0.35, 0.5, 0.65)) {
                        foreach ($yFraction in @(0.43, 0.5, 0.57)) {
                            $pixel = $runtime.GetPixel([int]($runtime.Width * $xFraction), [int]($runtime.Height * $yFraction))
                            $surfaceLuminance = Get-Luminance $pixel
                            $darkMin = [Math]::Min($darkMin, (Get-Contrast $surfaceLuminance $darkLuminance))
                            $lightMin = [Math]::Min($lightMin, (Get-Contrast $surfaceLuminance $lightLuminance))
                        }
                    }
                    $ink = if ($darkMin -ge $lightMin) { '#000000' } else { '#ffffff' }
                }
                finally { $runtime.Dispose() }
                $entry.states[$state] = [ordered]@{
                    runtime = "www/assets/skin-action-buttons-v1/$fileName"
                    ink = $ink
                }
            }
            finally { $slice.Dispose() }
        }
        $result += $entry
    }
    finally { $sprite.Dispose() }
}

$manifest = [ordered]@{
    schemaVersion = 1
    scope = 'Three PNG action surfaces per dice skin: roll, announce, cancel. Button geometry and live text remain in HTML/CSS.'
    runtimeRenderSize = @(768, 240)
    stateOrder = $states
    skins = $result
}
$json = $manifest | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($outputManifestPath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
$client = [ordered]@{}
foreach ($entry in $result) {
    $client[$entry.id] = [ordered]@{}
    foreach ($state in $states) {
        $client[$entry.id][$state] = [ordered]@{
            src = $entry.states[$state].runtime.Substring(4)
            ink = $entry.states[$state].ink
        }
    }
}
$clientJson = $client | ConvertTo-Json -Depth 6 -Compress
[System.IO.File]::WriteAllText($clientCatalogPath, "window.SKIN_ACTION_BUTTONS = $clientJson;" + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
Write-Output "Exported $($result.Count) skin sets ($($result.Count * 3) PNG state files)."
