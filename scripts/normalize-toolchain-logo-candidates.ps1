param(
  [string]$InputDirectory = (Join-Path $PSScriptRoot '..\assets\toolchains\s2-candidates'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\toolchains\s2-candidates\normalized'),
  [ValidateRange(1, 4096)]
  [int]$CanvasSize = 64
)

Add-Type -AssemblyName System.Drawing

$inputPath = [System.IO.Path]::GetFullPath($InputDirectory)
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
$supportedExtensions = @('.png', '.jpg', '.jpeg')

if (-not (Test-Path -LiteralPath $inputPath -PathType Container)) {
  throw "Input directory does not exist: $inputPath"
}

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

$files = @(Get-ChildItem -LiteralPath $inputPath -File |
  Where-Object { $supportedExtensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object Name)

if ($files.Count -eq 0) {
  Write-Output "No raster logo candidates found in $inputPath"
  exit 0
}

$failed = 0
foreach ($file in $files) {
  $image = $null
  $canvas = $null
  $graphics = $null
  try {
    $image = [System.Drawing.Image]::FromFile($file.FullName)
    if ($image.Width -le 0 -or $image.Height -le 0) {
      throw "Image has invalid dimensions."
    }

    $canvas = [System.Drawing.Bitmap]::new(
      $CanvasSize,
      $CanvasSize,
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    $scale = [Math]::Min(
      [double]$CanvasSize / $image.Width,
      [double]$CanvasSize / $image.Height
    )
    $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
    $left = [int][Math]::Floor(($CanvasSize - $width) / 2)
    $top = [int][Math]::Floor(($CanvasSize - $height) / 2)
    $destination = [System.Drawing.Rectangle]::new($left, $top, $width, $height)
    $graphics.DrawImage($image, $destination)

    $outputFile = Join-Path $outputPath "$($file.BaseName).png"
    if (Test-Path -LiteralPath $outputFile -PathType Leaf) {
      Remove-Item -LiteralPath $outputFile -Force
    }
    $canvas.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $outputSize = (Get-Item -LiteralPath $outputFile).Length
    Write-Output "$($file.Name)`t$($image.Width)x$($image.Height) -> ${CanvasSize}x${CanvasSize}`t$($outputSize)B`t$outputFile"
  } catch {
    $failed += 1
    Write-Error "$($file.Name): $($_.Exception.Message)"
  } finally {
    if ($graphics -ne $null) { $graphics.Dispose() }
    if ($canvas -ne $null) { $canvas.Dispose() }
    if ($image -ne $null) { $image.Dispose() }
  }
}

if ($failed -gt 0) {
  throw "$failed logo candidate(s) could not be normalized."
}
