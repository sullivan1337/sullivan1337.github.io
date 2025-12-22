<#
.SYNOPSIS
    Windows 11 Interactive Sanitization and Configuration Framework
.DESCRIPTION
    A comprehensive automation script designed for post-OOBE execution.
    Features:
    - Deep removal of Microsoft & Third-Party bloatware (Provisioned & Installed)
    - Taskbar and Shell interface customization (Registry/Policy)
    - Automated software deployment via direct installer downloads (no winget needed!)
    - Interactive Menu System with progress indicators
.NOTES
    Author: sullivan1337
    Privileges: Requires Administrator (Self-elevating)
    
.EXAMPLE
    # ONE-LINER EXECUTION (Run from any fresh Windows 11 install):
    irm https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/refs/heads/master/tech-tools/scripts/win11debloat.ps1 | iex
    
    # Alternative (if you encounter issues with irm | iex):
    iwr -UseBasicParsing "https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/refs/heads/master/tech-tools/scripts/win11debloat.ps1" -OutFile "$env:TEMP\debloat.ps1"; Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:TEMP\debloat.ps1"
#>

# ==========================================
# PHASE 1: PRE-FLIGHT CHECKS & ELEVATION
# ==========================================
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Host "Elevation Required. Restarting as Administrator..." -ForegroundColor Yellow
    # Save script to temp file for elevation (handles irm | iex scenario)
    $ScriptPath = "$env:TEMP\win11debloat_elevated.ps1"
    $MyInvocation.MyCommand.ScriptBlock | Out-File -FilePath $ScriptPath -Force
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" -Verb RunAs
    Exit
}

# ==========================================
# PHASE 2: DATA DEFINITIONS (THE KILL LIST)
# ==========================================

# 2.1 Microsoft Ecosystem (Bing, Copilot, Legacy)
$MicrosoftBloat = @(
    "Microsoft.3DBuilder",                     # Basic 3D modeling software
    "Microsoft.549981C3F5F10",                 # Cortana (discontinued)
    "Microsoft.BingFinance",                   # Bing Finance (discontinued)
    "Microsoft.BingFoodAndDrink",              # Bing Recipes (discontinued)
    "Microsoft.BingHealthAndFitness",          # Bing Health (discontinued)
    "Microsoft.BingNews",                      # Bing News (replaced by Start)
    "Microsoft.BingSports",                    # Bing Sports (discontinued)
    "Microsoft.BingTranslator",                # Bing Translator
    "Microsoft.BingTravel",                    # Bing Travel (discontinued)
    "Microsoft.BingWeather",                   # Bing Weather
    "Microsoft.Copilot",                       # AI Assistant
    "Microsoft.Windows.Ai.Copilot.Provider",   # Deep Copilot Integration
    "Microsoft.Messaging",                     # Messaging (deprecated)
    "Microsoft.MicrosoftJournal",              # Digital note-taking
    "Microsoft.MicrosoftOfficeHub",            # Office Hub / Microsoft 365
    "Microsoft.MicrosoftPowerBIForWindows",    # Power BI
    "Microsoft.MicrosoftSolitaireCollection",  # Solitaire Games
    "Microsoft.MixedReality.Portal",           # VR/MR Portal
    "Microsoft.News",                          # Microsoft Start News
    "Microsoft.Office.Sway",                   # Presentation app
    "Microsoft.OneConnect",                    # Mobile operator (deprecated)
    "Microsoft.OutlookForWindows",             # New Outlook app
    "Microsoft.People",                        # People/Contacts app
    "Microsoft.PowerAutomateDesktop",          # Desktop automation
    "Microsoft.SkypeApp",                      # Skype UWP
    "Microsoft.Todos",                         # To-Do list app
    "Microsoft.Windows.DevHome",               # Developer dashboard
    "Microsoft.windowscommunicationsapps",     # Mail and Calendar
    "Microsoft.WindowsFeedbackHub",            # Feedback Hub
    "Microsoft.WindowsMaps",                   # Maps app
    "Microsoft.ZuneVideo",                     # Movies & TV
    "MicrosoftCorporationII.MicrosoftFamily",  # Family Safety
    "MicrosoftCorporationII.QuickAssist",      # Quick Assist
    "MicrosoftTeams",                          # Teams Personal (old)
    "MSTeams"                                  # Teams (new)
)

# 2.2 Third-Party & Sponsored Content
$ThirdPartyBloat = @(
    "ACGMediaPlayer", "ActiproSoftwareLLC", "AdobeSystemsIncorporated.AdobePhotoshopExpress",
    "Amazon.com.Amazon", "AmazonVideo.PrimeVideo", "Asphalt8Airborne", "AutodeskSketchBook",
    "CaesarsSlotsFreeCasino", "COOKINGFEVER", "CyberLinkMediaSuiteEssentials",
    "DisneyMagicKingdoms", "Disney", "DrawboardPDF", "Duolingo-LearnLanguagesforFree",
    "EclipseManager", "Facebook", "FarmVille2CountryEscape", "fitbit", "Flipboard",
    "HiddenCity", "HULULLC.HULUPLUS", "iHeartRadio", "Instagram", "king.com.BubbleWitch3Saga",
    "king.com.CandyCrushSaga", "king.com.CandyCrushSodaSaga", "LinkedInforWindows",
    "MarchofEmpires", "Netflix", "NYTCrossword", "OneCalendar", "PandoraMediaInc",
    "PhototasticCollage", "PicsArt-PhotoStudio", "Plex", "PolarrPhotoEditorAcademicEdition",
    "Royal Revolt", "Shazam", "Sidia.LiveWallpaper", "SlingTV", "TikTok", "TuneInRadio",
    "Twitter", "Viber", "WinZipUniversal", "Wunderlist", "XING", "Spotify"
)

