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
public static class UndoTokenAlphaCleanup {
  public static void RemoveLightGeneratorDebris(Bitmap image) {
    for(int y=0;y<image.Height;y++) for(int x=0;x<image.Width;x++) {
      Color c=image.GetPixel(x,y);
      bool saturatedRed=c.R>145 && c.R>c.G*1.55 && c.B<75;
      bool saturatedYellow=c.R>210 && c.G>175 && c.B<45;
      if(c.A>0 && (saturatedRed || saturatedYellow)) image.SetPixel(x,y,Color.Transparent);
    }
  }
  public static void KeepCentralComponent(Bitmap image) {
    int w = image.Width, h = image.Height;
    bool[] kept = new bool[w*h];
    int[] queue = new int[w*h];
    int head=0, tail=0, center=(h/2)*w+w/2;
    if (image.GetPixel(w/2,h/2).A < 8) return;
    kept[center]=true; queue[tail++]=center;
    while(head<tail) {
      int p=queue[head++], x=p%w, y=p/w;
      if(x>0) Visit(p-1,image,kept,queue,ref tail,w);
      if(x+1<w) Visit(p+1,image,kept,queue,ref tail,w);
      if(y>0) Visit(p-w,image,kept,queue,ref tail,w);
      if(y+1<h) Visit(p+w,image,kept,queue,ref tail,w);
    }
    for(int y=0;y<h;y++) for(int x=0;x<w;x++)
      if(!kept[y*w+x] && image.GetPixel(x,y).A>0) image.SetPixel(x,y,Color.Transparent);
  }
  private static void Visit(int p, Bitmap image, bool[] kept, int[] queue, ref int tail, int w) {
    if(!kept[p] && image.GetPixel(p%w,p/w).A>=8) { kept[p]=true; queue[tail++]=p; }
  }
}
'@
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$entry = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
if ($entry.themeId -ne $Theme) { throw 'Manifest theme mismatch' }
if (-not (Test-Path -LiteralPath $entry.source)) { throw "Missing source: $($entry.source)" }
$sourceDir = Join-Path $repo "source-assets\theme-icon-packs\$Theme\undo-token-v1"
$outputDir = Join-Path $repo "www\assets\theme-packs\$Theme\canonical\undo-token"
New-Item -ItemType Directory -Path $sourceDir, $outputDir -Force | Out-Null
$masterPath = Join-Path $sourceDir 'undo-token-front-master-v1.png'
if ($ReplaceDraft -or -not (Test-Path -LiteralPath $masterPath)) {
  Copy-Item -LiteralPath $entry.source -Destination $masterPath -Force
}
foreach ($variant in @(@('front',512),@('inline',192))) {
  $name = $variant[0]; $size = [int]$variant[1]
  $target = Join-Path $outputDir "undo-token-$name-v1.png"
  if ((Test-Path -LiteralPath $target) -and -not $ReplaceDraft) { throw "Existing PNG: $target" }
  $original = [System.Drawing.Image]::FromFile($masterPath)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      # The Light Gold master has disconnected generator debris close to the
      # canvas edge; its safe content rectangle keeps the complete tile.
      if ($Theme -eq 'light') {
        $left = [math]::Round($size * .13)
        $top = [math]::Round($size * .113)
        $right = [math]::Round($size * .875)
        $bottom = [math]::Round($size * .885)
        $graphics.SetClip((New-Object System.Drawing.Rectangle($left,$top,($right-$left),($bottom-$top))))
      }
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $drawSize = [math]::Round($size * .86)
      $offset = [math]::Round(($size-$drawSize)/2)
      $graphics.DrawImage($original,(New-Object System.Drawing.Rectangle($offset,$offset,$drawSize,$drawSize)))
      $graphics.Dispose(); $graphics=$null
      [UndoTokenAlphaCleanup]::KeepCentralComponent($bitmap)
      if ($Theme -eq 'light') { [UndoTokenAlphaCleanup]::RemoveLightGeneratorDebris($bitmap) }
      $bitmap.Save($target,[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { if($graphics){$graphics.Dispose()}; $bitmap.Dispose() }
  } finally { $original.Dispose() }
}
Write-Output "Imported undo-token front and inline for $Theme."
