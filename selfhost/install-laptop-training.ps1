#requires -Version 5.1
<# Run locally from a reviewed CI-passed checkout. No Administrator required.
Python 3.12 must already be installed. No credential or remote shell is used. #>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Python)
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$root=Join-Path $env:LOCALAPPDATA 'Weave\LaptopWorker'
$target=Join-Path $root 'Training'
foreach($path in @((Split-Path -Parent $root),$root,$target)){
 if((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Private training paths must not be links.'}
}
if(Test-Path -LiteralPath $target){throw 'Training already exists. Review and back up the private installation before replacing it.'}
& $Python -c "import sys; assert sys.version_info[:2] == (3,12), 'Python 3.12 required'"
if($LASTEXITCODE -ne 0){throw 'Python version check failed.'}
$drive=Get-PSDrive -Name $env:SystemDrive.TrimEnd(':')
if($drive.Free -lt 5GB){throw 'At least 5 GiB free disk required.'}
New-Item -ItemType Directory -Path $root -Force|Out-Null
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=[Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false)
foreach($principal in @($sid,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){
 $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($principal,'FullControl','ContainerInherit, ObjectInherit','None','Allow'))
}
Set-Acl -LiteralPath $root -AclObject $acl
New-Item -ItemType Directory -Path $target|Out-Null
& $Python -m venv (Join-Path $target 'venv')
if($LASTEXITCODE -ne 0){throw 'Virtual environment creation failed.'}
$native=Join-Path $target 'venv\Scripts\python.exe'
& $native -m pip install --no-cache-dir --only-binary=:all: --index-url https://download.pytorch.org/whl/cpu 'torch==2.6.0'
if($LASTEXITCODE -ne 0){throw 'Bounded CPU dependency installation failed.'}
$engine=Join-Path $target 'engine'
New-Item -ItemType Directory -Path $engine|Out-Null
foreach($name in @('laptop_training.py','training_worker.py','flame_lm.py','evaluate.py','serve.py','institutional_seed.jsonl')){
 Copy-Item -LiteralPath (Join-Path $repo ('flame-model\'+$name)) -Destination (Join-Path $engine $name)
}
Write-Output 'Private native CPU training installed. Pair locally, then start weave-laptop-worker.ps1 -Training. No ports or startup task created.'