# ==========================================
# PHASE 3: FUNCTION LIBRARIES
# ==========================================

function Remove-PackageList {
    param (
        [Parameter(Mandatory=$true)]
        [string[]]$PackageList,
        [Parameter(Mandatory=$true)]
        [string]$Category
    )
    Write-Host "`n=====================================================" -ForegroundColor Cyan
    Write-Host "   Processing Removal: $Category" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    
    $Removed = 0
    $Skipped = 0
    
    foreach ($Item in $PackageList) {
        $PackageName = "*$Item*"
        Write-Host "  Targeting: " -NoNewline
        Write-Host $Item -ForegroundColor White -NoNewline
        
        $FoundAny = $false
        
        # 1. Remove Provisioned Package (System Image)
        # Prevents app from installing for new users
        $Prov = Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName -like $PackageName}
        if ($Prov) {
            foreach ($p in $Prov) {
                Remove-AppxProvisionedPackage -Online -PackageName $p.PackageName -ErrorAction SilentlyContinue | Out-Null
            }
            Write-Host " [Deprovisioned]" -NoNewline -ForegroundColor Yellow
            $FoundAny = $true
        }
        
        # 2. Remove Installed Package (Current User & All Users)
        $Inst = Get-AppxPackage -Name $PackageName -AllUsers -ErrorAction SilentlyContinue
        if ($Inst) {
            $Inst | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue | Out-Null
            Write-Host " [Uninstalled]" -NoNewline -ForegroundColor Green
            $FoundAny = $true
            $Removed++
        }
        
        if (-not $FoundAny) {
            Write-Host " [Not Found]" -NoNewline -ForegroundColor DarkGray
            $Skipped++
        }
        Write-Host "" 
    }
    
    Write-Host "`n  Summary: " -NoNewline
    Write-Host "$Removed removed" -ForegroundColor Green -NoNewline
    Write-Host ", $Skipped not found/already gone" -ForegroundColor DarkGray
}

