param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

$roles = @('ribbon', 'chip', 'lozenge')
$entries = @()
$themes = @(
    @{ Id = 'dark'; Target = 'www/assets/green-soft-clay/canonical/confetti-particles' },
    @{ Id = 'neon'; Target = 'www/assets/theme-packs/neon/canonical/confetti-particles' },
    @{ Id = 'light'; Target = 'www/assets/theme-packs/light/canonical/confetti-particles' },
    @{ Id = 'medium'; Target = 'www/assets/theme-packs/medium/canonical/confetti-particles' },
    @{ Id = 'winter'; Target = 'www/assets/theme-packs/winter/canonical/confetti-particles' },
    @{ Id = 'amethyst'; Target = 'www/assets/theme-packs/amethyst/canonical/confetti-particles' },
    @{ Id = 'easter'; Target = 'www/assets/theme-packs/easter/canonical/confetti-particles' },
    @{ Id = 'desert'; Target = 'www/assets/theme-packs/desert/canonical/confetti-particles' },
    @{ Id = 'moon'; Target = 'www/assets/theme-packs/moon/canonical/confetti-particles' },
    @{ Id = 'severna'; Target = 'www/assets/theme-packs/severna/canonical/confetti-particles' }
)

foreach ($theme in $themes) {
    $targetDir = Join-Path $RepoRoot $theme.Target
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    foreach ($role in $roles) {
        $sourcePath = Join-Path $RepoRoot "source-assets/theme-live-confetti-v1/$($theme.Id)/$role-master-v1.png"
        $targetPath = Join-Path $targetDir "$role-v1.png"
        $source = [System.Drawing.Bitmap]::new($sourcePath)
        try {
            $left = $source.Width; $top = $source.Height; $right = -1; $bottom = -1
            for ($y = 0; $y -lt $source.Height; $y++) {
                for ($x = 0; $x -lt $source.Width; $x++) {
                    if ($source.GetPixel($x, $y).A -ge 10) {
                        if ($x -lt $left) { $left = $x }
                        if ($x -gt $right) { $right = $x }
                        if ($y -lt $top) { $top = $y }
                        if ($y -gt $bottom) { $bottom = $y }
                    }
                }
            }
            if ($right -lt $left -or $bottom -lt $top) { throw "Empty particle: $sourcePath" }
            $cropWidth = $right - $left + 1
            $cropHeight = $bottom - $top + 1
            $scale = [Math]::Min(224.0 / $cropWidth, 224.0 / $cropHeight)
            $drawWidth = [Math]::Max(1, [int][Math]::Round($cropWidth * $scale))
            $drawHeight = [Math]::Max(1, [int][Math]::Round($cropHeight * $scale))
            $dest = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try {
                $graphics = [System.Drawing.Graphics]::FromImage($dest)
                try {
                    $graphics.Clear([System.Drawing.Color]::Transparent)
                    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
                    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                    $bounds = [System.Drawing.Rectangle]::new($left, $top, $cropWidth, $cropHeight)
                    $placement = [System.Drawing.Rectangle]::new([int]((256 - $drawWidth) / 2), [int]((256 - $drawHeight) / 2), $drawWidth, $drawHeight)
                    $graphics.DrawImage($source, $placement, $bounds, [System.Drawing.GraphicsUnit]::Pixel)
                } finally { $graphics.Dispose() }
                $dest.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
            } finally { $dest.Dispose() }
        } finally { $source.Dispose() }
        $entries += [ordered]@{
            theme = $theme.Id
            role = $role
            source = "source-assets/theme-live-confetti-v1/$($theme.Id)/$role-master-v1.png"
            sourceSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourcePath).Hash.ToLowerInvariant()
            production = "$($theme.Target)/$role-v1.png"
            productionSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $targetPath).Hash.ToLowerInvariant()
            dimensions = '256x256'
        }
        Write-Output $targetPath
    }
}

$manifest = [ordered]@{
    version = 1
    status = 'all-ten-themes-live'
    style = '3D Soft Neomorphism'
    roles = $roles
    assets = $entries
}
$manifestPath = Join-Path $RepoRoot 'source-assets/theme-live-confetti-v1/manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
