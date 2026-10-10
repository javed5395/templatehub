# Run from the website folder:  powershell -ExecutionPolicy Bypass -File fix_career_breadcrumb.ps1
$files = Get-ChildItem -Path ".\career" -Filter *.html
$n = 0
foreach ($f in $files) {
  $t = [System.IO.File]::ReadAllText($f.FullName)
  $new = [regex]::Replace($t, '"name"\s*:\s*"Career"(\s*,\s*)"item"\s*:\s*"https://www\.lazydogtemplates\.com/career"', '"name": "Career Documents"$1"item": "https://www.lazydogtemplates.com/career_docs_folder_section.html"')
  if ($new -ne $t) { [System.IO.File]::WriteAllText($f.FullName, $new, (New-Object System.Text.UTF8Encoding($false))); $n++ }
}
Write-Host "Updated $n of $($files.Count) files"
