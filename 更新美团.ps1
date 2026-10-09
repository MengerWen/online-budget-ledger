param([string]$DatingRoot = (Join-Path (Split-Path -Parent $PSScriptRoot) 'Dating'), [string]$Folder, [switch]$SkipCapture)
$ErrorActionPreference = 'Stop'
$entry = Join-Path $DatingRoot '采集美团账单.ps1'
if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) {
    throw '未找到 Dating 的美团采集入口，请用 -DatingRoot 指定 Dating 项目目录。'
}
$forward = @{}
if ($Folder) { $forward.Folder = $Folder }
if ($SkipCapture) { $forward.SkipCapture = $true }
& $entry @forward
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
