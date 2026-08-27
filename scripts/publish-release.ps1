[CmdletBinding()]
param(
    [string]$Version = '',
    [ValidatePattern('^[a-z0-9][a-z0-9._-]*$')]
    [string]$NpmTag = 'latest',
    [string]$ArtifactDirectory = '',
    [string]$ReleaseNotesPath = '',
    [string]$GitHubRepo = '',
    [string]$DshRepo = '',
    [switch]$DryRun,
    [switch]$Publish,
    [switch]$PublishNpm,
    [switch]$CreateGitHubRelease,
    [switch]$CreateTag,
    [switch]$PushTag,
    [switch]$RequireStockDshGates
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PackageJsonPath = Join-Path $ProjectRoot 'package.json'
$DefaultArtifactDirectory = Join-Path $ProjectRoot '.tmp\release'
if ([string]::IsNullOrWhiteSpace($ArtifactDirectory)) {
    $ArtifactDirectory = $DefaultArtifactDirectory
} elseif ([IO.Path]::IsPathRooted($ArtifactDirectory)) {
    $existingArtifactDirectory = Resolve-Path $ArtifactDirectory -ErrorAction SilentlyContinue
    if ($null -ne $existingArtifactDirectory) {
        $ArtifactDirectory = $existingArtifactDirectory.Path
    }
} else {
    $ArtifactDirectory = Join-Path $ProjectRoot $ArtifactDirectory
}

$DoNpmPublish = $Publish.IsPresent -or $PublishNpm.IsPresent
$DoGitHubRelease = $Publish.IsPresent -or $CreateGitHubRelease.IsPresent

function Get-PropertyValue {
    param(
        [AllowNull()]
        [object]$Object,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Resolve-Executable {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Names
    )

    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $command) {
            if (-not [string]::IsNullOrWhiteSpace([string]$command.Source)) {
                return $command.Source
            }

            return $command.Path
        }
    }

    throw "找不到必需的命令：$($Names -join ', ')。"
}

function Invoke-Captured {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = @(& $Command @Arguments 2>&1 | ForEach-Object { [string]$_ })
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    [pscustomobject]@{
        ExitCode = $exitCode
        Output = ($output -join [Environment]::NewLine).Trim()
    }
}

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
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    if ($exitCode -ne 0) {
        throw "步骤失败（退出码 $exitCode）：$Label"
    }
}

function Add-RequiredFile {
    param(
        [AllowNull()]
        [string]$PackagePath,
        [Parameter(Mandatory = $true)]
        [string]$Reason,
        [Parameter(Mandatory = $true)]
        [System.Collections.Generic.List[string]]$Missing
    )

    if ([string]::IsNullOrWhiteSpace($PackagePath)) {
        $Missing.Add("$Reason 未声明路径")
        return
    }

    $relativePath = $PackagePath -replace '^[.][/\\]', ''
    if ([IO.Path]::IsPathRooted($relativePath)) {
        $Missing.Add("$Reason 使用了绝对路径：$PackagePath")
        return
    }

    $candidate = Join-Path $ProjectRoot ($relativePath -replace '/', '\')
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $Missing.Add("$Reason 不存在：$PackagePath")
    }
}

function Add-ExportTargets {
    param(
        [AllowNull()]
        [object]$ExportValue,
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [System.Collections.Generic.List[string]]$Missing
    )

    if ($null -eq $ExportValue) {
        return
    }

    if ($ExportValue -is [string]) {
        Add-RequiredFile -PackagePath ([string]$ExportValue) -Reason $Label -Missing $Missing
        return
    }

    foreach ($condition in @('types', 'default', 'import', 'require', 'node', 'browser')) {
        $target = Get-PropertyValue -Object $ExportValue -Name $condition
        if ($null -ne $target) {
            Add-ExportTargets -ExportValue $target -Label "$Label.$condition" -Missing $Missing
        }
    }
}

