$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repo = Split-Path -Parent $PSScriptRoot
$themes = @(
    @{ Id = 'light'; Name = 'Svetlo Zlato' },
    @{ Id = 'medium'; Name = 'Trula Višnja' },
    @{ Id = 'winter'; Name = 'Plavi Okean' },
    @{ Id = 'neon'; Name = 'Neon Cyber' },
    @{ Id = 'amethyst'; Name = 'Kraljevski Ametist' },
    @{ Id = 'easter'; Name = 'Vaskršnja' },
    @{ Id = 'desert'; Name = 'Pustinjsko Staklo' },
    @{ Id = 'moon'; Name = 'Mesečev Sjaj' },
    @{ Id = 'severna'; Name = 'Severna Maglina' }
)
$output = Join-Path $repo 'docs\theme-tournament-final-qa.png'
$sheet = [System.Drawing.Bitmap]::new(960, 1310, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
$font = [System.Drawing.Font]::new('Arial', 16, [System.Drawing.FontStyle]::Bold)
$smallFont = [System.Drawing.Font]::new('Arial', 12)
$ink = [System.Drawing.Brushes]::Black
try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(240, 237, 229))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawString('TURNIR — pregled ikona snage, pehara i medalja', $font, $ink, 18, 12)
    $graphics.DrawString('Indeks snage: 12 / 24 / 64 px', $smallFont, $ink, 185, 48)
    $graphics.DrawString('Pehar', $smallFont, $ink, 425, 48)
    $graphics.DrawString('Zlato', $smallFont, $ink, 565, 48)
    $graphics.DrawString('Srebro', $smallFont, $ink, 685, 48)
    $graphics.DrawString('Bronza', $smallFont, $ink, 810, 48)

    for ($i = 0; $i -lt $themes.Count; $i++) {
        $theme = $themes[$i]
        $y = 76 + 136 * $i
        $background = if ($i % 2 -eq 0) { [System.Drawing.Color]::FromArgb(255, 250, 241) } else { [System.Drawing.Color]::FromArgb(227, 231, 232) }
        $graphics.FillRectangle([System.Drawing.SolidBrush]::new($background), 12, $y, 936, 130)
        $graphics.DrawString($theme.Name, $smallFont, $ink, 18, $y + 51)
        $graphics.FillRectangle([System.Drawing.Brushes]::DarkSlateGray, 180, $y + 15, 168, 100)
        $base = Join-Path $repo "www\assets\theme-packs\$($theme.Id)\canonical"
        $power = [System.Drawing.Image]::FromFile((Join-Path $base 'statistics-overview\power-index-v1.png'))
        try {
            $graphics.DrawImage($power, 193, $y + 58, 12, 12)
            $graphics.DrawImage($power, 226, $y + 52, 24, 24)
            $graphics.DrawImage($power, 270, $y + 33, 64, 64)
        }
        finally { $power.Dispose() }
        $assets = @(
            @{ Name = 'tournament-awards\champion-trophy-v1.png'; X = 400 },
            @{ Name = 'competition-medals\tournament-gold-v1.png'; X = 540 },
            @{ Name = 'competition-medals\tournament-silver-v1.png'; X = 665 },
            @{ Name = 'competition-medals\tournament-bronze-v1.png'; X = 790 }
        )
        foreach ($item in $assets) {
            $asset = [System.Drawing.Image]::FromFile((Join-Path $base $item.Name))
            try { $graphics.DrawImage($asset, $item.X, $y + 15, 104, 104) }
            finally { $asset.Dispose() }
        }
    }
    $sheet.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
    $font.Dispose()
    $smallFont.Dispose()
    $graphics.Dispose()
    $sheet.Dispose()
}
Write-Output $output
