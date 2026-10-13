param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$dice = Get-Content -LiteralPath (Join-Path $ProjectRoot 'source-assets/dice-skins-v1/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$buttons = Get-Content -LiteralPath (Join-Path $ProjectRoot 'source-assets/skin-action-buttons-v1/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$masterDir = Join-Path $ProjectRoot 'source-assets/skin-roll-counter-v1/masters'
$runtimeDir = Join-Path $ProjectRoot 'www/assets/skin-roll-counter-v1'
$manifestPath = Join-Path $ProjectRoot 'source-assets/skin-roll-counter-v1/manifest.json'
$catalogPath = Join-Path $ProjectRoot 'www/skin-roll-counter-data.js'

function Blend-Color([System.Drawing.Color]$first, [System.Drawing.Color]$second, [double]$secondWeight) {
    $firstWeight = 1 - $secondWeight
    return [System.Drawing.Color]::FromArgb(
        [int][Math]::Round($first.R * $firstWeight + $second.R * $secondWeight),
        [int][Math]::Round($first.G * $firstWeight + $second.G * $secondWeight),
        [int][Math]::Round($first.B * $firstWeight + $second.B * $secondWeight))
}

function Color-Hex([System.Drawing.Color]$color) {
    return '#{0:X2}{1:X2}{2:X2}' -f $color.R, $color.G, $color.B
}

function Get-Luminance([System.Drawing.Color]$color) {
    $linear = @()
    foreach ($channel in @($color.R, $color.G, $color.B)) {
        $unit = [double]$channel / 255
        $linear += if ($unit -le 0.04045) { $unit / 12.92 } else { [Math]::Pow(($unit + 0.055) / 1.055, 2.4) }
    }
    return 0.2126 * $linear[0] + 0.7152 * $linear[1] + 0.0722 * $linear[2]
}

function Get-Contrast([System.Drawing.Color]$first, [System.Drawing.Color]$second) {
    $a = Get-Luminance $first
    $b = Get-Luminance $second
    return ([Math]::Max($a, $b) + 0.05) / ([Math]::Min($a, $b) + 0.05)
}

function Get-AlphaBounds([System.Drawing.Bitmap]$image) {
    $left = $image.Width; $right = -1; $top = $image.Height; $bottom = -1
    for ($y = 0; $y -lt $image.Height; $y += 4) {
        for ($x = 0; $x -lt $image.Width; $x += 4) {
            if ($image.GetPixel($x, $y).A -lt 64) { continue }
            $left = [Math]::Min($left, $x); $right = [Math]::Max($right, $x)
            $top = [Math]::Min($top, $y); $bottom = [Math]::Max($bottom, $y)
        }
    }
    if ($right -le $left -or $bottom -le $top) { throw 'Master has no isolated alpha silhouette.' }
    $size = [int][Math]::Ceiling([Math]::Max($right - $left, $bottom - $top) * 1.04)
    $cx = ($left + $right) / 2; $cy = ($top + $bottom) / 2
    $x = [int][Math]::Max(0, [Math]::Floor($cx - $size / 2))
    $y = [int][Math]::Max(0, [Math]::Floor($cy - $size / 2))
    $size = [int][Math]::Min($size, [Math]::Min($image.Width - $x, $image.Height - $y))
    return [System.Drawing.Rectangle]::new($x, $y, $size, $size)
}

function Get-TextColor([System.Drawing.Bitmap]$image) {
    $color = $image.GetPixel([int]($image.Width / 2), [int]($image.Height / 2))
    if ((Get-Contrast $color ([System.Drawing.Color]::Black)) -gt (Get-Contrast $color ([System.Drawing.Color]::White))) { return '#000000' }
    return '#FFFFFF'
}

$sets = @()
foreach ($skin in $dice.skins) {
    $id = [string]$skin.id
    $masterPath = Join-Path $masterDir "$id-master-v1.png"
    if (-not (Test-Path -LiteralPath $masterPath)) { throw "Missing circular master for skin $id" }
    $button = $buttons.skins | Where-Object { $_.id -eq $id } | Select-Object -First 1
    if (-not $button) { throw "Missing action button set for skin $id" }
    $source = [System.Drawing.Bitmap]::new($masterPath)
    try {
        $sourceRect = Get-AlphaBounds $source
        $ink = Get-TextColor $source
        $centerColor = $source.GetPixel([int]($source.Width / 2), [int]($source.Height / 2))
        $fillColor = [System.Drawing.ColorTranslator]::FromHtml([string]$skin.pipColor)
        if ((Get-Contrast $centerColor $fillColor) -lt 3.0) {
            $fillColor = [System.Drawing.ColorTranslator]::FromHtml($ink)
        }
        $trackColor = Blend-Color $centerColor $fillColor 0.25
        $entry = [ordered]@{
            skinId = $id
            style = '3D Soft Neomorphism'
            direction = [string]$skin.direction
            diceFace = [string]$skin.runtime
            actionButton = [string]$button.states.announce.runtime
            master = "source-assets/skin-roll-counter-v1/masters/$id-master-v1.png"
            progressColor = Color-Hex $fillColor
            trackColor = Color-Hex $trackColor
            states = [ordered]@{}
        }

        for ($count = 0; $count -le 3; $count++) {
            $output = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try {
                $graphics = [System.Drawing.Graphics]::FromImage($output)
                try {
                    $graphics.Clear([System.Drawing.Color]::Transparent)
                    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
                    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
                    $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(4, 4, 248, 248), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)

                    $trackPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, $trackColor), 18)
                    $fillPen = [System.Drawing.Pen]::new($fillColor, 18)
                    try {
                        $trackPen.StartCap = $trackPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Flat
                        $fillPen.StartCap = $fillPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Flat
                        $arc = [System.Drawing.Rectangle]::new(22, 22, 212, 212)
                        for ($segment = 0; $segment -lt 3; $segment++) {
                            $start = -84 + 120 * $segment
                            $graphics.DrawArc($trackPen, $arc, $start, 108)
                            if ($segment -lt $count) { $graphics.DrawArc($fillPen, $arc, $start, 108) }
                        }
                    }
                    finally { $trackPen.Dispose(); $fillPen.Dispose() }

                    if ($count -gt 0) {
                        $font = [System.Drawing.Font]::new('Arial', 83, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
                        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($ink))
                        $format = [System.Drawing.StringFormat]::new()
                        try {
                            $format.Alignment = [System.Drawing.StringAlignment]::Center
                            $format.LineAlignment = [System.Drawing.StringAlignment]::Center
                            $graphics.DrawString("$count/3", $font, $brush, [System.Drawing.RectangleF]::new(37, 68, 182, 120), $format)
                        }
                        finally { $format.Dispose(); $brush.Dispose(); $font.Dispose() }
                    }
                }
                finally { $graphics.Dispose() }

                $fileName = "$id-$count-v1.png"
                $target = Join-Path $runtimeDir $fileName
                $output.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
                if ($output.GetPixel(0, 0).A -gt 24) { throw "$id/$count PNG corner is not transparent" }
                $entry.states[[string]$count] = "www/assets/skin-roll-counter-v1/$fileName"
            }
            finally { $output.Dispose() }
        }
        $sets += $entry
    }
    finally { $source.Dispose() }
}

$manifest = [ordered]@{
    schemaVersion = 1
    scope = 'One unique circular counter master per dice skin; four exact PNG progress states per skin. 0 is an empty three-part ring.'
    runtimeRenderSize = @(256, 256)
    skins = $sets
}
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 8) + [Environment]::NewLine, $utf8)
$catalog = [ordered]@{}
foreach ($entry in $sets) {
    $catalog[$entry.skinId] = [ordered]@{}
    for ($count = 0; $count -le 3; $count++) {
        $catalog[$entry.skinId][[string]$count] = $entry.states[[string]$count].Substring(4)
    }
}
[System.IO.File]::WriteAllText($catalogPath, 'window.SKIN_ROLL_COUNTER = ' + ($catalog | ConvertTo-Json -Depth 5 -Compress) + ';' + [Environment]::NewLine, $utf8)
Write-Output "Exported $($sets.Count) skin counter sets ($($sets.Count * 4) PNG states)."