function Assert-PackageContract {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Manifest
    )

    $missing = [System.Collections.Generic.List[string]]::new()
    Add-RequiredFile -PackagePath ([string](Get-PropertyValue $Manifest 'main')) -Reason 'main' -Missing $missing
    Add-RequiredFile -PackagePath ([string](Get-PropertyValue $Manifest 'types')) -Reason 'types' -Missing $missing

    $exports = Get-PropertyValue $Manifest 'exports'
    if ($null -ne $exports) {
        foreach ($exportProperty in $exports.PSObject.Properties) {
            Add-ExportTargets -ExportValue $exportProperty.Value -Label "exports.$($exportProperty.Name)" -Missing $missing
        }
    }

    $dsh = Get-PropertyValue $Manifest 'dsh'
    $bundle = Get-PropertyValue $dsh 'bundle'
    $patch = [string](Get-PropertyValue $bundle 'patch')
    Add-RequiredFile -PackagePath $patch -Reason 'dsh.bundle.patch' -Missing $missing

    if ($missing.Count -gt 0) {
        throw "Bundle 产物检查失败：`n- $($missing -join "`n- ")"
    }
}

function Get-GitHubRepoFromRemote {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Remote
    )

    $match = [regex]::Match($Remote.Trim(), 'github\.com[/:](?<owner>[^/]+)/(?<repo>[^/]+?)(?:\.git)?$')
    if (-not $match.Success) {
        return ''
    }

    return "$($match.Groups['owner'].Value)/$($match.Groups['repo'].Value)"
}

if (-not (Test-Path -LiteralPath $PackageJsonPath -PathType Leaf)) {
    throw "找不到 package.json：$PackageJsonPath"
}

$NodeCommand = Resolve-Executable @('node.exe', 'node')
$NpmCommand = Resolve-Executable @('npm.cmd', 'npm')
$GitCommand = Resolve-Executable @('git.exe', 'git')
$GhCommand = $null
if ($DoGitHubRelease -and -not $DryRun.IsPresent) {
    $GhCommand = Resolve-Executable @('gh.exe', 'gh')
}

$Manifest = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
$PackageName = [string](Get-PropertyValue $Manifest 'name')
$PackageVersion = [string](Get-PropertyValue $Manifest 'version')
if ([string]::IsNullOrWhiteSpace($PackageName) -or [string]::IsNullOrWhiteSpace($PackageVersion)) {
    throw 'package.json 必须声明非空的 name 和 version。'
}

$requestedVersion = $Version.Trim()
if ($requestedVersion.StartsWith('v')) {
    $requestedVersion = $requestedVersion.Substring(1)
}
if (-not [string]::IsNullOrWhiteSpace($requestedVersion) -and $requestedVersion -ne $PackageVersion) {
    throw "Version 参数 $requestedVersion 与 package.json 中的版本 $PackageVersion 不一致；脚本不会自动修改版本。"
}
if ($PackageVersion -notmatch '^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$') {
    throw "package.json 中的版本不是有效的 SemVer：$PackageVersion"
}

$Tag = "v$PackageVersion"
$licensePath = Join-Path $ProjectRoot 'LICENSE'
$repository = Get-PropertyValue $Manifest 'repository'
$repositoryUrl = [string](Get-PropertyValue $repository 'url')
$releaseWarnings = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path -LiteralPath $licensePath -PathType Leaf)) {
    $releaseWarnings.Add('仓库缺少 LICENSE 文件；正式发布前应补齐与 license 字段一致的许可证文本。')
}
if ([string]::IsNullOrWhiteSpace($repositoryUrl)) {
    $releaseWarnings.Add('package.json 缺少 repository.url；npm Trusted Publishing/provenance 需要它与 GitHub 仓库精确一致。')
}
if ([bool](Get-PropertyValue $Manifest 'private')) {
    $releaseWarnings.Add('package.json private=true，npm 不会将它作为公开包发布。')
}

Write-Host "DSH Runtime Inspector release: $PackageName@$PackageVersion" -ForegroundColor Green
Write-Host "Project: $ProjectRoot"
Write-Host "Tag: $Tag"
if ($DryRun) {
    Write-Host '模式：DryRun（不会发布、创建 Tag、推送 Tag 或创建 GitHub Release）' -ForegroundColor Yellow
}

foreach ($warning in $releaseWarnings) {
    Write-Warning $warning
}
if ($DoNpmPublish -and $releaseWarnings.Count -gt 0) {
    throw "npm 正式发布被阻止，请先处理上面的发布前置问题。"
}

$statusResult = Invoke-Captured -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'status', '--porcelain')
if ($statusResult.ExitCode -ne 0) {
    throw "无法读取 Git 工作树状态：$($statusResult.Output)"
}
if (-not [string]::IsNullOrWhiteSpace($statusResult.Output)) {
    throw "工作树不干净。请先提交或移开改动，再发布：`n$($statusResult.Output)"
}

