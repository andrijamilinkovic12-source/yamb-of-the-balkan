param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "Service account JSON file was not found: $Path"
    exit 1
}

$json = Get-Content -LiteralPath $Path -Raw

try {
    $null = $json | ConvertFrom-Json
} catch {
    Write-Error "The file is not valid JSON: $Path"
    exit 1
}

$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$base64 = [Convert]::ToBase64String($bytes)

Write-Output "FIREBASE_SERVICE_ACCOUNT_BASE64=$base64"
