param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z]+$')]
    [string]$Theme,
    [switch]$IncludeMedals,
    [string]$OnlyRole
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;

public static class TournamentIconAlphaCleanup {
    public static void Clean(Bitmap image) {
        int width = image.Width, height = image.Height, count = width * height;
        bool[] visible = new bool[count];
        int[] labels = new int[count];
        int[] queue = new int[count];
        int[] sizes = new int[count + 1];
        int labelCount = 0;
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                Color pixel = image.GetPixel(x, y);
                bool strayColor = (pixel.R > 240 && pixel.G < 110 && pixel.B < 110)
                    || (pixel.R > 245 && pixel.G > 200 && pixel.B < 85)
                    || (pixel.R > 250 && pixel.G > 250 && pixel.B > 250);
                int index = y * width + x;
                if (pixel.A < 16 || strayColor) image.SetPixel(x, y, Color.Transparent);
                else visible[index] = true;
            }
        }
        for (int start = 0; start < count; start++) {
            if (!visible[start] || labels[start] != 0) continue;
            int label = ++labelCount, head = 0, tail = 0;
            queue[tail++] = start;
            labels[start] = label;
            while (head < tail) {
                int item = queue[head++], x = item % width, y = item / width;
                for (int dy = -1; dy <= 1; dy++) {
                    for (int dx = -1; dx <= 1; dx++) {
                        if (dx == 0 && dy == 0) continue;
                        int nx = x + dx, ny = y + dy;
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                        int next = ny * width + nx;
                        if (visible[next] && labels[next] == 0) {
                            labels[next] = label;
                            queue[tail++] = next;
                        }
                    }
                }
            }
            sizes[label] = tail;
        }
        int largest = 0;
        for (int label = 1; label <= labelCount; label++)
            if (sizes[label] > sizes[largest]) largest = label;
        for (int index = 0; index < count; index++) {
            if (visible[index] && labels[index] != largest)
                image.SetPixel(index % width, index / width, Color.Transparent);
        }
    }
}
'@

$repo = Split-Path -Parent $PSScriptRoot
$masters = Join-Path $repo "source-assets\theme-icon-packs\$Theme\tournament-room-v1"
$outRoot = Join-Path $repo "www\assets\theme-packs\$Theme\canonical"
$roles = @(
    @{ Group = 'tournament-awards'; Role = 'finalist-silver' },
    @{ Group = 'tournament-navigation'; Role = 'tab-info' },
    @{ Group = 'tournament-navigation'; Role = 'tab-bracket' },
    @{ Group = 'tournament-navigation'; Role = 'tab-hall-of-fame' },
    @{ Group = 'tournament-states'; Role = 'state-register' },
    @{ Group = 'tournament-states'; Role = 'state-unregister' },
    @{ Group = 'tournament-states'; Role = 'state-registration-locked' },
    @{ Group = 'tournament-states'; Role = 'state-start' },
    @{ Group = 'tournament-states'; Role = 'state-match-active' },
    @{ Group = 'tournament-states'; Role = 'state-match-complete' }
)
if ($IncludeMedals) {
    $roles += @(
        @{ Group = 'competition-medals'; Role = 'tournament-gold' },
        @{ Group = 'competition-medals'; Role = 'tournament-silver' },
        @{ Group = 'competition-medals'; Role = 'tournament-bronze' }
    )
}
if ($OnlyRole) {
    $roles = @($roles | Where-Object Role -eq $OnlyRole)
    if ($roles.Count -ne 1) { throw "Unknown or ambiguous Tournament role: $OnlyRole" }
}

foreach ($item in $roles) {
    $sourcePath = Join-Path $masters "$($item.Role)-master-v1.png"
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Missing Tournament master: $sourcePath"
    }
    $destinationDir = Join-Path $outRoot $item.Group
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    $destinationPath = Join-Path $destinationDir "$($item.Role)-v1.png"

    $source = [System.Drawing.Bitmap]::new($sourcePath)
    $target = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 256, 256))
        }
        finally {
            $graphics.Dispose()
        }
        [TournamentIconAlphaCleanup]::Clean($target)
        $target.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $target.Dispose()
        $source.Dispose()
    }
    Write-Output $destinationPath
}
