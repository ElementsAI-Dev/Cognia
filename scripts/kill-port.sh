#!/usr/bin/env bash

#############################################################################
# Kill Port - Terminate process(es) using a specific port
#############################################################################
# Description:
#   This script identifies and terminates process(es) that are listening on
#   or connected to a specified port. It provides detailed information about
#   the process before termination.
#
# Usage:
#   ./kill-port.sh <port> [options]
#
# Examples:
#   ./kill-port.sh 8080
#   ./kill-port.sh 8080 -f
#   ./kill-port.sh 8080 --protocol udp
#   ./kill-port.sh 8080 --signal SIGKILL
#
# Options:
#   -f, --force         Skip confirmation prompt
#   -p, --protocol      Protocol to check: tcp (default), udp, or both
#   -s, --signal        Signal to send: TERM (default), KILL, HUP, INT
#   -h, --help          Show this help message
#
# Author: System Administrator
# Version: 2.0
#############################################################################

set -o pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly GRAY='\033[0;90m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Default values
FORCE=false
PROTOCOL="tcp"
SIGNAL="TERM"

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)     OS_TYPE="Linux";;
    Darwin*)    OS_TYPE="macOS";;
    *)          OS_TYPE="Unknown";;
esac

#############################################################################
# Functions
#############################################################################

