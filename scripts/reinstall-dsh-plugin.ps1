[CmdletBinding()]
param(
    [string]$DshRepo = 'D:\project\deepseek-harness',
    [string]$Profile = 'web',
    [string]$NodePath = '',
    [string]$PnpmCliPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PackageJsonPath = Join-Path $ProjectRoot 'package.json'
$ArtifactDirectory = Join-Path $ProjectRoot '.tmp\manual-test'

if (-not (Test-Path -LiteralPath $PackageJsonPath -PathType Leaf)) {
    throw "找不到插件 package.json：$PackageJsonPath"
}

if (-not (Test-Path -LiteralPath $DshRepo -PathType Container)) {
    throw "找不到 DSH 仓库目录：$DshRepo"
}

$PackageMetadata = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
$PackageName = [string]$PackageMetadata.name
$PackageVersion = [string]$PackageMetadata.version
$PackageFileName = "$PackageName-$PackageVersion.tgz"
$PackagePath = Join-Path $ArtifactDirectory $PackageFileName

function Get-ExitCode {
    if ($null -eq $LASTEXITCODE) {
        return 0
    }

    return [int]$LASTEXITCODE
}

function Test-Executable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [string[]]$Arguments = @('--version')
    )

    try {
        & $Command @Arguments *> $null
        return ((Get-ExitCode) -eq 0)
    } catch {
        return $false
    }
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [switch]$AllowFailure
    )

    $LocationWasPushed = $false

    try {
        Push-Location -LiteralPath $WorkingDirectory
        $LocationWasPushed = $true

        & $Command @Arguments
        $script:LastExternalExitCode = Get-ExitCode

        if (($script:LastExternalExitCode -ne 0) -and (-not $AllowFailure)) {
            throw "命令执行失败（退出码 $($script:LastExternalExitCode)）：$Command $($Arguments -join ' ')"
        }
    } finally {
        if ($LocationWasPushed) {
            Pop-Location
        }
    }
}

function Invoke-Pnpm {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [switch]$AllowFailure
    )

    $InvocationArguments = @($script:PnpmPrefix) + @($Arguments)
    Invoke-External -Command $script:PnpmCommand -Arguments $InvocationArguments `
        -WorkingDirectory $WorkingDirectory -AllowFailure:$AllowFailure
}

function Resolve-NodeCommand {
    if ($NodePath) {
        $ResolvedNodePath = (Resolve-Path -LiteralPath $NodePath).Path
        if ((Test-Path -LiteralPath $ResolvedNodePath -PathType Leaf) -and
            (Test-Executable -Command $ResolvedNodePath)) {
            return $ResolvedNodePath
        }

        throw "指定的 Node.js 不可用：$NodePath"
    }

    $Candidates = @()
    $PathNode = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $PathNode) {
        $Candidates += $PathNode.Source
    }

    if ($env:ProgramFiles) {
        $Candidates += (Join-Path $env:ProgramFiles 'nodejs\node.exe')
    }

    foreach ($Candidate in ($Candidates | Select-Object -Unique)) {
        if ((Test-Path -LiteralPath $Candidate -PathType Leaf) -and
            (Test-Executable -Command $Candidate)) {
            return (Resolve-Path -LiteralPath $Candidate).Path
        }
    }

    throw '找不到可用的 Node.js。请安装 Node.js 22+，或通过 -NodePath 指定 node.exe。'
}

function Resolve-PnpmCommand {
    if ($PnpmCliPath) {
        $ResolvedPnpmCliPath = (Resolve-Path -LiteralPath $PnpmCliPath).Path
        if (-not (Test-Path -LiteralPath $ResolvedPnpmCliPath -PathType Leaf)) {
            throw "指定的 pnpm CLI 不存在：$PnpmCliPath"
        }

        if (-not (Test-Executable -Command $script:NodeCommand -Arguments @($ResolvedPnpmCliPath, '--version'))) {
            throw "指定的 pnpm CLI 不可用：$PnpmCliPath"
        }

        $script:PnpmCommand = $script:NodeCommand
        $script:PnpmPrefix = @($ResolvedPnpmCliPath)
        return
    }

    $PathPnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $PathPnpm -and (Test-Executable -Command $PathPnpm.Source)) {
        $script:PnpmCommand = $PathPnpm.Source
        $script:PnpmPrefix = @()
        return
    }

    throw '找不到可用的 pnpm。请确保 pnpm 在 PATH 中，或通过 -PnpmCliPath 指定 pnpm.cjs。'
}

$script:NodeCommand = Resolve-NodeCommand
$script:PnpmCommand = $null
$script:PnpmPrefix = @()
Resolve-PnpmCommand

$TypeScriptCli = Join-Path $ProjectRoot 'node_modules\typescript\bin\tsc'
$TsdownCli = Join-Path $ProjectRoot 'node_modules\tsdown\dist\run.mjs'
$BuildCleanupScript = Join-Path $ProjectRoot 'scripts\clean-build-output.mjs'
if (-not (Test-Path -LiteralPath $TypeScriptCli -PathType Leaf) -or
    -not (Test-Path -LiteralPath $TsdownCli -PathType Leaf) -or
    -not (Test-Path -LiteralPath $BuildCleanupScript -PathType Leaf)) {
    throw '项目依赖尚未安装。请先在仓库目录执行 npm install。'
}

Write-Host "[1/5] 构建 Host 与 Browser artifact..." -ForegroundColor Cyan
Invoke-External -Command $script:NodeCommand -Arguments @($BuildCleanupScript) `
    -WorkingDirectory $ProjectRoot
