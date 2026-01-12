<#
.SYNOPSIS
    Kill process(es) using a specific port.

.DESCRIPTION
    This script identifies and terminates process(es) that are listening on or 
    connected to a specified port. It provides detailed information about the 
    process before termination and requires confirmation unless -Force is used.

.PARAMETER Port
    The port number to check (1-65535).

.PARAMETER Force
    Skip confirmation prompt and kill the process immediately.

.PARAMETER Protocol
    Protocol to check. Valid values: TCP (default), UDP.

.EXAMPLE
    .\Kill-Port.ps1 -Port 8080
    Find and kill process using port 8080 with confirmation.

.EXAMPLE
    .\Kill-Port.ps1 -Port 8080 -Force
    Kill process using port 8080 without confirmation.

.EXAMPLE
    .\Kill-Port.ps1 -Port 53 -Protocol UDP
    Kill process using UDP port 53.

.NOTES
    Author: System Administrator
    Version: 2.0
    Requires: Administrator privileges for some processes
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateRange(1, 65535)]
    [int]$Port,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [ValidateSet("TCP", "UDP")]
    [string]$Protocol = "TCP"
)

# Requires elevation check
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Format output with colors
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    switch ($Type) {
        "Success" { Write-Host "✓ $Message" -ForegroundColor Green }
        "Error" { Write-Host "✗ $Message" -ForegroundColor Red }
        "Warning" { Write-Host "⚠ $Message" -ForegroundColor Yellow }
        "Info" { Write-Host "ℹ $Message" -ForegroundColor Cyan }
        default { Write-Host $Message }
    }
}

# Main execution
try {
    Write-ColorOutput "Checking $Protocol port $Port..." -Type "Info"
    
    # Get connections based on protocol
    $connections = @()
    if ($Protocol -eq "TCP") {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    }
    else {
        $connections = Get-NetUDPEndpoint -LocalPort $Port -ErrorAction SilentlyContinue
    }

    if (-not $connections) {
        Write-ColorOutput "No process found using $Protocol port $Port" -Type "Warning"
        exit 0
    }

    # Get unique process IDs
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "Found $($processIds.Count) process(es) using $Protocol port $Port" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    # Collect process information
    $processInfo = @()
    foreach ($processId in $processIds) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            
            # Get connection details
            $connDetails = $connections | Where-Object { $_.OwningProcess -eq $processId }
            
            $info = [PSCustomObject]@{
                PID         = $process.Id
                Name        = $process.Name
                Path        = $process.Path
                StartTime   = $process.StartTime
                CPU         = [math]::Round($process.CPU, 2)
                Memory      = [math]::Round($process.WorkingSet64 / 1MB, 2)
                Connections = $connDetails.Count
            }
            
            $processInfo += $info

            # Display process information
            Write-Host "Process Details:" -ForegroundColor Yellow
            Write-Host "  PID:           $($info.PID)" -ForegroundColor White
            Write-Host "  Name:          $($info.Name)" -ForegroundColor White
            Write-Host "  Path:          $($info.Path)" -ForegroundColor Gray
            Write-Host "  Started:       $($info.StartTime)" -ForegroundColor Gray
            Write-Host "  CPU Time:      $($info.CPU)s" -ForegroundColor Gray
            Write-Host "  Memory:        $($info.Memory) MB" -ForegroundColor Gray
            Write-Host "  Connections:   $($info.Connections)" -ForegroundColor Gray
            Write-Host ""

        }
        catch {
            Write-ColorOutput "Cannot access process $processId (may require admin privileges)" -Type "Warning"
        }
    }

    if ($processInfo.Count -eq 0) {
        Write-ColorOutput "Unable to retrieve process information. Try running as Administrator." -Type "Error"
        exit 1
    }

    # Confirmation
    if (-not $Force) {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        $confirm = Read-Host "Kill $($processInfo.Count) process(es)? (y/n)"
        
        if ($confirm -ne 'y') {
            Write-ColorOutput "Operation cancelled by user" -Type "Info"
            exit 0
        }
    }

    # Kill processes
    Write-Host ""
    $killed = 0
    $failed = 0

    foreach ($info in $processInfo) {
        try {
            Stop-Process -Id $info.PID -Force -ErrorAction Stop
            Write-ColorOutput "Killed process '$($info.Name)' (PID: $($info.PID))" -Type "Success"
            $killed++
        }
        catch {
            Write-ColorOutput "Failed to kill process '$($info.Name)' (PID: $($info.PID)): $($_.Exception.Message)" -Type "Error"
            $failed++
        }
    }

    # Summary
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "Summary: $killed killed, $failed failed" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

    if ($failed -gt 0 -and -not (Test-Administrator)) {
        Write-ColorOutput "Some processes require Administrator privileges. Try running as Administrator." -Type "Warning"
    }

}
catch {
    Write-ColorOutput "Unexpected error: $($_.Exception.Message)" -Type "Error"
    exit 1
}