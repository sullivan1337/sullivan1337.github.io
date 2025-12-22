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
    Hosting: Host raw file on GitHub.
    Execution: irm <RawURL> | iex
    Privileges: Requires Administrator (Self-elevating)
#>

# ==========================================
# PHASE 1: PRE-FLIGHT CHECKS & ELEVATION
# ==========================================
$CurrentPrincipal =::GetCurrent()
if (!($CurrentPrincipal.IsInRole("Administrator"))) {
    Write-Host "Elevation Required. Restarting as Administrator..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    Exit
}

# ==========================================
# PHASE 2: DATA DEFINITIONS (THE KILL LIST)
# ==========================================

# 2.1 Microsoft Ecosystem (Bing, Copilot, Legacy)
$MicrosoftBloat = @(
    "Microsoft.3DBuilder",
    "Microsoft.549981C3F5F10", # Cortana
    "Microsoft.BingFinance",
    "Microsoft.BingFoodAndDrink",
    "Microsoft.BingHealthAndFitness",
    "Microsoft.BingNews",
    "Microsoft.BingSports",
    "Microsoft.BingTranslator",
    "Microsoft.BingTravel",
    "Microsoft.BingWeather",
    "Microsoft.Copilot",
    "Microsoft.Windows.Ai.Copilot.Provider", # Deep Copilot Integration
    "Microsoft.Messaging",
    "Microsoft.MicrosoftJournal",
    "Microsoft.MicrosoftOfficeHub",
    "Microsoft.MicrosoftPowerBIForWindows",
    "Microsoft.MicrosoftSolitaireCollection",
    "Microsoft.MixedReality.Portal",
    "Microsoft.News",
    "Microsoft.Office.Sway",
    "Microsoft.OneConnect",
    "Microsoft.PowerAutomateDesktop",
    "Microsoft.SkypeApp",
    "Microsoft.Todos",
    "Microsoft.Windows.DevHome",
    "Microsoft.WindowsFeedbackHub",
    "Microsoft.WindowsMaps",
    "Microsoft.ZuneVideo", # Movies & TV
    "MicrosoftCorporationII.MicrosoftFamily",
    "MicrosoftTeams", # Personal Teams (Chat)
    "MSTeams" # Work Teams
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
        [string]$List,
        [string]$Category
    )
    Write-Host "`n--- Processing Removal: $Category ---" -ForegroundColor Cyan
    foreach ($Item in $List) {
        $PackageName = "*$Item*"
        Write-Host "Targeting: $Item" -NoNewline
        
        # 1. Remove Provisioned Package (System Image)
        # Prevents app from installing for new users
        $Prov = Get-AppxProvisionedPackage -Online | Where-Object {$_.PackageName -like $PackageName}
        if ($Prov) {
            Remove-AppxProvisionedPackage -Online -PackageName $Prov.PackageName -ErrorAction SilentlyContinue | Out-Null
            Write-Host "" -NoNewline -ForegroundColor Yellow
        }
        
        # 2. Remove Installed Package (Current User)
        $Inst = Get-AppxPackage -Name $PackageName
        if ($Inst) {
            $Inst | Remove-AppxPackage -ErrorAction SilentlyContinue | Out-Null
            Write-Host " [Uninstalled]" -NoNewline -ForegroundColor Green
        } else {
            Write-Host " [Not Found/Already Gone]" -NoNewline -ForegroundColor DarkGray
        }
        Write-Host "" 
    }
}

function Configure-Taskbar {
    Write-Host "`n--- Configuring Taskbar Preferences ---" -ForegroundColor Cyan
    
    $AdvancedKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
    
    # Hide Search Box (0 = Hidden)
    Write-Host "Hiding Search Box..."
    Set-ItemProperty -Path $AdvancedKey -Name "SearchboxTaskbarMode" -Value 0 -Force
    
    # Hide Task View (0 = Hidden)
    Write-Host "Hiding Task View..."
    Set-ItemProperty -Path $AdvancedKey -Name "ShowTaskViewButton" -Value 0 -Force
    
    # Hide Meet Now / Chat (Requires Policy Key)
    Write-Host "Hiding Meet Now (Chat)..."
    $ChatPolicy = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Chat"
    if (!(Test-Path $ChatPolicy)) { New-Item -Path $ChatPolicy -Force | Out-Null }
    Set-ItemProperty -Path $ChatPolicy -Name "ChatIcon" -Value 3 -Force
    
    Write-Host "Configuration staged. Explorer restart required." -ForegroundColor Yellow
}