function Configure-UI {
    Write-Host "`n=====================================================" -ForegroundColor Cyan
    Write-Host "   UI Customization (Taskbar & Explorer)" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    
    # Show Taskbar changes
    Write-Host ""
    Write-Host "  TASKBAR - The following items will be " -NoNewline -ForegroundColor White
    Write-Host "HIDDEN:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  • Search Box (taskbar search field)                │" -ForegroundColor DarkGray
    Write-Host "  │  • Task View Button (virtual desktops)              │" -ForegroundColor DarkGray
    Write-Host "  │  • Widgets Button (news/weather panel)              │" -ForegroundColor DarkGray
    Write-Host "  │  • Chat/Meet Now Icon (Teams integration)           │" -ForegroundColor DarkGray
    Write-Host "  │  • Copilot Button (AI assistant)                    │" -ForegroundColor DarkGray
    Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    $taskbarConfirm = Read-Host "  Apply taskbar changes? (y/n)"
    $applyTaskbar = ($taskbarConfirm -eq 'y' -or $taskbarConfirm -eq 'Y')
    
    # Show Explorer changes
    Write-Host ""
    Write-Host "  EXPLORER - The following settings will be " -NoNewline -ForegroundColor White
    Write-Host "CHANGED:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  • Open Explorer to 'This PC' (instead of Home)     │" -ForegroundColor DarkGray
    Write-Host "  │  • Show hidden files, folders, and drives           │" -ForegroundColor DarkGray
    Write-Host "  │  • Show file extensions (e.g., .txt, .exe)          │" -ForegroundColor DarkGray
    Write-Host "  │  • Unpin Videos, Music, Pictures from Quick Access  │" -ForegroundColor DarkGray
    Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    $explorerConfirm = Read-Host "  Apply Explorer changes? (y/n)"
    $applyExplorer = ($explorerConfirm -eq 'y' -or $explorerConfirm -eq 'Y')
    
    if (-not $applyTaskbar -and -not $applyExplorer) {
        Write-Host "  No customizations selected. Cancelled." -ForegroundColor Yellow
        return
    }
    
    Write-Host ""
    $ExplorerKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer"
    $AdvancedKey = "$ExplorerKey\Advanced"
    
    # Apply Taskbar changes
    if ($applyTaskbar) {
        Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Configuring Taskbar..." -ForegroundColor Cyan
        Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        
        # Hide Search Box (0 = Hidden, 1 = Icon only, 2 = Search box)
        Write-Host "  [1/5] Hiding Search Box..." -ForegroundColor White
        Set-ItemProperty -Path $AdvancedKey -Name "SearchboxTaskbarMode" -Value 0 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        # Hide Task View Button (0 = Hidden, 1 = Visible)
        Write-Host "  [2/5] Hiding Task View Button..." -ForegroundColor White
        Set-ItemProperty -Path $AdvancedKey -Name "ShowTaskViewButton" -Value 0 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        # Hide Widgets Button (0 = Hidden, 1 = Visible)
        Write-Host "  [3/5] Hiding Widgets Button..." -ForegroundColor White
        Set-ItemProperty -Path $AdvancedKey -Name "TaskbarDa" -Value 0 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        # Hide Meet Now / Chat Icon (3 = Hidden)
        Write-Host "  [4/5] Hiding Chat/Meet Now Icon..." -ForegroundColor White
    $ChatPolicy = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Chat"
    if (!(Test-Path $ChatPolicy)) { New-Item -Path $ChatPolicy -Force | Out-Null }
        Set-ItemProperty -Path $ChatPolicy -Name "ChatIcon" -Value 3 -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $AdvancedKey -Name "TaskbarMn" -Value 0 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        # Hide Copilot Button
        Write-Host "  [5/5] Hiding Copilot Button..." -ForegroundColor White
        Set-ItemProperty -Path $AdvancedKey -Name "ShowCopilotButton" -Value 0 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        Write-Host "`n  All taskbar items hidden!" -ForegroundColor Green
        
        # Align Taskbar to Left (0 = Left, 1 = Center) - Optional, ask user
        Write-Host ""
        $AlignLeft = Read-Host "  OPTIONAL: Align taskbar icons to LEFT instead of center? (y/n)"
        if ($AlignLeft -eq 'y' -or $AlignLeft -eq 'Y') {
            Set-ItemProperty -Path $AdvancedKey -Name "TaskbarAl" -Value 0 -Force -ErrorAction SilentlyContinue
            Write-Host "        Taskbar aligned to left" -ForegroundColor Green
        } else {
            Write-Host "        Keeping center alignment" -ForegroundColor DarkGray
        }
    }
    
    # Apply Explorer changes
    if ($applyExplorer) {
        Write-Host ""
        Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Configuring Explorer..." -ForegroundColor Cyan
        Write-Host "  ═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        
        # 1. Open File Explorer to "This PC" (1 = This PC, 2 = Quick Access, 3 = Home)
        Write-Host "  [1/4] Setting Explorer to open to 'This PC'..." -ForegroundColor White
        Set-ItemProperty -Path $AdvancedKey -Name "LaunchTo" -Value 1 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        # 2. Show hidden files, folders, and drives (1 = Show, 2 = Hide)
        Write-Host "  [2/4] Enabling hidden files/folders/drives..." -ForegroundColor White
        Set-ItemProperty -Path $AdvancedKey -Name "Hidden" -Value 1 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        # 3. Show file extensions (0 = Show, 1 = Hide)
        Write-Host "  [3/4] Showing file extensions..." -ForegroundColor White
        Set-ItemProperty -Path $AdvancedKey -Name "HideFileExt" -Value 0 -Force -ErrorAction SilentlyContinue
        Write-Host "        Done" -ForegroundColor Green
        
        # 4. Unpin Videos, Music, and Pictures from Quick Access / Navigation Pane
        Write-Host "  [4/4] Unpinning Videos, Music, Pictures from Explorer..." -ForegroundColor White
        
        # These are the shell folder GUIDs that control visibility in navigation pane
        $foldersToHide = @{
            "3D Objects" = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}"
            "Music" = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{3dfdf296-dbec-4fb4-81d1-6a3438bcf4de}"
            "Videos" = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{f86fa3ab-70d2-4fc7-9c99-fcbf05467f3a}"
            "Pictures" = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{24ad3ad4-a569-4530-98e1-ab02f9417aa8}"
        }
        
        foreach ($folder in $foldersToHide.GetEnumerator()) {
            if (Test-Path $folder.Value) {
                Remove-Item -Path $folder.Value -Force -ErrorAction SilentlyContinue
                Write-Host "        Removed $($folder.Key) from This PC" -ForegroundColor DarkGray
            }
        }
        
        # Also hide from Quick Access by removing the pin (if pinned)
        try {
            $shell = New-Object -ComObject Shell.Application
            $quickAccess = $shell.Namespace("shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}")
            if ($quickAccess) {
                $items = $quickAccess.Items()
                foreach ($item in $items) {
                    $name = $item.Name
                    if ($name -match "Videos|Music|Pictures") {
                        $item.InvokeVerb("unpinfromhome")
                        Write-Host "        Unpinned $name from Quick Access" -ForegroundColor DarkGray
                    }
                }
            }
        } catch {
            Write-Host "        Quick Access unpin skipped (may need manual removal)" -ForegroundColor DarkGray
        }
        
        Write-Host "        Done" -ForegroundColor Green
        Write-Host "`n  All Explorer settings applied!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "  Explorer will restart to apply changes..." -ForegroundColor Yellow
}

# ==========================================
# APP INSTALLATION DEFINITIONS
# ==========================================
# Using direct installers instead of winget for reliability on fresh installs