$diffCheckResult = Invoke-Captured -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'diff', '--check', 'HEAD')
if ($diffCheckResult.ExitCode -ne 0) {
    throw "git diff --check 失败：$($diffCheckResult.Output)"
}

$headResult = Invoke-Captured -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'rev-parse', 'HEAD')
if ($headResult.ExitCode -ne 0) {
    throw "无法读取当前 Git commit：$($headResult.Output)"
}
$headCommit = $headResult.Output.Trim()

$remoteResult = Invoke-Captured -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'remote', 'get-url', 'origin')
$remoteUrl = if ($remoteResult.ExitCode -eq 0) { $remoteResult.Output.Trim() } else { '' }
if (($DoGitHubRelease -or $PushTag.IsPresent) -and [string]::IsNullOrWhiteSpace($remoteUrl)) {
    throw 'GitHub Release 或推送 Tag 需要 origin remote。'
}

$branchResult = Invoke-Captured -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'branch', '--show-current')
$branchName = if ($branchResult.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($branchResult.Output)) {
    $branchResult.Output.Trim()
} else {
    '(detached HEAD)'
}
Write-Host "Current branch: $branchName"

Assert-PackageContract -Manifest $Manifest

Invoke-External -Command $NpmCommand -Arguments @('run', 'typecheck') -Label 'TypeScript typecheck'
Invoke-External -Command $NpmCommand -Arguments @('test') -Label 'Deterministic test suite'
Invoke-External -Command $NpmCommand -Arguments @('run', 'build') -Label 'Host and Browser build'
Assert-PackageContract -Manifest $Manifest

$resolvedDshRepo = $DshRepo.Trim()
if ([string]::IsNullOrWhiteSpace($resolvedDshRepo) -and -not [string]::IsNullOrWhiteSpace([string]$env:DSH_REPO)) {
    $resolvedDshRepo = [string]$env:DSH_REPO
}
if ($RequireStockDshGates.IsPresent -and [string]::IsNullOrWhiteSpace($resolvedDshRepo)) {
    throw 'RequireStockDshGates 已启用，但没有提供 -DshRepo 或 DSH_REPO。'
}
if (-not [string]::IsNullOrWhiteSpace($resolvedDshRepo)) {
    if (-not (Test-Path -LiteralPath $resolvedDshRepo -PathType Container)) {
        throw "找不到 DSH checkout：$resolvedDshRepo"
    }

    $resolvedDshRepo = (Resolve-Path -LiteralPath $resolvedDshRepo).Path
    $env:DSH_REPO = $resolvedDshRepo
    Invoke-External -Command $NodeCommand -Arguments @('--test', 'tests/dsh-bundle-smoke.test.mjs') -Label 'Stock DSH Bundle smoke'
    Invoke-External -Command $NodeCommand -Arguments @('--test', 'tests/dsh-release-gate.test.mjs') -Label 'Stock DSH native release gate'
    $previousWebE2e = $env:DSH_WEB_E2E
    try {
        $env:DSH_WEB_E2E = '1'
        Invoke-External -Command $NodeCommand -Arguments @('--test', 'tests/dsh-web-smoke.test.mjs') -Label 'Stock DSH Web smoke'
    } finally {
        if ($null -eq $previousWebE2e) {
            Remove-Item Env:DSH_WEB_E2E -ErrorAction SilentlyContinue
        } else {
            $env:DSH_WEB_E2E = $previousWebE2e
        }
    }
} elseif ($DoNpmPublish -or $DoGitHubRelease) {
    Write-Warning '未提供 DSH_REPO；Stock DSH gates 未运行。正式发布前应先在 Windows Stock DSH checkout 上运行对应 gates。'
}

