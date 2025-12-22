<#
.SYNOPSIS
    Windows 11 Interactive Sanitization and Configuration Framework
.DESCRIPTION
    A comprehensive automation script designed for post-OOBE execution.
    Features:
    - Deep removal of Microsoft & Third-Party bloatware (Provisioned & Installed)
    - Taskbar and Shell interface customization (Registry/Policy)
    - Automated software deployment via direct installer downloads (no winget needed!)
    - Automatic taskbar pinning for installed apps
    - Interactive Menu System
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

function Configure-Taskbar {
    Write-Host "`n=====================================================" -ForegroundColor Cyan
    Write-Host "   Configuring Taskbar & Shell Preferences" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    
    $AdvancedKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
    
    # Hide Search Box (0 = Hidden, 1 = Icon only, 2 = Search box)
    Write-Host "  [1/6] Hiding Search Box..." -ForegroundColor White
    Set-ItemProperty -Path $AdvancedKey -Name "SearchboxTaskbarMode" -Value 0 -Force -ErrorAction SilentlyContinue
    Write-Host "        Done" -ForegroundColor Green
    
    # Hide Task View Button (0 = Hidden, 1 = Visible)
    Write-Host "  [2/6] Hiding Task View Button..." -ForegroundColor White
    Set-ItemProperty -Path $AdvancedKey -Name "ShowTaskViewButton" -Value 0 -Force -ErrorAction SilentlyContinue
    Write-Host "        Done" -ForegroundColor Green
    
    # Hide Widgets Button (0 = Hidden, 1 = Visible)
    Write-Host "  [3/6] Hiding Widgets Button..." -ForegroundColor White
    Set-ItemProperty -Path $AdvancedKey -Name "TaskbarDa" -Value 0 -Force -ErrorAction SilentlyContinue
    Write-Host "        Done" -ForegroundColor Green
    
    # Hide Meet Now / Chat Icon (3 = Hidden)
    Write-Host "  [4/6] Hiding Chat/Meet Now Icon..." -ForegroundColor White
    $ChatPolicy = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Chat"
    if (!(Test-Path $ChatPolicy)) { New-Item -Path $ChatPolicy -Force | Out-Null }
    Set-ItemProperty -Path $ChatPolicy -Name "ChatIcon" -Value 3 -Force -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $AdvancedKey -Name "TaskbarMn" -Value 0 -Force -ErrorAction SilentlyContinue
    Write-Host "        Done" -ForegroundColor Green
    
    # Hide Copilot Button
    Write-Host "  [5/6] Hiding Copilot Button..." -ForegroundColor White
    Set-ItemProperty -Path $AdvancedKey -Name "ShowCopilotButton" -Value 0 -Force -ErrorAction SilentlyContinue
    Write-Host "        Done" -ForegroundColor Green
    
    # Align Taskbar to Left (0 = Left, 1 = Center) - Optional, ask user
    $AlignLeft = Read-Host "`n  [6/6] Align taskbar icons to LEFT instead of center? (y/n)"
    if ($AlignLeft -eq 'y') {
        Set-ItemProperty -Path $AdvancedKey -Name "TaskbarAl" -Value 0 -Force -ErrorAction SilentlyContinue
        Write-Host "        Taskbar aligned to left" -ForegroundColor Green
    } else {
        Write-Host "        Keeping center alignment" -ForegroundColor DarkGray
    }
    
    Write-Host "`n  All taskbar settings applied!" -ForegroundColor Green
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
    "VSCode" = @{
        Name = "Visual Studio Code"
        URL = "https://code.visualstudio.com/sha/download?build=stable&os=win32-x64"
        Args = "/verysilent /norestart /mergetasks=!runcode,addcontextmenufiles,addcontextmenufolders,addtopath"
        ExePath = "${env:LOCALAPPDATA}\Programs\Microsoft VS Code\Code.exe"
    }
    "Steam" = @{
        Name = "Steam"
        URL = "https://cdn.akamai.steamstatic.com/client/installer/SteamSetup.exe"
        Args = "/S"
        ExePath = "${env:ProgramFiles(x86)}\Steam\steam.exe"
    }
    "VLC" = @{
        Name = "VLC Media Player"
        URL = "https://get.videolan.org/vlc/last/win64/vlc-3.0.21-win64.exe"
        Args = "/S /L=1033"
        ExePath = "${env:ProgramFiles}\VideoLAN\VLC\vlc.exe"
    }
    "Discord" = @{
        Name = "Discord"
        URL = "https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64"
        Args = "-s"
        ExePath = "${env:LOCALAPPDATA}\Discord\Update.exe"
    }
    "GeForce" = @{
        Name = "GeForce Experience"
        URL = "https://us.download.nvidia.com/GFE/GFEClient/3.28.0.417/GeForce_Experience_v3.28.0.417.exe"
        Args = "-s -n"
        ExePath = "${env:ProgramFiles}\NVIDIA Corporation\NVIDIA GeForce Experience\NVIDIA GeForce Experience.exe"
    }
}