Invoke-External -Command $script:NodeCommand -Arguments @($TypeScriptCli, '-p', 'tsconfig.json') `
    -WorkingDirectory $ProjectRoot
Invoke-External -Command $script:NodeCommand -Arguments @($TsdownCli, '--config', 'tsdown.config.ts') `
    -WorkingDirectory $ProjectRoot

Write-Host "[2/5] 重新打包 $PackageName@$PackageVersion..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $ArtifactDirectory | Out-Null
if (Test-Path -LiteralPath $PackagePath -PathType Leaf) {
    Remove-Item -LiteralPath $PackagePath -Force
}

# Build 已经在上一步完成；这里禁用 pack 的 lifecycle，避免 prepare 再次经过 npm/Volta。
Invoke-Pnpm -Arguments @('--config.ignore-scripts=true', 'pack', '--out', $PackagePath) `
    -WorkingDirectory $ProjectRoot

if (-not (Test-Path -LiteralPath $PackagePath -PathType Leaf)) {
    throw "打包完成但未找到 tarball：$PackagePath"
}

Write-Host "[3/5] 卸载 DSH $Profile Profile 中的旧插件..." -ForegroundColor Cyan
Invoke-Pnpm -Arguments @('dsh', 'plugin', '--profile', $Profile, 'remove', $PackageName) `
    -WorkingDirectory $DshRepo -AllowFailure
if ($script:LastExternalExitCode -ne 0) {
    Write-Warning "旧插件可能尚未安装，remove 返回退出码 $($script:LastExternalExitCode)；继续安装新包。"
}

Write-Host "[4/5] 安装新插件包..." -ForegroundColor Cyan
Invoke-Pnpm -Arguments @('dsh', 'plugin', '--profile', $Profile, 'add', $PackagePath) `
    -WorkingDirectory $DshRepo

Write-Host "[5/5] 核对 Profile 插件列表..." -ForegroundColor Cyan
Invoke-Pnpm -Arguments @('dsh', 'plugin', '--profile', $Profile, 'list') `
    -WorkingDirectory $DshRepo

Write-Host ''
Write-Host "已完成：$PackageName@$PackageVersion" -ForegroundColor Green
Write-Host '接下来请完全退出并重新启动 DSH Web Profile，再创建一个新的 DSH 会话进行测试。' -ForegroundColor Yellow