print_usage() {
    cat << EOF
Usage: $0 <port> [options]

Options:
  -f, --force         Skip confirmation prompt
  -p, --protocol      Protocol to check: tcp (default), udp, or both
  -s, --signal        Signal to send: TERM (default), KILL, HUP, INT
  -h, --help          Show this help message

Examples:
  $0 8080
  $0 8080 -f
  $0 8080 --protocol udp
  $0 8080 --signal KILL

EOF
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_separator() {
    echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_requirements() {
    local missing_tools=()
    
    if ! command -v lsof &> /dev/null; then
        missing_tools+=("lsof")
    fi
    
    if ! command -v ps &> /dev/null; then
        missing_tools+=("ps")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Install with:"
        if [ "$OS_TYPE" = "Linux" ]; then
            echo "  sudo apt-get install lsof procps  # Debian/Ubuntu"
            echo "  sudo yum install lsof procps-ng   # RHEL/CentOS"
        elif [ "$OS_TYPE" = "macOS" ]; then
            echo "  brew install lsof  # via Homebrew"
        fi
        exit 1
    fi
}

validate_port() {
    local port=$1
    
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
        print_error "Port must be a number"
        return 1
    fi
    
    if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        print_error "Port must be between 1 and 65535"
        return 1
    fi
    
    return 0
}

get_process_info() {
    local process_id=$1
    local info=""
    
    if [ "$OS_TYPE" = "macOS" ]; then
        # macOS ps format
        info=$(ps -p "$process_id" -o pid=,user=,comm=,%cpu=,%mem=,lstart= 2>/dev/null)
    else
        # Linux ps format
        info=$(ps -p "$process_id" -o pid=,user=,comm=,%cpu=,%mem=,lstart= 2>/dev/null)
    fi
    
    echo "$info"
}

get_process_path() {
    local process_id=$1
    local path=""
    
    if [ "$OS_TYPE" = "macOS" ]; then
        path=$(ps -p "$process_id" -o command= 2>/dev/null | awk '{print $1}')
    else
        # Try to get full path from /proc
        if [ -e "/proc/$process_id/exe" ]; then
            path=$(readlink -f "/proc/$process_id/exe" 2>/dev/null)
        else
            path=$(ps -p "$process_id" -o command= 2>/dev/null | awk '{print $1}')
        fi
    fi
    
    echo "$path"
}

find_processes_by_port() {
    local port=$1
    local protocol=$2
    local pids=()
    
    if [ "$protocol" = "tcp" ] || [ "$protocol" = "both" ]; then
        # Find TCP processes
        while IFS= read -r line; do
            pids+=("$line")
        done < <(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null)
    fi
    
    if [ "$protocol" = "udp" ] || [ "$protocol" = "both" ]; then
        # Find UDP processes
        while IFS= read -r line; do
            pids+=("$line")
        done < <(lsof -nP -iUDP:"$port" -t 2>/dev/null)
    fi
    
    # Remove duplicates and return
    printf '%s\n' "${pids[@]}" | sort -u
}

display_process_details() {
    local process_id=$1
    
    local process_info
    process_info=$(get_process_info "$process_id")
    
    if [ -z "$process_info" ]; then
        print_warning "Cannot access process $process_id (may require elevated privileges)"
        return 1
    fi
    
    local process_path
    process_path=$(get_process_path "$process_id")
    
    # Parse ps output
    read -r pid user comm cpu mem lstart <<< "$process_info"
    
    echo -e "${YELLOW}Process Details:${NC}"
    echo -e "  ${WHITE}PID:${NC}           $pid"
    echo -e "  ${WHITE}User:${NC}          $user"
    echo -e "  ${WHITE}Command:${NC}       $comm"
    echo -e "  ${GRAY}Path:${NC}          $process_path"
    echo -e "  ${GRAY}CPU:${NC}           ${cpu}%"
    echo -e "  ${GRAY}Memory:${NC}        ${mem}%"
    echo -e "  ${GRAY}Started:${NC}       $lstart"
    echo ""
    
    return 0
}

#############################################################################
# Main
#############################################################################

# Parse arguments
if [ $# -eq 0 ]; then
    print_error "Missing port number"
    print_usage
    exit 1
fi

PORT=$1
shift

while [ $# -gt 0 ]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -p|--protocol)
            PROTOCOL="${2,,}"  # Convert to lowercase
            if [[ ! "$PROTOCOL" =~ ^(tcp|udp|both)$ ]]; then
                print_error "Invalid protocol. Use: tcp, udp, or both"
                exit 1
            fi
            shift 2
            ;;
        -s|--signal)
            SIGNAL="${2^^}"  # Convert to uppercase
            if [[ ! "$SIGNAL" =~ ^(TERM|KILL|HUP|INT|QUIT|STOP)$ ]]; then
                print_error "Invalid signal. Use: TERM, KILL, HUP, INT, QUIT, STOP"
                exit 1
            fi
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Validate port
if ! validate_port "$PORT"; then
    exit 1
fi

# Check requirements
check_requirements

# Check if running with appropriate privileges
if [ "$EUID" -ne 0 ] && [ "$OS_TYPE" = "Linux" ]; then
    print_warning "Not running as root. Some processes may be inaccessible."
fi

# Find processes
print_info "Checking ${PROTOCOL^^} port $PORT on $OS_TYPE..."

mapfile -t PROCESS_IDS < <(find_processes_by_port "$PORT" "$PROTOCOL")

if [ ${#PROCESS_IDS[@]} -eq 0 ]; then
    print_warning "No process found using ${PROTOCOL^^} port $PORT"
    exit 0
fi

# Display process information
echo ""
print_separator
echo -e "${WHITE}Found ${#PROCESS_IDS[@]} process(es) using ${PROTOCOL^^} port $PORT${NC}"
print_separator
echo ""

declare -A PROCESS_DETAILS
ACCESSIBLE_COUNT=0

for process_id in "${PROCESS_IDS[@]}"; do
    if display_process_details "$process_id"; then
        PROCESS_DETAILS[$process_id]=1
        ((ACCESSIBLE_COUNT++))
    fi
done

if [ $ACCESSIBLE_COUNT -eq 0 ]; then
    print_error "Unable to retrieve process information. Try running with sudo."
    exit 1
fi

# Confirmation
if [ "$FORCE" = false ]; then
    print_separator
    read -p "Kill $ACCESSIBLE_COUNT process(es) with SIG$SIGNAL? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Operation cancelled by user"
        exit 0
    fi
fi

# Kill processes
echo ""
KILLED=0
FAILED=0

for process_id in "${!PROCESS_DETAILS[@]}"; do
    local process_name
    process_name=$(ps -p "$process_id" -o comm= 2>/dev/null)
    
    if kill -s "$SIGNAL" "$process_id" 2>/dev/null; then
        print_success "Killed process '$process_name' (PID: $process_id)"
        ((KILLED++))
    else
        print_error "Failed to kill process '$process_name' (PID: $process_id)"
        ((FAILED++))
    fi
done

# Summary
echo ""
print_separator
echo -e "${WHITE}Summary: $KILLED killed, $FAILED failed${NC}"
print_separator

if [ $FAILED -gt 0 ] && [ "$EUID" -ne 0 ]; then
    print_warning "Some processes require elevated privileges. Try running with sudo."
fi

exit 0