#requires -Version 5.1
<#
WEAVE laptop connection. Review before running on a company-owned Windows laptop.
Outbound HTTPS only. Fixed checks and optional Linux/Docker setup. No web shell.
Run with -Pair once; add -AllowSetup only to permit the two installation actions.
Keep this window running. Ctrl+C disconnects the running worker.
#>
[CmdletBinding()]
param([switch]$Pair,[switch]$AllowSetup,[switch]$Once,[switch]$Training)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'This worker is for a Windows laptop.'}
$Api='https://weavingsystem.online/api/system/laptop-worker'
$Root=Join-Path $env:LOCALAPPDATA 'Weave\LaptopWorker'
$CredentialFile=Join-Path $Root 'connection.xml'
$script:Token=''
$script:ConnectionLost=$false
$Wsl=Join-Path $env:WINDIR 'System32\wsl.exe'

function Send-Weave([hashtable]$Body){
 $headers=@{}
 if($script:Token){$headers.Authorization='Bearer '+$script:Token}
 $response=Invoke-RestMethod -Uri $Api -Method Post -ContentType 'application/json' -Headers $headers `
  -Body ($Body|ConvertTo-Json -Depth 5 -Compress) -MaximumRedirection 0 -TimeoutSec 20
 if(-not $response.success){throw 'Weave refused the laptop request.'}
 return $response
}
function Is-Administrator {
 $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
 return ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Protect-LocalDirectory {
 foreach($path in @((Split-Path -Parent $Root),$Root,$CredentialFile)){
  if(Test-Path -LiteralPath $path){
   if((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Connection paths must not be links or junctions.'}
  }
 }
 New-Item -ItemType Directory -Path $Root -Force|Out-Null
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
 $acl=[Security.AccessControl.DirectorySecurity]::new()
 $acl.SetOwner($sid)
 $acl.SetAccessRuleProtection($true,$false)
 foreach($principal in @($sid,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){
  $rule=[Security.AccessControl.FileSystemAccessRule]::new($principal,'FullControl','ContainerInherit, ObjectInherit','None','Allow')
  $acl.AddAccessRule($rule)
 }
 Set-Acl -LiteralPath $Root -AclObject $acl
}
function Read-Wsl([string]$FixedArguments){
 if(-not(Test-Path -LiteralPath $Wsl)){return @{ok=$false;text=''}}
 $start=[Diagnostics.ProcessStartInfo]::new()
 $start.FileName=$Wsl;$start.Arguments=$FixedArguments
 $start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 $process=[Diagnostics.Process]::new();$process.StartInfo=$start
 try{
  [void]$process.Start()
  $output=$process.StandardOutput.ReadToEndAsync();$errors=$process.StandardError.ReadToEndAsync()
  if(-not $process.WaitForExit(8000)){$process.Kill();return @{ok=$false;text=''}}
  return @{ok=($process.ExitCode -eq 0);text=($output.GetAwaiter().GetResult() -replace "`0",'')}
 }finally{$process.Dispose()}
}
function Laptop-Snapshot {
 $memory=0.0;$disk=0.0
 try{$memory=[math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize/1MB,1)}catch{}
 try{$drive=$env:SystemDrive.TrimEnd(':');$disk=[math]::Round((Get-PSDrive -Name $drive).Free/1GB,1)}catch{}
 $wslStatus=Read-Wsl '--status'
 $distros=Read-Wsl '--list --quiet'
 $ubuntu=$distros.ok -and [bool]($distros.text -split "`r?`n"|Where-Object {$_.Trim() -ceq 'Ubuntu'})
 $docker=$false;$compose=$false
 if($ubuntu){
  $docker=(Read-Wsl '--distribution Ubuntu --user root -- docker info --format {{.ServerVersion}}').ok
  $compose=(Read-Wsl '--distribution Ubuntu --user root -- docker compose version --short').ok
 }
 return @{windows=$true;logicalProcessors=[Environment]::ProcessorCount;memoryGiB=$memory;freeDiskGiB=$disk;
  wslInstalled=$wslStatus.ok;ubuntuInstalled=$ubuntu;dockerInstalled=$docker;composeInstalled=$compose;
  setupAllowed=[bool]$AllowSetup;administrator=(Is-Administrator)}
}
# This script is local and fixed. No server response supplies shell input,
# package names, filesystem paths, hostnames or executable arguments.
$DockerSetup=@'
set -eu
. /etc/os-release
[ "$ID" = ubuntu ]
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  exit 0
fi
if ! command -v docker >/dev/null 2>&1; then
  for package in docker.io docker-compose docker-compose-v2 podman-docker containerd runc; do
    if dpkg-query -W -f='${Status}' "$package" 2>/dev/null | grep -q 'install ok installed'; then
      echo 'Existing container packages require local operator review.' >&2
      exit 20
    fi
  done
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' \
    "$(dpkg --print-architecture)" "$VERSION_CODENAME" > /etc/apt/sources.list.d/docker.list
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
if [ -d /run/systemd/system ]; then
  systemctl enable --now docker
