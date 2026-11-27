$ErrorActionPreference='Stop'
$source=Join-Path $PSScriptRoot '../public/host/weave-laptop-worker.ps1'
$tokens=$null;$parseErrors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$parseErrors)
if($parseErrors.Count){throw ($parseErrors.Message -join '; ')}
$commands=$ast.FindAll({param($node) $node -is [System.Management.Automation.Language.CommandAst]},$true)
foreach($command in $commands){
 if($command.GetCommandName() -in @('Invoke-Expression','Invoke-Command','Set-ExecutionPolicy','Restart-Computer','iex')){throw 'Forbidden worker command'}
 if($command.GetCommandName() -eq 'Run-SetupProcess' -and
    $command.CommandElements[1] -isnot [System.Management.Automation.Language.StringConstantExpressionAst]){throw 'Setup executable arguments must be fixed local strings'}
}
$dispatch=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Run-Operation'},$true)
. ([scriptblock]::Create($dispatch.Extent.Text))
function Is-Administrator {return $script:TestAdministrator}
function Run-SetupProcess([string]$FixedArguments,[string]$InputScript=''){$script:TestArguments=$FixedArguments;return $script:TestExit}
$script:TestAdministrator=$false;$script:TestExit=0;$script:TestArguments=''
$DockerSetup='fixed test script';$AllowSetup=$false
if((Run-Operation 'inspect').code -ne 'checked'){throw 'Inspection dispatch failed'}
if((Run-Operation 'install_linux').code -ne 'local_setup_required'){throw 'Setup opt-in was bypassed'}
$AllowSetup=$true
if((Run-Operation 'install_linux').code -ne 'local_admin_required'){throw 'Administrator check was bypassed'}
$script:TestAdministrator=$true
if((Run-Operation 'install_linux').code -ne 'linux_installed' -or $script:TestArguments -ne '--install --distribution Ubuntu --no-launch'){throw 'Linux dispatch changed'}
if((Run-Operation 'install_docker').code -ne 'docker_installed' -or $script:TestArguments -ne '--distribution Ubuntu --user root -- bash -s'){throw 'Docker dispatch changed'}
$script:TestExit=3010
if((Run-Operation 'install_linux').code -ne 'restart_required'){throw 'Restart status lost'}
$script:TestExit=-2
if((Run-Operation 'install_docker').code -ne 'operation_timeout'){throw 'Timeout status lost'}
$refused=$false
try{Run-Operation 'run_anything'|Out-Null}catch{$refused=$true}
if(-not $refused){throw 'Unknown operation accepted'}
Write-Output 'Laptop PowerShell: parser, fixed dispatch, local opt-in, administrator gate, restart and timeout checks passed'
