param(
  [Parameter(Mandatory = $true)][string]$Theme,
  [Parameter(Mandatory = $true)][string]$Manifest,
  [switch]$ReplaceDraft
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Color].Assembly.Location) -TypeDefinition @'
using System;
using System.Drawing;

public static class DucatAlphaCleanup {
  public static void KeepCentralComponent(Bitmap image) {
    int width = image.Width, height = image.Height, count = width * height;
    bool[] visited = new bool[count];
    int[] queue = new int[count];
    int head = 0, tail = 0;
    int center = (height / 2) * width + width / 2;
    if (image.GetPixel(width / 2, height / 2).A < 8) return;
    visited[center] = true;
    queue[tail++] = center;
    while (head < tail) {
      int index = queue[head++], x = index % width, y = index / width;
      if (x > 0) Visit(index - 1, x - 1, y, image, width, visited, queue, ref tail);
      if (x + 1 < width) Visit(index + 1, x + 1, y, image, width, visited, queue, ref tail);
      if (y > 0) Visit(index - width, x, y - 1, image, width, visited, queue, ref tail);
      if (y + 1 < height) Visit(index + width, x, y + 1, image, width, visited, queue, ref tail);
    }
    for (int y = 0; y < height; y++)
      for (int x = 0; x < width; x++)
        if (!visited[y * width + x] && image.GetPixel(x, y).A > 0)
          image.SetPixel(x, y, Color.Transparent);
  }
  private static void Visit(int index, int x, int y, Bitmap image, int width,
      bool[] visited, int[] queue, ref int tail) {
    if (!visited[index] && image.GetPixel(x, y).A >= 8) {
      visited[index] = true;
      queue[tail++] = index;
    }
  }
}
'@
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$entry = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
$sourceDir = Join-Path $repo "source-assets\theme-icon-packs\$Theme\ducat-v1"
$outputDir = Join-Path $repo "www\assets\theme-packs\$Theme\canonical\ducat"
New-Item -ItemType Directory -Path $sourceDir, $outputDir -Force | Out-Null

$variants = @(
  @{ name = 'angle-left'; source = $entry.sources.angleLeft; size = 512; scale = .86 },
  @{ name = 'angle-right'; source = $entry.sources.angleRight; size = 512; scale = .86 },
  @{ name = 'front'; source = $entry.sources.front; size = 512; scale = .86 },
  @{ name = 'inline'; source = $entry.sources.front; size = 192; scale = .86 },
  @{ name = 'particle'; source = $entry.sources.front; size = 128; scale = .74 }
)

foreach ($variant in $variants) {
  if (-not (Test-Path -LiteralPath $variant.source)) { throw "Missing generated source: $($variant.source)" }
  $masterName = if ($variant.name -in @('inline', 'particle')) { 'front' } else { $variant.name }
  $masterPath = Join-Path $sourceDir "ducat-$masterName-master-v1.png"
  if ($ReplaceDraft -or -not (Test-Path -LiteralPath $masterPath)) {
    Copy-Item -LiteralPath $variant.source -Destination $masterPath -Force
  }
  $target = Join-Path $outputDir "ducat-$($variant.name)-v1.png"
  if ((Test-Path -LiteralPath $target) -and -not $ReplaceDraft) { throw "Existing PNG: $target" }
  $original = [System.Drawing.Image]::FromFile($masterPath)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($variant.size, $variant.size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      # Imagegen sometimes leaves a few stray alpha pixels near the canvas edge.
      # All five delivery roles share the same safe content field.
      $safeInsetRatio = if ($variant.name -in @('front', 'inline', 'particle')) { .11 } else { .08 }
      $safeInset = [math]::Round($variant.size * $safeInsetRatio)
      $graphics.SetClip((New-Object System.Drawing.Rectangle($safeInset,$safeInset,($variant.size - 2 * $safeInset),($variant.size - 2 * $safeInset))))
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $drawSize = [math]::Round($variant.size * $variant.scale)
      $offset = [math]::Round(($variant.size - $drawSize) / 2)
      $graphics.DrawImage($original, (New-Object System.Drawing.Rectangle($offset,$offset,$drawSize,$drawSize)))
      $graphics.Dispose()
      $graphics = $null
      [DucatAlphaCleanup]::KeepCentralComponent($bitmap)
      $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      if ($graphics) { $graphics.Dispose() }
      $bitmap.Dispose()
    }
  } finally {
    $original.Dispose()
  }
}

Write-Output "Imported five five-dot ducat PNGs for $Theme."