else
  service docker start
fi
docker info >/dev/null
docker compose version >/dev/null
'@
function Run-SetupProcess([string]$FixedArguments,[string]$InputScript=''){
 $start=[Diagnostics.ProcessStartInfo]::new()
 $start.FileName=$Wsl;$start.Arguments=$FixedArguments
 $start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true;$start.RedirectStandardInput=$true
 $process=[Diagnostics.Process]::new();$process.StartInfo=$start
 try{
  [void]$process.Start()
  # Consume both pipes so native installation cannot deadlock on output.
  $output=$process.StandardOutput.ReadToEndAsync();$errors=$process.StandardError.ReadToEndAsync()
  if($InputScript){$process.StandardInput.Write($InputScript.Replace("`r`n","`n"))}
  $process.StandardInput.Close()
  $deadline=[DateTime]::UtcNow.AddMinutes(20);$nextBeat=[DateTime]::UtcNow
  while(-not $process.WaitForExit(1000)){
   if([DateTime]::UtcNow -gt $deadline){$process.Kill();return -2}
   if([DateTime]::UtcNow -ge $nextBeat -and -not $script:ConnectionLost){
    try{[void](Send-Weave @{action='heartbeat'})}catch{$script:ConnectionLost=$true}
    $nextBeat=[DateTime]::UtcNow.AddSeconds(20)
   }
  }
  # Native command output stays local and is never sent to the website.
  [void]$output.GetAwaiter().GetResult();[void]$errors.GetAwaiter().GetResult()
  return $process.ExitCode
 }finally{$process.Dispose()}
}
function Run-Operation([string]$Operation){
 if($Operation -ceq 'inspect'){return @{status='succeeded';code='checked'}}
 if(-not $AllowSetup){return @{status='failed';code='local_setup_required'}}
 if($Operation -ceq 'install_linux'){
  if(-not(Is-Administrator)){return @{status='failed';code='local_admin_required'}}
  $exitCode=Run-SetupProcess '--install --distribution Ubuntu --no-launch'
  if($exitCode -eq 3010){return @{status='succeeded';code='restart_required'}}
  if($exitCode -eq 0){return @{status='succeeded';code='linux_installed'}}
 }elseif($Operation -ceq 'install_docker'){
  $exitCode=Run-SetupProcess '--distribution Ubuntu --user root -- bash -s' $DockerSetup
  if($exitCode -eq 0){return @{status='succeeded';code='docker_installed'}}
 }else{throw 'Unsupported local operation.'}
 if($exitCode -eq -2){return @{status='failed';code='operation_timeout'}}
 return @{status='failed';code='operation_failed'}
}