function Install-WingetApp {
    param (
        [string]$Id,
        [string]$Name
    )
    Write-Host "Installing $Name..." -ForegroundColor Cyan
    # Use --accept-source-agreements to bypass Store EULA prompts
    # Use --accept-package-agreements to bypass App EULA prompts
    winget install --id $Id -e --silent --accept-source-agreements --accept-package-agreements
}

# ==========================================
# PHASE 4: INTERACTIVE MENU LOOP
# ==========================================

Do {
    Clear-Host
    Write-Host "===================================================" -ForegroundColor Magenta
    Write-Host "   WINDOWS 11 DE-BLOAT & SETUP AUTOMATION   " -ForegroundColor White
    Write-Host "===================================================" -ForegroundColor Magenta
    Write-Host "1. Remove Microsoft Apps (Bing, Copilot, DevHome, Teams)"
    Write-Host "2. Remove Third-Party Apps (Social, Gaming, Streaming)"
    Write-Host "3. [UI] Customize Taskbar (Hide Search, Chat, Task View)"
    Write-Host "4. [Install] Essential Tools (Chrome, VS Code)"
    Write-Host "5. [Install] Optional Media & Gaming (Steam, VLC, Discord, Nvidia App)"
    Write-Host "6. Run ALL Steps (Fresh Install Mode)"
    Write-Host "Q. Quit"
    Write-Host "===================================================" -ForegroundColor Magenta
    
    $Choice = Read-Host "Select an option"

    Switch ($Choice) {
        "1" { Remove-PackageList -List $MicrosoftBloat -Category "Microsoft Core Apps"; Pause }
        "2" { Remove-PackageList -List $ThirdPartyBloat -Category "Third-Party Apps"; Pause }
        "3" { Configure-Taskbar; Stop-Process -Name explorer -Force; Pause }
        "4" { 
            Install-WingetApp -Id "Google.Chrome" -Name "Google Chrome"
            Install-WingetApp -Id "Microsoft.VisualStudioCode" -Name "VS Code"
            Pause 
        }
        "5" {
            # Sub-menu for Optional Apps
            $InNvidia = Read-Host "Install Nvidia App (Beta)? (y/n)"
            if ($InNvidia -eq 'y') { Install-WingetApp -Id "Nvidia.App" -Name "Nvidia App" }
            
            $InSteam = Read-Host "Install Steam? (y/n)"
            if ($InSteam -eq 'y') { Install-WingetApp -Id "Valve.Steam" -Name "Steam" }
            
            $InVLC = Read-Host "Install VLC? (y/n)"
            if ($InVLC -eq 'y') { Install-WingetApp -Id "VideoLAN.VLC" -Name "VLC" }
            
            $InDiscord = Read-Host "Install Discord? (y/n)"
            if ($InDiscord -eq 'y') { Install-WingetApp -Id "Discord.Discord" -Name "Discord" }
            Pause
        }
        "6" {
            # The "One Click" Flow
            Remove-PackageList -List $MicrosoftBloat -Category "Microsoft Core Apps"
            Remove-PackageList -List $ThirdPartyBloat -Category "Third-Party Apps"
            Configure-Taskbar
            Stop-Process -Name explorer -Force
            Start-Sleep -Seconds 2 # Wait for shell to reload
            
            Install-WingetApp -Id "Google.Chrome" -Name "Google Chrome"
            Install-WingetApp -Id "Microsoft.VisualStudioCode" -Name "VS Code"
            
            Write-Host "`n--- Optional App Installation ---"
            $AutoOpt = Read-Host "Install Optional Apps (Nvidia/Steam/VLC/Discord)? (y/n)"
            if ($AutoOpt -eq 'y') {
                Install-WingetApp -Id "Nvidia.App" -Name "Nvidia App"
                Install-WingetApp -Id "Valve.Steam" -Name "Steam"
                Install-WingetApp -Id "VideoLAN.VLC" -Name "VLC"
                Install-WingetApp -Id "Discord.Discord" -Name "Discord"
            }
            Write-Host "`nOperation Complete." -ForegroundColor Green
            Pause
        }
        "Q" { Write-Host "Exiting..."; Exit }
        Default { Write-Host "Invalid Selection" -ForegroundColor Red; Pause }
    }
} Until ($Choice -eq "Q")