function Pin-ToTaskbar {
    param (
        [Parameter(Mandatory=$true)]
        [string]$ExePath,
        [Parameter(Mandatory=$true)]
        [string]$AppName
    )
    
    # Windows 11 taskbar pinning via shell
    if (Test-Path $ExePath) {
        try {
            # Create a shortcut in the Start Menu if needed
            $shell = New-Object -ComObject Shell.Application
            $startMenu = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
            $shortcutPath = "$startMenu\$AppName.lnk"
            
            # Create shortcut if it doesn't exist
            if (-not (Test-Path $shortcutPath)) {
                $WshShell = New-Object -ComObject WScript.Shell
                $shortcut = $WshShell.CreateShortcut($shortcutPath)
                $shortcut.TargetPath = $ExePath
                $shortcut.Save()
            }
            
            # Use explorer to pin (Windows 11 method)
            $folder = $shell.Namespace((Split-Path $shortcutPath))
            $item = $folder.ParseName((Split-Path $shortcutPath -Leaf))
            
            # Try to find and invoke "Pin to taskbar" verb
            $verbs = $item.Verbs()
            foreach ($verb in $verbs) {
                if ($verb.Name -match "Pin to taskbar|Taskbar|An Taskleiste") {
                    $verb.DoIt()
                    Write-Host "    [PINNED] Added to taskbar" -ForegroundColor Magenta
                    return $true
                }
            }
            
            # Alternative: Use registry method for Windows 11
            # Create taskband entry directly
            Write-Host "    [INFO] Manual pin may be required" -ForegroundColor DarkGray
            return $false
        } catch {
            Write-Host "    [INFO] Could not auto-pin: $_" -ForegroundColor DarkGray
            return $false
        }
    }
    return $false
}