New-Item -ItemType Directory -Force -Path $ArtifactDirectory | Out-Null
$packArguments = @('pack', '--ignore-scripts', '--json', '--loglevel=error', '--pack-destination', $ArtifactDirectory)
Write-Host "`n[Pack npm artifact]" -ForegroundColor Cyan
$packResult = Invoke-Captured -Command $NpmCommand -Arguments $packArguments
if ($packResult.ExitCode -ne 0) {
    throw "npm pack 失败：$($packResult.Output)"
}

try {
    $packInfo = $packResult.Output | ConvertFrom-Json
} catch {
    throw "npm pack 没有返回可解析的 JSON：$($packResult.Output)"
}
$packEntry = @($packInfo)[0]
$artifactName = [string](Get-PropertyValue $packEntry 'filename')
if ([string]::IsNullOrWhiteSpace($artifactName)) {
    throw "npm pack 没有返回 tarball 文件名：$($packResult.Output)"
}
$artifactPath = Join-Path $ArtifactDirectory $artifactName
if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
    throw "npm pack 完成但找不到 tarball：$artifactPath"
}

$packedFiles = @()
$packFileEntries = Get-PropertyValue $packEntry 'files'
if ($null -ne $packFileEntries) {
    $packedFiles = @($packFileEntries | ForEach-Object { [string](Get-PropertyValue $_ 'path') })
}
foreach ($requiredPackedFile in @('package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js')) {
    if ($packedFiles.Count -gt 0 -and $packedFiles -notcontains $requiredPackedFile) {
        throw "最终 npm 包缺少必需文件：$requiredPackedFile"
    }
}

$hash = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = "$artifactPath.sha256"
"$hash  $artifactName" | Set-Content -LiteralPath $checksumPath -Encoding ASCII

Write-Host "Artifact: $artifactPath" -ForegroundColor Green
Write-Host "SHA-256: $hash"

$tagResult = Invoke-Captured -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'rev-parse', '--verify', "$Tag^{commit}")
$localTagExists = $tagResult.ExitCode -eq 0
if ($localTagExists -and $tagResult.Output.Trim() -ne $headCommit) {
    throw "本地 Tag $Tag 已存在，但没有指向当前 HEAD；脚本不会覆盖它。"
}
if (-not $localTagExists -and $PushTag.IsPresent -and -not $CreateTag.IsPresent) {
    throw "PushTag 要求本地 Tag $Tag 已存在，或同时传入 -CreateTag。"
}

if ($CreateTag.IsPresent -and -not $localTagExists) {
    if ($DryRun) {
        Write-Host "[DryRun] 将创建 annotated tag $Tag"
    } else {
        Invoke-External -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'tag', '-a', $Tag, '-m', "Release $Tag", $headCommit) -Label "Create tag $Tag"
    }
    $localTagExists = $true
}

if ($PushTag.IsPresent) {
    if ($DryRun) {
        Write-Host "[DryRun] 将推送 origin/$Tag"
    } else {
        Invoke-External -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'push', 'origin', "refs/tags/$Tag") -Label "Push tag $Tag"
    }
}

