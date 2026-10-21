param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))

Add-Type -AssemblyName System.Drawing
$themes = @('dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna')
$roles = @('ribbon', 'chip', 'lozenge')
$canvas = [System.Drawing.Bitmap]::new(780, 1040)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$font = [System.Drawing.Font]::new('Arial', 14, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(38, 45, 54))
$background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(236, 239, 240))
$tile = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(221, 225, 228))
try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    for ($row = 0; $row -lt $themes.Count; $row++) {
        $theme = $themes[$row]
        $y = 12 + $row * 102
        $graphics.FillRectangle($background, 8, $y, 764, 96)
        $graphics.DrawString($theme, $font, $brush, 20, $y + 37)
        for ($column = 0; $column -lt $roles.Count; $column++) {
            $graphics.FillRectangle($tile, 184 + $column * 186, $y + 5, 174, 86)
            $root = if ($theme -eq 'dark') { 'www/assets/green-soft-clay' } else { "www/assets/theme-packs/$theme" }
            $path = Join-Path $RepoRoot "$root/canonical/confetti-particles/$($roles[$column])-v1.png"
            $sprite = [System.Drawing.Bitmap]::new($path)
            try { $graphics.DrawImage($sprite, 230 + $column * 186, $y + 7, 82, 82) }
            finally { $sprite.Dispose() }
        }
    }
    $canvas.Save((Join-Path $RepoRoot 'docs/theme-live-confetti-sprites-review.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    $tile.Dispose(); $background.Dispose(); $brush.Dispose(); $font.Dispose(); $graphics.Dispose(); $canvas.Dispose()
}