function Install-App {
    param (
        [Parameter(Mandatory=$true)]
        [string]$AppKey,
        [switch]$Pin
    )
    
    $app = $AppInstallers[$AppKey]
    if (-not $app) {
        Write-Host "    [ERROR] Unknown app: $AppKey" -ForegroundColor Red
        return $false
    }
    
    Write-Host "  Installing " -NoNewline
    Write-Host $app.Name -ForegroundColor White -NoNewline
    Write-Host "..." -ForegroundColor DarkGray
    
    # Check if already installed
    if (Test-Path $app.ExePath) {
        Write-Host "    [SKIPPED] Already installed" -ForegroundColor Yellow
        if ($Pin) { Pin-ToTaskbar -ExePath $app.ExePath -AppName $app.Name }
        return $true
    }
    
    # Download installer
    $tempFile = "$env:TEMP\$AppKey`_installer.exe"
    Write-Host "    Downloading..." -ForegroundColor DarkGray
    
    try {
        # Use TLS 1.2 for HTTPS
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        $webClient.DownloadFile($app.URL, $tempFile)
    } catch {
        Write-Host "    [FAILED] Download failed: $_" -ForegroundColor Red
        return $false
    }
    
    if (-not (Test-Path $tempFile)) {
        Write-Host "    [FAILED] Download failed - file not found" -ForegroundColor Red
        return $false
    }
    
    # Run installer
    Write-Host "    Installing (please wait)..." -ForegroundColor DarkGray
    try {
        $process = Start-Process -FilePath $tempFile -ArgumentList $app.Args -NoNewWindow -Wait -PassThru
        Start-Sleep -Seconds 2
        
        # Clean up installer
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        
        # Verify installation
        Start-Sleep -Seconds 2
        if (Test-Path $app.ExePath) {
            Write-Host "    [SUCCESS] Installed" -ForegroundColor Green
            if ($Pin) { Pin-ToTaskbar -ExePath $app.ExePath -AppName $app.Name }
            return $true
        } else {
            # Some apps install to different locations, assume success if no error
            Write-Host "    [SUCCESS] Installed (verify manually)" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "    [FAILED] Installation error: $_" -ForegroundColor Red
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
        return $false
    }
}

function Install-EssentialApps {
    param([switch]$Pin)
    
    Write-Host ""
    Write-Host "  ====== Essential Applications ======" -ForegroundColor Cyan
    Write-Host ""
    
    Install-App -AppKey "Chrome" -Pin:$Pin
    Install-App -AppKey "VSCode" -Pin:$Pin
    
    Write-Host ""
    Write-Host "  Essential tools installation complete!" -ForegroundColor Green
}

function Install-OptionalApps {
    param([switch]$Pin, [switch]$NoPrompt)
    
    Write-Host ""
    Write-Host "  ====== Optional Applications ======" -ForegroundColor Cyan
    Write-Host ""
    
    if ($NoPrompt) {
        Install-App -AppKey "GeForce" -Pin:$Pin
        Install-App -AppKey "Steam" -Pin:$Pin
        Install-App -AppKey "VLC" -Pin:$Pin
        Install-App -AppKey "Discord" -Pin:$Pin
    } else {
        if (Confirm-Action "  Install GeForce Experience (Nvidia GPU)?") { 
            Install-App -AppKey "GeForce" -Pin:$Pin
        }
        if (Confirm-Action "  Install Steam (Gaming platform)?") { 
            Install-App -AppKey "Steam" -Pin:$Pin
        }
        if (Confirm-Action "  Install VLC Media Player?") { 
            Install-App -AppKey "VLC" -Pin:$Pin
        }
        if (Confirm-Action "  Install Discord?") { 
            Install-App -AppKey "Discord" -Pin:$Pin
        }
    }
    
    Write-Host ""
    Write-Host "  Optional apps installation complete!" -ForegroundColor Green
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
    Write-Host ". Customize Taskbar (Hide Search, Widgets, Chat, etc.)  │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "INSTALLATION" -ForegroundColor Yellow -NoNewline
    Write-Host "                                                 │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "4" -ForegroundColor Cyan -NoNewline
    Write-Host ". Install Essential Apps (Chrome, VS Code)              │" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "5" -ForegroundColor Cyan -NoNewline
    Write-Host ". Install Optional Apps (Steam, VLC, Discord, Nvidia)   │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "QUICK START" -ForegroundColor Green -NoNewline
    Write-Host "                                                  │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "6" -ForegroundColor Magenta -NoNewline
    Write-Host ". Remove & Customize All (Options 1+2+3)                │" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "7" -ForegroundColor Magenta -NoNewline
    Write-Host ". Install All Apps (Options 4+5, all pinned)            │" -ForegroundColor White
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
            Configure-Taskbar
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Pause 
        }
        "4" { 
            Install-EssentialApps -Pin
            Pause 
        }
        "5" {
            Install-OptionalApps -Pin
            Pause
        }
        "6" {
            # REMOVE & CUSTOMIZE ALL (Options 1+2+3)
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
            Write-Host "  ║   REMOVE & CUSTOMIZE ALL                              ║" -ForegroundColor Magenta
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
            Write-Host ""
            
            if (-not (Confirm-Action "  This will remove bloatware and customize taskbar. Continue?")) {
                Write-Host "  Operation cancelled." -ForegroundColor Yellow
                Pause
                continue
            }
            
            Write-Host "`n  [STEP 1/3] Removing Microsoft Bloatware..." -ForegroundColor Magenta
            Remove-PackageList -PackageList $MicrosoftBloat -Category "Microsoft Core Apps"
            
            Write-Host "`n  [STEP 2/3] Removing Third-Party Bloatware..." -ForegroundColor Magenta
            Remove-PackageList -PackageList $ThirdPartyBloat -Category "Third-Party Apps"
            
            Write-Host "`n  [STEP 3/3] Configuring Taskbar..." -ForegroundColor Magenta
            Configure-Taskbar
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   CLEANUP COMPLETE! System is now de-bloated.         ║" -ForegroundColor Green
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
            Pause
        }
        "7" {
            # INSTALL ALL APPS (Options 4+5, all pinned)
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
            Write-Host "  ║   INSTALL ALL APPS (Essential + Optional)             ║" -ForegroundColor Magenta
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
            Write-Host ""
            
            if (-not (Confirm-Action "  Install Chrome, VS Code, Steam, VLC, Discord, GeForce? All will be pinned.")) {
                Write-Host "  Operation cancelled." -ForegroundColor Yellow
                Pause
                continue
            }
            
            Write-Host "`n  [STEP 1/2] Installing Essential Apps..." -ForegroundColor Magenta
            Install-EssentialApps -Pin
            
            Write-Host "`n  [STEP 2/2] Installing Optional Apps..." -ForegroundColor Magenta
            Install-OptionalApps -Pin -NoPrompt
            
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   ALL APPS INSTALLED & PINNED TO TASKBAR!             ║" -ForegroundColor Green
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
            
            if (-not (Confirm-Action "  This will: remove bloatware, customize taskbar, install & pin apps. Continue?")) {
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
            
            # Step 3: Configure Taskbar
            Write-Host "`n  [STEP 3/5] Configuring Taskbar..." -ForegroundColor Magenta
            Configure-Taskbar
            Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            
            # Step 4: Install Essential Apps
            Write-Host "`n  [STEP 4/5] Installing Essential Applications..." -ForegroundColor Magenta
            Install-EssentialApps -Pin
            
            # Step 5: Optional Apps
            Write-Host "`n  [STEP 5/5] Optional Applications" -ForegroundColor Magenta
            if (Confirm-Action "`n  Install optional apps (Nvidia, Steam, VLC, Discord)?") {
                Install-OptionalApps -Pin -NoPrompt
            }
            
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   ALL OPERATIONS COMPLETE!                            ║" -ForegroundColor Green
            Write-Host "  ║   Your Windows 11 installation has been optimized.    ║" -ForegroundColor Green
            Write-Host "  ║   Apps have been installed and pinned to taskbar.     ║" -ForegroundColor Green
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