$AppInstallers = @{
    "Chrome" = @{
        Name = "Google Chrome"
        URL = "https://dl.google.com/chrome/install/latest/chrome_installer.exe"
        Args = "/silent /install"
        ExePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
    }
    "Firefox" = @{
        Name = "Mozilla Firefox"
        URL = "https://download.mozilla.org/?product=firefox-latest&os=win64&lang=en-US"
        Args = "/S"
        ExePath = "${env:ProgramFiles}\Mozilla Firefox\firefox.exe"
    }
    "VSCode" = @{
        Name = "Visual Studio Code"
        URL = "https://code.visualstudio.com/sha/download?build=stable&os=win32-x64"
        Args = "/verysilent /norestart /mergetasks=!runcode,addcontextmenufiles,addcontextmenufolders,addtopath"
        ExePaths = @(
            "${env:ProgramFiles}\Microsoft VS Code\Code.exe",
            "${env:LOCALAPPDATA}\Programs\Microsoft VS Code\Code.exe"
        )
    }
    "Steam" = @{
        Name = "Steam"
        URLs = @(
            "https://cdn.fastly.steamstatic.com/client/installer/SteamSetup.exe",
            "https://cdn.akamai.steamstatic.com/client/installer/SteamSetup.exe"
        )
        Args = "/S"
        ExePath = "${env:ProgramFiles(x86)}\Steam\steam.exe"
    }
    "VLC" = @{
        Name = "VLC Media Player"
        URLs = @(
            "https://ftp.osuosl.org/pub/videolan/vlc/3.0.21/win64/vlc-3.0.21-win64.exe",
            "https://mirror.init7.net/videolan/vlc/3.0.21/win64/vlc-3.0.21-win64.exe",
            "https://opencolo.mm.fcix.net/videolan/vlc/3.0.21/win64/vlc-3.0.21-win64.exe"
        )
        Args = "/S /L=1033"
        ExePath = "${env:ProgramFiles}\VideoLAN\VLC\vlc.exe"
    }
    "Discord" = @{
        Name = "Discord"
        URL = "https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64"
        Args = ""
        # Discord uses Update.exe as launcher: Update.exe --processStart Discord.exe
        # Actual Discord.exe is in versioned folders like app-1.0.9219
        ExePath = "${env:LOCALAPPDATA}\Discord\Update.exe"
    }
    "NvidiaApp" = @{
        Name = "NVIDIA App"
        URL = "https://us.download.nvidia.com/nvapp/client/11.0.5.420/NVIDIA_app_v11.0.5.420.exe"
        Args = "-s -n"
        ExePath = "${env:ProgramFiles}\NVIDIA Corporation\NVIDIA App\CEF\NVIDIA app.exe"
    }
}

function Show-DownloadProgress {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Url,
        [Parameter(Mandatory=$true)]
        [string]$OutFile,
        [Parameter(Mandatory=$true)]
        [string]$AppName
    )
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        $uri = New-Object System.Uri($Url)
        $request = [System.Net.HttpWebRequest]::Create($uri)
        $request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        $request.Timeout = 15000  # 15 second timeout for connection
        $request.ReadWriteTimeout = 30000  # 30 second timeout for read/write
        $request.AllowAutoRedirect = $true
        $request.MaximumAutomaticRedirections = 5
        
        $response = $request.GetResponse()
        
        # Check for valid response
        if ($response.StatusCode -ne [System.Net.HttpStatusCode]::OK) {
            Write-Host "    [FAILED] Server returned: $($response.StatusCode)" -ForegroundColor Red
            $response.Close()
            return $false
        }
        
        $totalBytes = $response.ContentLength
        
        # Check if we got a reasonable file size (at least 100KB expected for installers)
        if ($totalBytes -lt 100000 -and $totalBytes -gt 0) {
            Write-Host "    [FAILED] File too small ($totalBytes bytes) - likely error page" -ForegroundColor Red
            $response.Close()
            return $false
        }
        
        $responseStream = $response.GetResponseStream()
        $responseStream.ReadTimeout = 30000  # 30 second read timeout
        $fileStream = New-Object System.IO.FileStream($OutFile, [System.IO.FileMode]::Create)
        
        $buffer = New-Object byte[] 65536
        $bytesRead = 0
        $totalBytesRead = 0
        $lastPercent = -1
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        Write-Host "    Downloading: [" -NoNewline -ForegroundColor DarkGray
        $progressWidth = 30
        
        while (($bytesRead = $responseStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $fileStream.Write($buffer, 0, $bytesRead)
            $totalBytesRead += $bytesRead
            
            if ($totalBytes -gt 0) {
                $percent = [int](($totalBytesRead / $totalBytes) * 100)
                $filledWidth = [int](($percent / 100) * $progressWidth)
                
                # Only update every 5% to reduce flicker
                if ($percent -ge ($lastPercent + 5) -or $percent -eq 100) {
                    $filled = "=" * $filledWidth
                    $empty = " " * ($progressWidth - $filledWidth)
                    $speed = if ($stopwatch.Elapsed.TotalSeconds -gt 0) { 
                        [math]::Round($totalBytesRead / 1MB / $stopwatch.Elapsed.TotalSeconds, 1) 
                    } else { 0 }
                    
                    # Move cursor back and rewrite
                    Write-Host "`r    Downloading: [$filled$empty] $percent% ($speed MB/s)  " -NoNewline -ForegroundColor DarkGray
                    $lastPercent = $percent
                }
            }
        }
        
        $fileStream.Close()
        $responseStream.Close()
        $response.Close()
        
        $finalSize = [math]::Round($totalBytesRead / 1MB, 1)
        Write-Host "`r    Downloading: [" -NoNewline -ForegroundColor DarkGray
        Write-Host ("=" * $progressWidth) -NoNewline -ForegroundColor Green
        Write-Host "] 100% ($finalSize MB)    " -ForegroundColor Green
        
        return $true
    } catch {
        Write-Host ""
        Write-Host "    [FAILED] Download error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-AppInstalled {
    param (
        [Parameter(Mandatory=$true)]
        [string]$AppKey
    )
    
    $app = $AppInstallers[$AppKey]
    if (-not $app) { return $false }
    
    # Special handling for Discord (uses Update.exe as launcher)
    if ($AppKey -eq "Discord") {
        # Discord uses Update.exe --processStart Discord.exe
        # Update.exe is the launcher that starts Discord.exe from app-* folders
        $discordUpdate = "${env:LOCALAPPDATA}\Discord\Update.exe"
        if (Test-Path $discordUpdate) {
            return $true
        }
        return $false
    }
    
    # Check single ExePath or array of ExePaths
    $pathsToCheck = if ($app.ExePaths) { $app.ExePaths } else { @($app.ExePath) }
    
    foreach ($path in $pathsToCheck) {
        if (Test-Path $path) {
            return $true
        }
    }
    return $false
}