if ($DoGitHubRelease) {
    if (-not $localTagExists) {
        throw "GitHub Release 需要已存在且指向当前 HEAD 的本地 Tag $Tag；请传入 -CreateTag -PushTag，或先准备好该 Tag。"
    }
    if (-not $PushTag.IsPresent -and -not $DryRun) {
        $remoteTagResult = Invoke-Captured -Command $GitCommand -Arguments @('-C', $ProjectRoot, 'ls-remote', '--tags', 'origin', "refs/tags/$Tag")
        if ($remoteTagResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($remoteTagResult.Output)) {
            throw "远端没有 origin/$Tag；创建 GitHub Release 前请传入 -PushTag。"
        }
    }

    $resolvedGitHubRepo = $GitHubRepo.Trim()
    if ([string]::IsNullOrWhiteSpace($resolvedGitHubRepo)) {
        $resolvedGitHubRepo = Get-GitHubRepoFromRemote -Remote $remoteUrl
    }
    if ([string]::IsNullOrWhiteSpace($resolvedGitHubRepo)) {
        throw '无法从 origin 推断 GitHub 仓库，请传入 -GitHubRepo owner/repository。'
    }

    if ($DryRun) {
        Write-Host "[DryRun] 将在 GitHub $resolvedGitHubRepo 创建或更新 Release $Tag"
        Write-Host "[DryRun] Release 附件：$artifactName、$([IO.Path]::GetFileName($checksumPath))"
    } else {
        $authResult = Invoke-Captured -Command $GhCommand -Arguments @('auth', 'status', '--hostname', 'github.com')
        if ($authResult.ExitCode -ne 0) {
            throw "GitHub CLI 未认证：$($authResult.Output)"
        }

        $existingReleaseResult = Invoke-Captured -Command $GhCommand -Arguments @('release', 'view', $Tag, '--repo', $resolvedGitHubRepo, '--json', 'tagName')
        if ($existingReleaseResult.ExitCode -eq 0) {
            Invoke-External -Command $GhCommand -Arguments @('release', 'upload', $Tag, $artifactPath, $checksumPath, '--repo', $resolvedGitHubRepo, '--clobber') -Label "Upload GitHub Release $Tag assets"
        } else {
            $releaseArguments = @('release', 'create', $Tag, $artifactPath, $checksumPath, '--repo', $resolvedGitHubRepo, '--title', $Tag, '--verify-tag')
            if ([string]::IsNullOrWhiteSpace($ReleaseNotesPath)) {
                $releaseArguments += '--generate-notes'
            } else {
                $notesPathCandidate = if ([IO.Path]::IsPathRooted($ReleaseNotesPath)) {
                    $ReleaseNotesPath
                } else {
                    Join-Path $ProjectRoot $ReleaseNotesPath
                }
                $resolvedNotesPath = (Resolve-Path -LiteralPath $notesPathCandidate).Path
                $releaseArguments += @('--notes-file', $resolvedNotesPath)
            }
            Invoke-External -Command $GhCommand -Arguments $releaseArguments -Label "Create GitHub Release $Tag"
        }
    }
}

if ($DoNpmPublish) {
    if ($DryRun) {
        Write-Host "[DryRun] 将执行 npm publish $artifactName --tag $NpmTag"
    } else {
        $publishedVersionResult = Invoke-Captured -Command $NpmCommand -Arguments @('view', "$PackageName@$PackageVersion", 'version', '--json', '--loglevel=error')
        if ($publishedVersionResult.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($publishedVersionResult.Output)) {
            Write-Warning "$PackageName@$PackageVersion 已经存在于 npm；npm 包版本不可覆盖，本次跳过 npm publish。"
        } else {
            $publishArguments = @('publish', $artifactPath, '--tag', $NpmTag)
            if ($PackageName.StartsWith('@')) {
                $publishArguments += @('--access', 'public')
            }
            Invoke-External -Command $NpmCommand -Arguments $publishArguments -Label "Publish npm $PackageName@$PackageVersion"
        }
    }
}

Write-Host "`n发布流程准备完成。" -ForegroundColor Green
if (-not $DoNpmPublish -and -not $DoGitHubRelease -and -not $CreateTag.IsPresent -and -not $PushTag.IsPresent) {
    Write-Host '本次只完成检查、构建和打包；没有执行 npm publish、Tag 或 GitHub Release。'
}
