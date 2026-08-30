[CmdletBinding()]
param(
    [ValidatePattern('^[a-z0-9][a-z0-9._-]*$')]
    [string]$NpmTag = 'latest',
    [string]$ArtifactDirectory = '',
    [string]$GitHubRepo = 'ianho7/dsh-port-inspector'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PackageJsonPath = Join-Path $ProjectRoot 'package.json'
if ([string]::IsNullOrWhiteSpace($ArtifactDirectory)) {
    $ArtifactDirectory = Join-Path $ProjectRoot '.tmp\release'
} elseif (-not [IO.Path]::IsPathRooted($ArtifactDirectory)) {
    $ArtifactDirectory = Join-Path $ProjectRoot $ArtifactDirectory
}

$PackageMetadata = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
$PackageName = [string]$PackageMetadata.name
$PackageVersion = [string]$PackageMetadata.version
$PackageFileName = "$PackageName-$PackageVersion.tgz"
$PackagePath = Join-Path $ArtifactDirectory $PackageFileName
$ReleaseTag = "v$PackageVersion"

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Write-Host "`n[$Label]" -ForegroundColor Cyan
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "步骤失败（退出码 $LASTEXITCODE）：$Label"
    }
}

function Assert-Authenticated {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Service,
        [Parameter(Mandatory = $true)]
        [string]$LoginCommand
    )

    $ErrorActionPreference = 'Continue'
    & $Command @Arguments *> $null
    $ExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    if ($ExitCode -ne 0) {
        throw "$Service 尚未登录或登录已失效。请先执行：$LoginCommand"
    }

    Write-Host "$Service 登录状态正常。" -ForegroundColor Green
}

Write-Host "发布 $PackageName@$PackageVersion" -ForegroundColor Green

Write-Host "`n[发布凭据检查]" -ForegroundColor Cyan
Assert-Authenticated -Command 'gh.exe' `
    -Arguments @('auth', 'status', '--hostname', 'github.com') `
    -Service 'GitHub CLI' `
    -LoginCommand 'gh auth login'
Assert-Authenticated -Command 'npm.cmd' `
    -Arguments @('whoami', '--loglevel=error') `
    -Service 'npm' `
    -LoginCommand 'npm login'

Write-Host "`n[1/3] 打包压缩包..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $ArtifactDirectory | Out-Null
if (Test-Path -LiteralPath $PackagePath -PathType Leaf) {
    Remove-Item -LiteralPath $PackagePath -Force
}
Invoke-External -Command 'npm.cmd' `
    -Arguments @('pack', '--pack-destination', $ArtifactDirectory) `
    -Label 'npm pack'

Write-Host "`n[2/3] 发布到 npm..." -ForegroundColor Cyan
$PublishArguments = @('publish', $PackagePath, '--tag', $NpmTag)
if ($PackageName.StartsWith('@')) {
    $PublishArguments += @('--access', 'public')
}
Invoke-External -Command 'npm.cmd' `
    -Arguments $PublishArguments `
    -Label "npm publish $PackageName@$PackageVersion"

Write-Host "`n[3/3] 上传 GitHub Release..." -ForegroundColor Cyan
Invoke-External -Command 'gh.exe' `
    -Arguments @(
        'release', 'create', $ReleaseTag, $PackagePath,
        '--repo', $GitHubRepo,
        '--title', $ReleaseTag,
        '--generate-notes'
    ) `
    -Label "GitHub Release $ReleaseTag"

Write-Host "`n发布完成：$PackageName@$PackageVersion" -ForegroundColor Green
Write-Host "压缩包：$PackagePath"
Write-Host "GitHub Release：$GitHubRepo@$ReleaseTag"