function Install-App {
    param (
        [Parameter(Mandatory=$true)]
        [string]$AppKey
    )
    
    $app = $AppInstallers[$AppKey]
    if (-not $app) {
        Write-Host "    [ERROR] Unknown app: $AppKey" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    Write-Host "  ► " -NoNewline -ForegroundColor Cyan
    Write-Host $app.Name -ForegroundColor White
    
    # Check if already installed (supports multiple paths)
    if (Test-AppInstalled -AppKey $AppKey) {
        Write-Host "    [SKIPPED] Already installed" -ForegroundColor Yellow
        return $true
    }
    
    # Download installer with progress
    $tempFile = "$env:TEMP\$AppKey`_installer.exe"
    
    # Remove old installer if exists
    if (Test-Path $tempFile) {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
    
    # Handle multiple URLs (fallback support)
    $downloadSuccess = $false
    $urlList = if ($app.URLs) { $app.URLs } else { @($app.URL) }
    
    foreach ($url in $urlList) {
        $downloadSuccess = Show-DownloadProgress -Url $url -OutFile $tempFile -AppName $app.Name
        if ($downloadSuccess -and (Test-Path $tempFile)) {
            # Validate the downloaded file is actually an executable
            $fileSize = (Get-Item $tempFile).Length
            $fileHeader = [System.IO.File]::ReadAllBytes($tempFile)[0..1]
            
            # Check for MZ header (Windows executable) and minimum size
            if ($fileHeader[0] -eq 0x4D -and $fileHeader[1] -eq 0x5A -and $fileSize -gt 100000) {
                break  # Valid executable
            } else {
                Write-Host "    [WARNING] Downloaded file appears invalid (may be HTML error page)" -ForegroundColor Yellow
                Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
                $downloadSuccess = $false
            }
        }
        if (-not $downloadSuccess) {
            Write-Host "    Trying alternate download source..." -ForegroundColor Yellow
        }
    }
    
    if (-not $downloadSuccess -or -not (Test-Path $tempFile)) {
        Write-Host "    [FAILED] Download failed - could not get valid installer" -ForegroundColor Red
        return $false
    }
    
    # Run installer with timeout and spinner
    Write-Host "    Installing: " -NoNewline -ForegroundColor DarkGray
    
    $spinChars = @('|', '/', '-', '\')
    $spinIndex = 0
    $timeout = 300 # 5 minute timeout
    $elapsed = 0
    
    try {
        # Start installer process (non-blocking)
        $process = Start-Process -FilePath $tempFile -ArgumentList $app.Args -PassThru
        
        # Wait with spinner animation
        while (-not $process.HasExited -and $elapsed -lt $timeout) {
            Write-Host "`r    Installing: $($spinChars[$spinIndex]) Please wait... ($elapsed sec)   " -NoNewline -ForegroundColor DarkGray
            $spinIndex = ($spinIndex + 1) % 4
            Start-Sleep -Milliseconds 500
            $elapsed += 0.5
        }
        
        if (-not $process.HasExited) {
            # Timeout - try to kill and continue
            Write-Host "`r    Installing: Timeout reached, continuing...              " -ForegroundColor Yellow
            try { $process.Kill() } catch { }
        }
        
        # Wait a moment for installation to finalize
        # Discord needs extra time to extract to versioned folders
        $waitTime = if ($AppKey -eq "Discord") { 5 } else { 2 }
        Start-Sleep -Seconds $waitTime
        
        # Clean up installer
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        
        # Check if installed (supports multiple paths)
        if (Test-AppInstalled -AppKey $AppKey) {
            Write-Host "`r    Installing: " -NoNewline -ForegroundColor DarkGray
            Write-Host "[SUCCESS]" -NoNewline -ForegroundColor Green
            Write-Host " Completed in $([int]$elapsed) seconds        " -ForegroundColor DarkGray
            return $true
        } else {
            # Some apps install elsewhere or need a moment (Discord especially)
            $retryWait = if ($AppKey -eq "Discord") { 5 } else { 3 }
            Start-Sleep -Seconds $retryWait
            if (Test-AppInstalled -AppKey $AppKey) {
                Write-Host "`r    Installing: " -NoNewline -ForegroundColor DarkGray
                Write-Host "[SUCCESS]" -NoNewline -ForegroundColor Green
                Write-Host " Completed                          " -ForegroundColor DarkGray
                return $true
            }
            Write-Host "`r    Installing: " -NoNewline -ForegroundColor DarkGray
            Write-Host "[SUCCESS]" -NoNewline -ForegroundColor Green
            Write-Host " (verify path manually)              " -ForegroundColor DarkGray
            return $true
        }
    } catch {
        Write-Host "`r    Installing: [FAILED] $_                                  " -ForegroundColor Red
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        return $false
    }
}

function Show-AppStatus {
    param (
        [Parameter(Mandatory=$true)]
        [string[]]$AppKeys
    )
    
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  PREFLIGHT CHECK                                    │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    
    $toInstall = @()
    $alreadyInstalled = @()
    
    foreach ($key in $AppKeys) {
        $app = $AppInstallers[$key]
        if ($app) {
            $isInstalled = Test-AppInstalled -AppKey $key
            $status = if ($isInstalled) { 
                $alreadyInstalled += $key
                "[INSTALLED]"
            } else { 
                $toInstall += $key
                "[MISSING]  "
            }
            $color = if ($isInstalled) { "Green" } else { "Yellow" }
            Write-Host "  │  " -NoNewline -ForegroundColor DarkGray
            Write-Host $status -NoNewline -ForegroundColor $color
            Write-Host " $($app.Name)" -NoNewline -ForegroundColor White
            # Pad to align the box
            $padding = 36 - $app.Name.Length
            Write-Host (" " * [Math]::Max(1, $padding)) -NoNewline
            Write-Host "│" -ForegroundColor DarkGray
        }
    }
    
    Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    if ($alreadyInstalled.Count -gt 0) {
        Write-Host "  Already installed: " -NoNewline -ForegroundColor DarkGray
        Write-Host "$($alreadyInstalled.Count)" -ForegroundColor Green -NoNewline
        Write-Host " apps will be skipped" -ForegroundColor DarkGray
    }
    if ($toInstall.Count -gt 0) {
        Write-Host "  To be installed: " -NoNewline -ForegroundColor DarkGray
        Write-Host "$($toInstall.Count)" -ForegroundColor Yellow -NoNewline
        Write-Host " apps" -ForegroundColor DarkGray
    }
    Write-Host ""
    
    return $toInstall
}

function Install-EssentialApps {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║   Essential Applications                              ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Browser selection
    Write-Host ""
    Write-Host "  Browser Selection:" -ForegroundColor White
    Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  " -NoNewline -ForegroundColor DarkGray
    Write-Host "c" -ForegroundColor Cyan -NoNewline
    Write-Host " = Chrome" -ForegroundColor White
    Write-Host "  │  " -NoNewline -ForegroundColor DarkGray
    Write-Host "f" -ForegroundColor Cyan -NoNewline
    Write-Host " = Firefox" -ForegroundColor White
    Write-Host "  │  " -NoNewline -ForegroundColor DarkGray
    Write-Host "b" -ForegroundColor Cyan -NoNewline
    Write-Host " = Both" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    $browserChoice = Read-Host "  Select browser (c/f/b)"
    $installChrome = ($browserChoice -eq 'c' -or $browserChoice -eq 'C' -or $browserChoice -eq 'b' -or $browserChoice -eq 'B')
    $installFirefox = ($browserChoice -eq 'f' -or $browserChoice -eq 'F' -or $browserChoice -eq 'b' -or $browserChoice -eq 'B')
    
    # Preflight check for browsers and VS Code
    $browserKeys = @()
    if ($installChrome) { $browserKeys += "Chrome" }
    if ($installFirefox) { $browserKeys += "Firefox" }
    $allKeys = $browserKeys + @("VSCode")
    
    $toInstall = Show-AppStatus -AppKeys $allKeys
    
    if ($toInstall.Count -eq 0) {
        Write-Host "  All essential apps are already installed!" -ForegroundColor Green
        return
    }
    
    $success = 0
    $total = $toInstall.Count
    
    # Install browsers
    if ($installChrome -and "Chrome" -in $toInstall) {
        if (Install-App -AppKey "Chrome") { $success++ }
    }
    if ($installFirefox -and "Firefox" -in $toInstall) {
        if (Install-App -AppKey "Firefox") { $success++ }
    }
    
    # Install VS Code
    if ("VSCode" -in $toInstall) {
        if (Install-App -AppKey "VSCode") { $success++ }
    }
    
    Write-Host ""
    Write-Host "  ────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Essential apps: " -NoNewline
    Write-Host "$success/$total completed" -ForegroundColor $(if ($success -eq $total) { "Green" } else { "Yellow" })
}

function Install-OptionalApps {
    param([switch]$NoPrompt)
    
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║   Optional Applications                               ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Preflight check
    $toInstall = Show-AppStatus -AppKeys @("NvidiaApp", "Steam", "VLC", "Discord")
    
    if ($toInstall.Count -eq 0) {
        Write-Host "  All optional apps are already installed!" -ForegroundColor Green
        return
    }
    
    $success = 0
    $attempted = 0
    
    if ($NoPrompt) {
        $attempted = $toInstall.Count
        if (Install-App -AppKey "NvidiaApp") { $success++ }
        if (Install-App -AppKey "Steam") { $success++ }
        if (Install-App -AppKey "VLC") { $success++ }
        if (Install-App -AppKey "Discord") { $success++ }
    } else {
        if (Confirm-Action "  Install NVIDIA App (GPU drivers & settings)?") { 
            $attempted++
            if (Install-App -AppKey "NvidiaApp") { $success++ }
        }
        if (Confirm-Action "  Install Steam (Gaming platform)?") { 
            $attempted++
            if (Install-App -AppKey "Steam") { $success++ }
        }
        if (Confirm-Action "  Install VLC Media Player?") { 
            $attempted++
            if (Install-App -AppKey "VLC") { $success++ }
        }
        if (Confirm-Action "  Install Discord?") { 
            $attempted++
            if (Install-App -AppKey "Discord") { $success++ }
        }
    }
    
    Write-Host ""
    Write-Host "  ────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    if ($attempted -gt 0) {
        Write-Host "  Optional apps: " -NoNewline
        Write-Host "$success/$attempted completed" -ForegroundColor $(if ($success -eq $attempted) { "Green" } else { "Yellow" })
    } else {
        Write-Host "  No optional apps selected." -ForegroundColor DarkGray
    }
}

# ==========================================
# PHASE 4: INTERACTIVE MENU LOOP
# ==========================================

function Show-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                               ║" -ForegroundColor Cyan
    Write-Host "  ║   " -ForegroundColor Cyan -NoNewline
    Write-Host "WINDOWS 11 DE-BLOAT & SETUP AUTOMATION" -ForegroundColor White -NoNewline
    Write-Host "                  ║" -ForegroundColor Cyan
    Write-Host "  ║   " -ForegroundColor Cyan -NoNewline
    Write-Host "by sullivan1337" -ForegroundColor DarkGray -NoNewline
    Write-Host "                                            ║" -ForegroundColor Cyan
    Write-Host "  ║                                                               ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Confirm-Action {
    param([string]$Message)
    $confirm = Read-Host "$Message (y/n)"
    return ($confirm -eq 'y' -or $confirm -eq 'Y')
}

Do {
    Clear-Host
    Show-Banner
    
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "REMOVAL OPTIONS" -ForegroundColor Yellow -NoNewline
    Write-Host "                                              │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "1" -ForegroundColor Cyan -NoNewline
    Write-Host ". Remove Microsoft Bloat (Bing, Copilot, Teams, etc.)    │" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "2" -ForegroundColor Cyan -NoNewline
    Write-Host ". Remove Third-Party Apps (Social, Games, Streaming)    │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "CUSTOMIZATION" -ForegroundColor Yellow -NoNewline
    Write-Host "                                                │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "3" -ForegroundColor Cyan -NoNewline
    Write-Host ". Customize UI (Taskbar & Explorer)                    │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "INSTALLATION" -ForegroundColor Yellow -NoNewline
    Write-Host "                                                 │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "4" -ForegroundColor Cyan -NoNewline
    Write-Host ". Install Essential Apps (Browser, VS Code)              │" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "5" -ForegroundColor Cyan -NoNewline
    Write-Host ". Install Optional Apps (NVIDIA, Steam, VLC, Discord)   │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "QUICK START" -ForegroundColor Green -NoNewline
    Write-Host "                                                  │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "6" -ForegroundColor Magenta -NoNewline
    Write-Host ". Remove & Customize All (Options 1-3)                  │" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "7" -ForegroundColor Magenta -NoNewline
    Write-Host ". Install All Apps (Options 4+5)                        │" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "8" -ForegroundColor Green -NoNewline
    Write-Host ". " -ForegroundColor White -NoNewline
    Write-Host "RUN EVERYTHING" -ForegroundColor Green -NoNewline
    Write-Host " - Fresh Install (Recommended)       │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  " -NoNewline
    Write-Host "Q" -ForegroundColor Red -NoNewline
    Write-Host ". Quit" -ForegroundColor White
    Write-Host ""
    
    $Choice = Read-Host "  Select an option"

    Switch ($Choice) {
        "1" { 
            Write-Host ""
            if (Confirm-Action "  Remove $($MicrosoftBloat.Count) Microsoft bloatware apps?") {
                Remove-PackageList -PackageList $MicrosoftBloat -Category "Microsoft Core Apps"
            } else {
                Write-Host "  Operation cancelled." -ForegroundColor Yellow
            }
            Pause 
        }
        "2" { 
            Write-Host ""
            if (Confirm-Action "  Remove $($ThirdPartyBloat.Count) third-party bloatware apps?") {
                Remove-PackageList -PackageList $ThirdPartyBloat -Category "Third-Party Apps"
            } else {
                Write-Host "  Operation cancelled." -ForegroundColor Yellow
            }
            Pause 
        }
        "3" { 
            Write-Host ""
            Configure-UI
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Pause 
        }
        "4" { 
            Install-EssentialApps
            Pause 
        }
        "5" {
            Install-OptionalApps
            Pause
        }
        "6" {
            # REMOVE & CUSTOMIZE ALL (Options 1-3)
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
            Write-Host "  ║   REMOVE & CUSTOMIZE ALL                              ║" -ForegroundColor Magenta
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
            Write-Host ""
            
            if (-not (Confirm-Action "  This will remove bloatware and customize UI. Continue?")) {
                Write-Host "  Operation cancelled." -ForegroundColor Yellow
                Pause
                continue
            }
            
            Write-Host "`n  [STEP 1/3] Removing Microsoft Bloatware..." -ForegroundColor Magenta
            Remove-PackageList -PackageList $MicrosoftBloat -Category "Microsoft Core Apps"
            
            Write-Host "`n  [STEP 2/3] Removing Third-Party Bloatware..." -ForegroundColor Magenta
            Remove-PackageList -PackageList $ThirdPartyBloat -Category "Third-Party Apps"
            
            Write-Host "`n  [STEP 3/3] Configuring UI (Taskbar & Explorer)..." -ForegroundColor Magenta
            Configure-UI
            
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   CLEANUP COMPLETE! System is now de-bloated.         ║" -ForegroundColor Green
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
            Pause
        }
        "7" {
            # INSTALL ALL APPS (Options 4+5)
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
            Write-Host "  ║   INSTALL ALL APPS (Essential + Optional)             ║" -ForegroundColor Magenta
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
            Write-Host ""
            
            if (-not (Confirm-Action "  Install browser (selectable), VS Code, Steam, VLC, Discord, NVIDIA App?")) {
                Write-Host "  Operation cancelled." -ForegroundColor Yellow
                Pause
                continue
            }
            
            Write-Host "`n  [STEP 1/2] Installing Essential Apps..." -ForegroundColor Magenta
            Install-EssentialApps
            
            Write-Host "`n  [STEP 2/2] Installing Optional Apps..." -ForegroundColor Magenta
            Install-OptionalApps -NoPrompt
            
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   ALL APPS INSTALLED!                                 ║" -ForegroundColor Green
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
            Pause
        }
        "8" {
            # RUN EVERYTHING - Fresh Install Mode
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   FRESH INSTALL MODE - Running Everything             ║" -ForegroundColor Green
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
            Write-Host ""
            
            if (-not (Confirm-Action "  This will: remove bloatware, customize UI, install apps. Continue?")) {
                Write-Host "  Operation cancelled." -ForegroundColor Yellow
                Pause
                continue
            }
            
            # Step 1: Remove Microsoft Bloat
            Write-Host "`n  [STEP 1/5] Removing Microsoft Bloatware..." -ForegroundColor Magenta
            Remove-PackageList -PackageList $MicrosoftBloat -Category "Microsoft Core Apps"
            
            # Step 2: Remove Third-Party Bloat
            Write-Host "`n  [STEP 2/5] Removing Third-Party Bloatware..." -ForegroundColor Magenta
            Remove-PackageList -PackageList $ThirdPartyBloat -Category "Third-Party Apps"
            
            # Step 3: Configure UI (Taskbar & Explorer)
            Write-Host "`n  [STEP 3/5] Configuring UI (Taskbar & Explorer)..." -ForegroundColor Magenta
            Configure-UI
            
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            
            # Step 4: Install Essential Apps
            Write-Host "`n  [STEP 4/5] Installing Essential Applications..." -ForegroundColor Magenta
            Install-EssentialApps
            
            # Step 5: Optional Apps
            Write-Host "`n  [STEP 5/5] Optional Applications" -ForegroundColor Magenta
            if (Confirm-Action "`n  Install optional apps (NVIDIA App, Steam, VLC, Discord)?") {
                Install-OptionalApps -NoPrompt
            }
            
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   ALL OPERATIONS COMPLETE!                            ║" -ForegroundColor Green
            Write-Host "  ║   Your Windows 11 installation has been optimized.    ║" -ForegroundColor Green
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
            Pause
        }
        "Q" { 
            Write-Host ""
            Write-Host "  Goodbye! Your Windows is cleaner now." -ForegroundColor Cyan
            Write-Host ""
            Exit 
        }
        "q" { 
            Write-Host ""
            Write-Host "  Goodbye! Your Windows is cleaner now." -ForegroundColor Cyan
            Write-Host ""
            Exit 
        }
        Default { 
            Write-Host ""
            Write-Host "  Invalid selection. Please choose 1-8 or Q to quit." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} Until ($Choice -eq "Q" -or $Choice -eq "q")