if($Pair){
 Write-Output 'Connect this Windows account to the Weave Administrations laptop workshop for 30 days.'
 Write-Output 'Scope: report capacity and runtime status; run checks. -AllowSetup additionally permits fixed Ubuntu and Docker installation.'
 Write-Output 'No remote command prompt, Windows firewall exception, production data copy, DNS change or automatic startup task is created.'
 if((Read-Host 'Type CONNECT to approve this local connection') -cne 'CONNECT'){throw 'Connection cancelled locally.'}
 $code=Read-Host 'Paste the one-time code from Weave' -AsSecureString
 $plainCode=[Net.NetworkCredential]::new('pairing',$code).Password.Trim()
 try{$paired=Send-Weave @{action='pair';code=$plainCode}}finally{$plainCode='';$code=$null}
 Protect-LocalDirectory
 $secureToken=ConvertTo-SecureString $paired.token -AsPlainText -Force
 [PSCredential]::new($paired.deviceId,$secureToken)|Export-Clixml -LiteralPath $CredentialFile
 $paired=$null;$secureToken=$null
 Write-Output 'Laptop paired. Its device credential is protected by this Windows account.'
}
if(-not(Test-Path -LiteralPath $CredentialFile)){throw 'Run once with -Pair and a fresh connection code from Weave.'}
$connection=Import-Clixml -LiteralPath $CredentialFile
if($connection -isnot [PSCredential]){throw 'Invalid local connection file.'}
$script:Token=$connection.GetNetworkCredential().Password
$connection=$null
if($Training){
 # Installation is local and separate. The web queue cannot choose this path,
 # Python arguments, dependencies or code. Credential never enters argv/env.
 $trainingRoot=Join-Path $Root 'Training'
 $python=Join-Path $trainingRoot 'venv\Scripts\python.exe'
 $adapter=Join-Path $trainingRoot 'engine\laptop_training.py'
 if(-not(Test-Path -LiteralPath $python) -or -not(Test-Path -LiteralPath $adapter)){throw 'Install the reviewed native training engine locally first.'}
 $start=[Diagnostics.ProcessStartInfo]::new()
 $start.FileName=$python
 $start.Arguments='"'+$adapter+'" --root "'+(Join-Path $trainingRoot 'data')+'"'
 $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true
 $process=[Diagnostics.Process]::new();$process.StartInfo=$start
 try{
  [void]$process.Start()
  $process.StandardInput.WriteLine($script:Token);$process.StandardInput.Close();$script:Token=''
  $process.WaitForExit()
  if($process.ExitCode -ne 0){throw 'Private training worker stopped. Inspect its local status.'}
 }finally{if(-not $process.HasExited){$process.Kill()};$process.Dispose();$script:Token=''}
 return
}
Write-Output 'Weave laptop worker is running. Keep this window open. Ctrl+C stops it.'
if($AllowSetup){Write-Output 'Linux and Docker setup permitted for this run.'}
try{
 do{
  try{
   $response=Send-Weave @{action='poll';snapshot=(Laptop-Snapshot)}
   if($response.job){
    $job=$response.job
    try{$outcome=Run-Operation $job.operation}catch{$outcome=@{status='failed';code='operation_failed'}}
    $receipt=@{action='result';jobId=$job.id;lease=$job.lease;status=$outcome.status;code=$outcome.code;snapshot=(Laptop-Snapshot)}
    $sent=$false
    for($attempt=0;$attempt -lt 3 -and -not $sent;$attempt++){
     try{[void](Send-Weave $receipt);$sent=$true}catch{Start-Sleep -Seconds 2}
    }
    if(-not $sent){throw 'Result not acknowledged. Review operation history before retrying setup.'}
    Write-Output ('Weave operation: '+$job.operation+' / '+$outcome.code)
   }
  }catch{
   Write-Warning 'Laptop exchange unavailable. Check the connection in Weave; no operation will be retried automatically.'
   break
  }
  if(-not $Once -and -not $script:ConnectionLost){Start-Sleep -Seconds 15}
 }while(-not $Once -and -not $script:ConnectionLost)
}finally{$script:Token=''}
