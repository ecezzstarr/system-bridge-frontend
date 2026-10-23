#requires -Version 7.0
<#
WEAVE private PowerShell host sentinel.
Run separately on the self-host machine, never inside Next.js.
Fixed read-only operations only. Release Workshop retains deployment authority.
#>
[CmdletBinding()]
param([switch]$Once,[ValidateRange(15,300)][int]$IntervalSeconds=30)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$ApiEndpoint='http://127.0.0.1:3000/api/system/host-powershell'
$HealthEndpoint='http://127.0.0.1:3000/api/health'
$Token=[Environment]::GetEnvironmentVariable('WEAVE_HOST_CONTROL_TOKEN')
if ([string]::IsNullOrWhiteSpace($Token) -or $Token.Length -lt 32) {throw 'Missing WEAVE_HOST_CONTROL_TOKEN'}
$WorkerKey=[Environment]::GetEnvironmentVariable('WEAVE_HOST_WORKER_KEY')
if ([string]::IsNullOrWhiteSpace($WorkerKey)) {$WorkerKey='weave-pwsh-host'}
if ($WorkerKey -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]{2,119}$') {throw 'Invalid worker key'}

function Read-ContainerState([string]$Container) {
  try {
    # Fixed Docker arguments; no web-supplied commands or container identifiers.
    $status = & docker inspect --format '{{.State.Status}}' $Container 2>$null
    if ($LASTEXITCODE -ne 0) {return 'missing'}
    $value=[string]($status | Select-Object -First 1)
    if ($value -in @('running','exited','created','restarting','paused','dead')) {return $value}
    return 'unknown'
  } catch {return 'unavailable'}
}
function Read-DiskPercent {
  try {
    $lines=@(& df -P / 2>$null)
    if ($LASTEXITCODE -ne 0 -or $lines.Count -lt 2) {return -1}
    if ([string]$lines[-1] -match '(\d+)%\s+/$') {return [int]$Matches[1]}
  } catch {}
  return -1
}
function Read-Health {
  try {
    $response=Invoke-RestMethod -Method Get -Uri $HealthEndpoint -TimeoutSec 8
    if ($response.status -eq 'healthy') {return 'healthy'}
    return 'degraded'
  } catch {return 'offline'}
}
function Snapshot {
  $app=Read-ContainerState 'weave-app'
  $edge=Read-ContainerState 'weave-edge'
  $disk=Read-DiskPercent
  $health=Read-Health
  $docker=if ($app -eq 'unavailable' -or $edge -eq 'unavailable') {'unavailable'} else {'available'}
  return @{
    host='selfhost'
    docker=$docker
    weave=$app
    edge=$edge
    disk=$disk
    health=$health
    checkedAt=[DateTime]::UtcNow.ToString('o')
  }
}
do {
  try {
    $payload=@{workerKey=$WorkerKey;snapshot=(Snapshot)} | ConvertTo-Json -Depth 4 -Compress
    # Auth token and raw process output are never returned in snapshot.
    Invoke-RestMethod -Uri $ApiEndpoint -Method Post -ContentType 'application/json' -Headers @{Authorization="Bearer $Token"} -Body $payload -TimeoutSec 12 | Out-Null
    Write-Output 'WEAVE private PowerShell snapshot accepted.'
  } catch {
    Write-Warning 'WEAVE host report unavailable.'
  }
  if (-not $Once) {Start-Sleep -Seconds $IntervalSeconds}
} while (-not $Once)
