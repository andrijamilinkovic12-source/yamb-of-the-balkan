$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$themes = @('light','medium','winter','neon','amethyst','easter','desert','moon','severna')
$roles = @(
  @{ Source='active-master-v1.png'; Target='canonical/rewarded-video/rewarded-video-active-v1.png'; Size=256 },
  @{ Source='active-master-v1.png'; Target='canonical/rewarded-video/rewarded-video-active-inline-v1.png'; Size=128 },
  @{ Source='unavailable-master-v1.png'; Target='canonical/rewarded-video/rewarded-video-unavailable-v1.png'; Size=256 },
  @{ Source='unavailable-master-v1.png'; Target='canonical/rewarded-video/rewarded-video-unavailable-inline-v1.png'; Size=128 },
  @{ Source='one-coin-master-v1.png'; Target='daily/reward-video-v3.png'; Size=384 },
  @{ Source='one-coin-master-v1.png'; Target='treasury/reward-video-v3.png'; Size=256 },
  @{ Source='two-coins-master-v1.png'; Target='solo/finish-reward-video-v3.png'; Size=384 }
)

foreach ($theme in $themes) {
  $sourceDir = Join-Path $repo "source-assets/theme-icon-packs/$theme/rewarded-video-v1"
  $packDir = Join-Path $repo "www/assets/theme-packs/$theme"
  foreach ($role in $roles) {
    $sourceName = if ($theme -eq 'winter' -and $role.Source -eq 'two-coins-master-v1.png') { 'two-coins-master-v2.png' } else { $role.Source }
    $sourcePath = Join-Path $sourceDir $sourceName
    $targetPath = Join-Path $packDir $role.Target
    if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Missing source: $sourcePath" }
    if (Test-Path -LiteralPath $targetPath) { throw "Existing output: $targetPath" }
    New-Item -ItemType Directory -Path (Split-Path -Parent $targetPath) -Force | Out-Null
    $original = [System.Drawing.Bitmap]::new($sourcePath)
    try {
      $minX=$original.Width; $minY=$original.Height; $maxX=-1; $maxY=-1
      for ($y=0; $y -lt $original.Height; $y+=2) {
        for ($x=0; $x -lt $original.Width; $x+=2) {
          if ($original.GetPixel($x,$y).A -ge 32) {
            if ($x -lt $minX) { $minX=$x }; if ($x -gt $maxX) { $maxX=$x }
            if ($y -lt $minY) { $minY=$y }; if ($y -gt $maxY) { $maxY=$y }
          }
        }
      }
      if ($maxX -lt $minX -or $maxY -lt $minY) { throw "Empty image: $sourcePath" }
      $pad=[math]::Round([math]::Max($maxX-$minX,$maxY-$minY)*.035)
      $left=[math]::Max(0,$minX-$pad); $top=[math]::Max(0,$minY-$pad)
      $right=[math]::Min($original.Width,$maxX+$pad+2); $bottom=[math]::Min($original.Height,$maxY+$pad+2)
      $width=$right-$left; $height=$bottom-$top
      $size=[int]$role.Size
      $scale=($size*.88)/[math]::Max($width,$height)
      $drawW=[math]::Round($width*$scale); $drawH=[math]::Round($height*$scale)
      $bitmap=[System.Drawing.Bitmap]::new($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
        try {
          $graphics.Clear([System.Drawing.Color]::Transparent)
          $graphics.CompositingQuality=[System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $target=[System.Drawing.Rectangle]::new([math]::Round(($size-$drawW)/2),[math]::Round(($size-$drawH)/2),$drawW,$drawH)
          $source=[System.Drawing.Rectangle]::new($left,$top,$width,$height)
          $graphics.DrawImage($original,$target,$source,[System.Drawing.GraphicsUnit]::Pixel)
        } finally { $graphics.Dispose() }
        $bitmap.Save($targetPath,[System.Drawing.Imaging.ImageFormat]::Png)
      } finally { $bitmap.Dispose() }
    } finally { $original.Dispose() }
  }
  Write-Output "Imported seven rewarded-video PNGs for $theme"
}
