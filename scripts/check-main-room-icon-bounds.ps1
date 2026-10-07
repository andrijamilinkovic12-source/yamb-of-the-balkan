param([Parameter(Mandatory = $true)][string]$Theme)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$roles = @('solo','hotseat','online-random','invite-friend','daily','global-chat','leaderboard','online-players','quarterly-league','rules','settings','statistics')
$bad = @()
foreach ($role in $roles) {
  $path = Join-Path $repo "www\assets\theme-packs\$Theme\canonical\$role-room-identity\$role-room-menu-v1.png"
  $image = New-Object System.Drawing.Bitmap($path)
  try {
    if ($image.Width -ne 384 -or $image.Height -ne 384) { throw "Wrong dimensions: $path" }
    $minX = 384; $minY = 384; $maxX = -1; $maxY = -1
    for ($y = 0; $y -lt 384; $y++) {
      for ($x = 0; $x -lt 384; $x++) {
        if ($image.GetPixel($x, $y).A -ge 16) {
          if ($x -lt $minX) { $minX = $x }
          if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }
          if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }
    if ($maxX -lt 0) { throw "Fully transparent: $path" }
    $spanX = ($maxX - $minX + 1) / 384
    $spanY = ($maxY - $minY + 1) / 384
    $largestSpan = [math]::Max($spanX, $spanY)
    $smallestSpan = [math]::Min($spanX, $spanY)
    $minimumMinorAxis = if ($role -eq 'leaderboard') { .50 } else { .55 }
    $status = if ($largestSpan -lt .84 -or $largestSpan -gt .89 -or $smallestSpan -lt $minimumMinorAxis) { 'REVIEW' } else { 'OK' }
    if ($status -eq 'REVIEW') { $bad += $role }
    '{0,-17} {1,6:P1} × {2,6:P1}  [{3},{4}–{5},{6}]  {7}' -f $role,$spanX,$spanY,$minX,$minY,$maxX,$maxY,$status
  } finally { $image.Dispose() }
}
if ($bad.Count) { throw "Review optical occupancy for: $($bad -join ', ')" }
