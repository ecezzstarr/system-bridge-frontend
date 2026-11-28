#requires -Version 5.1
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'Windows private storage test requires Windows.'}
$source=Join-Path $PSScriptRoot '../public/host/weave-laptop-worker.ps1'
$tokens=$null;$errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$errors)
if($errors.Count){throw ($errors.Message -join '; ')}
$definition=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Protect-LocalDirectory'},$true)
if(-not $definition){throw 'Private storage function missing.'}
. ([scriptblock]::Create($definition.Extent.Text))
$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$Root=Join-Path $tempRoot ('weave-private-storage-'+[guid]::NewGuid().ToString('N'))
$CredentialFile=Join-Path $Root 'connection.xml'
try{
 New-Item -ItemType Directory -Path $Root|Out-Null
 $before=Get-Acl -LiteralPath $Root
 $ownerBefore=$before.Owner
 $extra=[Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-32-545'),'ReadAndExecute','ContainerInherit, ObjectInherit','None','Allow')
 $before.AddAccessRule($extra)
 Set-Acl -LiteralPath $Root -AclObject $before
 Protect-LocalDirectory
 Protect-LocalDirectory
 $after=Get-Acl -LiteralPath $Root
 if($after.Owner -cne $ownerBefore){throw 'Private storage unexpectedly changed ownership.'}
 if(-not $after.AreAccessRulesProtected){throw 'Private storage inherited access.'}
 $expected=@([Security.Principal.WindowsIdentity]::GetCurrent().User.Value,'S-1-5-18')
 if(@($after.Access).Count -ne 2){throw 'Unexpected private storage grants.'}
 foreach($rule in $after.Access){
  $sid=$rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
  if($sid -notin $expected -or $rule.AccessControlType -ne 'Allow' -or $rule.IsInherited -or $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'Private storage grants are incorrect.'}
 }
 $secret=ConvertTo-SecureString 'synthetic-private-storage-test' -AsPlainText -Force
 [PSCredential]::new('synthetic',$secret)|Export-Clixml -LiteralPath $CredentialFile
 $roundTrip=Import-Clixml -LiteralPath $CredentialFile
 if($roundTrip.GetNetworkCredential().Password -cne 'synthetic-private-storage-test'){throw 'Synthetic DPAPI round trip failed.'}
 Write-Output 'Windows private storage: repeated protection, extra-grant removal, unchanged owner and synthetic DPAPI round trip passed.'
}finally{
 if(Test-Path -LiteralPath $Root){
  $resolved=[IO.Path]::GetFullPath((Get-Item -LiteralPath $Root -Force).FullName)
  if(-not $resolved.Equals([IO.Path]::GetFullPath($Root),[StringComparison]::OrdinalIgnoreCase) -or -not $resolved.StartsWith($tempRoot+'\',[StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolved) -notmatch '^weave-private-storage-[a-f0-9]{32}$'){throw 'Refusing unsafe test cleanup.'}
  Remove-Item -LiteralPath $resolved -Recurse -Force
 }
}
