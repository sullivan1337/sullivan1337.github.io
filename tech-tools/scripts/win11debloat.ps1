<#
.SYNOPSIS
    Windows 11 Interactive Sanitization and Configuration Framework
.DESCRIPTION
    A comprehensive automation script designed for post-OOBE execution.
    Features:
    - Deep removal of Microsoft & Third-Party bloatware (Provisioned & Installed)
    - Taskbar and Shell interface customization (Registry/Policy)
    - Automated software deployment via Winget
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
    $SearchKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
    
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

function Test-WingetInstalled {
    try {
        $null = Get-Command winget -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Install-WingetApp {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Id,
        [Parameter(Mandatory=$true)]
        [string]$Name
    )
    
    Write-Host "  Installing " -NoNewline
    Write-Host $Name -ForegroundColor White -NoNewline
    Write-Host " ($Id)..." -ForegroundColor DarkGray
    
    # Check if winget is available
    if (-not (Test-WingetInstalled)) {
        Write-Host "    [ERROR] Winget not found. Please install App Installer from Microsoft Store." -ForegroundColor Red
        return $false
    }
    
    # Check if already installed
    $existing = winget list --id $Id --exact 2>$null
    if ($LASTEXITCODE -eq 0 -and $existing -match $Id) {
        Write-Host "    [SKIPPED] Already installed" -ForegroundColor Yellow
        return $true
    }
    
    # Install the app
    # --accept-source-agreements: bypass Store EULA prompts
    # --accept-package-agreements: bypass App EULA prompts
    # --silent: no installer UI
    $result = winget install --id $Id -e --silent --accept-source-agreements --accept-package-agreements 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [SUCCESS] Installed" -ForegroundColor Green
        return $true
    } else {
        Write-Host "    [FAILED] Installation failed (Exit code: $LASTEXITCODE)" -ForegroundColor Red
        return $false
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
    Write-Host ". Customize Taskbar (Hide Search, Widgets, Chat, etc.)  │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "INSTALLATION" -ForegroundColor Yellow -NoNewline
    Write-Host "                                                 │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "4" -ForegroundColor Cyan -NoNewline
    Write-Host ". Install Essential Tools (Chrome, VS Code)             │" -ForegroundColor White
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "5" -ForegroundColor Cyan -NoNewline
    Write-Host ". Install Optional Apps (Steam, VLC, Discord, Nvidia)   │" -ForegroundColor White
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "QUICK START" -ForegroundColor Green -NoNewline
    Write-Host "                                                  │" -ForegroundColor DarkGray
    Write-Host "  ├─────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "6" -ForegroundColor Green -NoNewline
    Write-Host ". " -ForegroundColor White -NoNewline
    Write-Host "RUN ALL" -ForegroundColor Green -NoNewline
    Write-Host " - Fresh Install Mode (Recommended)            │" -ForegroundColor White
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
            Write-Host ""
            Write-Host "  Installing Essential Tools..." -ForegroundColor Cyan
            Write-Host ""
            Install-WingetApp -Id "Google.Chrome" -Name "Google Chrome"
            Install-WingetApp -Id "Microsoft.VisualStudioCode" -Name "Visual Studio Code"
            Write-Host ""
            Write-Host "  Essential tools installation complete!" -ForegroundColor Green
            Pause 
        }
        "5" {
            Write-Host ""
            Write-Host "  ====== Optional Applications ======" -ForegroundColor Cyan
            Write-Host ""
            
            # Interactive sub-menu for optional apps
            if (Confirm-Action "  Install Nvidia App (GPU drivers & settings)?") { 
                Install-WingetApp -Id "Nvidia.GeForceExperience" -Name "Nvidia GeForce Experience"
            }
            
            if (Confirm-Action "  Install Steam (Gaming platform)?") { 
                Install-WingetApp -Id "Valve.Steam" -Name "Steam" 
            }
            
            if (Confirm-Action "  Install VLC Media Player?") { 
                Install-WingetApp -Id "VideoLAN.VLC" -Name "VLC Media Player" 
            }
            
            if (Confirm-Action "  Install Discord?") { 
                Install-WingetApp -Id "Discord.Discord" -Name "Discord" 
            }
            
            Write-Host ""
            Write-Host "  Optional apps installation complete!" -ForegroundColor Green
            Pause
        }
        "6" {
            Write-Host ""
            Write-Host "  ╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "  ║   FRESH INSTALL MODE - Running All Steps              ║" -ForegroundColor Green
            Write-Host "  ╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
            Write-Host ""
            
            if (-not (Confirm-Action "  This will remove bloatware, configure taskbar, and install apps. Continue?")) {
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
            Start-Sleep -Seconds 3 # Wait for shell to reload
            
            # Step 4: Install Essential Apps
            Write-Host "`n  [STEP 4/5] Installing Essential Applications..." -ForegroundColor Magenta
            Write-Host ""
            Install-WingetApp -Id "Google.Chrome" -Name "Google Chrome"
            Install-WingetApp -Id "Microsoft.VisualStudioCode" -Name "Visual Studio Code"
            
            # Step 5: Optional Apps
            Write-Host "`n  [STEP 5/5] Optional Applications" -ForegroundColor Magenta
            if (Confirm-Action "`n  Install optional apps (Nvidia, Steam, VLC, Discord)?") {
                Write-Host ""
                Install-WingetApp -Id "Nvidia.GeForceExperience" -Name "Nvidia GeForce Experience"
                Install-WingetApp -Id "Valve.Steam" -Name "Steam"
                Install-WingetApp -Id "VideoLAN.VLC" -Name "VLC Media Player"
                Install-WingetApp -Id "Discord.Discord" -Name "Discord"
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
            Write-Host "  Invalid selection. Please choose 1-6 or Q to quit." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} Until ($Choice -eq "Q" -or $Choice -eq "q")