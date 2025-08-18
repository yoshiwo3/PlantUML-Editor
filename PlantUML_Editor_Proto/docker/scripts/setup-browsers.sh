#!/bin/bash
# PlantUML E2E Browser Binary Persistence Manager
# Optimizes browser downloads and caching for Docker environment

set -euo pipefail

# Configuration
BROWSER_CACHE_DIR="${BROWSER_CACHE_DIR:-/opt/browser-cache}"
PLAYWRIGHT_BROWSERS_PATH="${BROWSER_CACHE_DIR}"
DOWNLOAD_TIMEOUT=600  # 10 minutes timeout
CACHE_VERSION="v1.48.0"
LOCK_FILE="${BROWSER_CACHE_DIR}/.download.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create browser cache directory with proper permissions
create_cache_directory() {
    log_info "Creating browser cache directory: ${BROWSER_CACHE_DIR}"
    
    mkdir -p "${BROWSER_CACHE_DIR}"
    chmod 755 "${BROWSER_CACHE_DIR}"
    
    # Create subdirectories for each browser
    mkdir -p "${BROWSER_CACHE_DIR}/chromium"
    mkdir -p "${BROWSER_CACHE_DIR}/firefox"
    mkdir -p "${BROWSER_CACHE_DIR}/webkit"
    mkdir -p "${BROWSER_CACHE_DIR}/msedge"
    
    log_success "Cache directory structure created"
}

# Check if browsers are already cached
check_browser_cache() {
    log_info "Checking existing browser cache..."
    
    local cache_valid=true
    local browsers=("chromium" "firefox" "webkit" "msedge")
    
    # Check for cache version file
    if [[ ! -f "${BROWSER_CACHE_DIR}/.cache_version" ]]; then
        log_warning "Cache version file not found"
        cache_valid=false
    else
        local cached_version=$(cat "${BROWSER_CACHE_DIR}/.cache_version")
        if [[ "${cached_version}" != "${CACHE_VERSION}" ]]; then
            log_warning "Cache version mismatch: ${cached_version} != ${CACHE_VERSION}"
            cache_valid=false
        fi
    fi
    
    # Check if browser directories exist and are not empty
    for browser in "${browsers[@]}"; do
        if [[ ! -d "${BROWSER_CACHE_DIR}/${browser}-"* ]] || [[ -z "$(ls -A "${BROWSER_CACHE_DIR}/${browser}"-* 2>/dev/null)" ]]; then
            log_warning "Browser ${browser} not found in cache or empty"
            cache_valid=false
            break
        fi
    done
    
    if [[ "$cache_valid" == "true" ]]; then
        log_success "Valid browser cache found"
        return 0
    else
        log_warning "Browser cache invalid or incomplete"
        return 1
    fi
}

# Download and cache browsers with progress indication
download_browsers() {
    log_info "Starting browser download and caching process..."
    
    # Create lock file to prevent concurrent downloads
    if [[ -f "$LOCK_FILE" ]]; then
        log_warning "Download already in progress (lock file exists)"
        
        # Wait for existing download to complete (max 10 minutes)
        local wait_count=0
        while [[ -f "$LOCK_FILE" && $wait_count -lt 60 ]]; do
            log_info "Waiting for existing download to complete... ($wait_count/60)"
            sleep 10
            ((wait_count++))
        done
        
        if [[ -f "$LOCK_FILE" ]]; then
            log_error "Download timeout - removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi
    
    # Create lock file
    touch "$LOCK_FILE"
    
    # Cleanup function
    cleanup() {
        rm -f "$LOCK_FILE"
    }
    trap cleanup EXIT
    
    # Set Playwright environment
    export PLAYWRIGHT_BROWSERS_PATH="${BROWSER_CACHE_DIR}"
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
    
    log_info "Installing Playwright browsers to: ${BROWSER_CACHE_DIR}"
    
    # Download browsers with timeout
    timeout ${DOWNLOAD_TIMEOUT} npx playwright install chromium firefox webkit msedge || {
        log_error "Browser download failed or timed out"
        cleanup
        return 1
    }
    
    # Install browser dependencies
    log_info "Installing browser dependencies..."
    timeout 300 npx playwright install-deps || {
        log_warning "Browser dependencies installation failed (non-critical)"
    }
    
    # Verify browser installations
    log_info "Verifying browser installations..."
    local browsers=("chromium" "firefox" "webkit" "msedge")
    local verification_failed=false
    
    for browser in "${browsers[@]}"; do
        if [[ -d "${BROWSER_CACHE_DIR}/${browser}"-* ]]; then
            local browser_size=$(du -sh "${BROWSER_CACHE_DIR}/${browser}"-* | cut -f1)
            log_success "✓ ${browser} installed successfully (${browser_size})"
        else
            log_error "✗ ${browser} installation failed"
            verification_failed=true
        fi
    done
    
    if [[ "$verification_failed" == "true" ]]; then
        log_error "Some browsers failed to install"
        return 1
    fi
    
    # Save cache version
    echo "${CACHE_VERSION}" > "${BROWSER_CACHE_DIR}/.cache_version"
    
    # Create cache info file
    cat > "${BROWSER_CACHE_DIR}/.cache_info" <<EOF
Cache Created: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Playwright Version: ${CACHE_VERSION}
Total Size: $(du -sh "${BROWSER_CACHE_DIR}" | cut -f1)
Browsers: chromium, firefox, webkit, msedge
Environment: $(uname -a)
EOF
    
    log_success "Browser caching completed successfully"
    return 0
}

# Optimize browser cache (remove unnecessary files)
optimize_cache() {
    log_info "Optimizing browser cache..."
    
    # Remove debug symbols and crash dumps
    find "${BROWSER_CACHE_DIR}" -name "*.dSYM" -type d -exec rm -rf {} + 2>/dev/null || true
    find "${BROWSER_CACHE_DIR}" -name "*.crashdump" -delete 2>/dev/null || true
    find "${BROWSER_CACHE_DIR}" -name "core.*" -delete 2>/dev/null || true
    
    # Remove temporary files
    find "${BROWSER_CACHE_DIR}" -name "*.tmp" -delete 2>/dev/null || true
    find "${BROWSER_CACHE_DIR}" -name "*.temp" -delete 2>/dev/null || true
    
    # Remove empty directories
    find "${BROWSER_CACHE_DIR}" -type d -empty -delete 2>/dev/null || true
    
    # Set proper permissions
    chmod -R 755 "${BROWSER_CACHE_DIR}"
    
    local optimized_size=$(du -sh "${BROWSER_CACHE_DIR}" | cut -f1)
    log_success "Cache optimization complete - Total size: ${optimized_size}"
}

# Display cache statistics
show_cache_stats() {
    log_info "Browser Cache Statistics"
    echo "========================="
    
    if [[ -f "${BROWSER_CACHE_DIR}/.cache_info" ]]; then
        cat "${BROWSER_CACHE_DIR}/.cache_info"
    else
        echo "Cache info not available"
    fi
    
    echo ""
    echo "Detailed Browser Breakdown:"
    echo "---------------------------"
    
    local browsers=("chromium" "firefox" "webkit" "msedge")
    for browser in "${browsers[@]}"; do
        local browser_dirs=$(ls -d "${BROWSER_CACHE_DIR}/${browser}"-* 2>/dev/null || echo "")
        if [[ -n "$browser_dirs" ]]; then
            local size=$(du -sh $browser_dirs | cut -f1)
            local version=$(basename $browser_dirs | sed "s/${browser}-//")
            echo "  ${browser}: ${version} (${size})"
        else
            echo "  ${browser}: Not installed"
        fi
    done
    
    echo ""
    echo "Cache Directory Listing:"
    echo "------------------------"
    ls -la "${BROWSER_CACHE_DIR}" 2>/dev/null || echo "Cache directory not accessible"
}

# Validate browser functionality
validate_browsers() {
    log_info "Validating browser functionality..."
    
    export PLAYWRIGHT_BROWSERS_PATH="${BROWSER_CACHE_DIR}"
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
    
    # Simple browser validation script
    cat > /tmp/validate_browsers.js <<'EOF'
const { chromium, firefox, webkit } = require('playwright');

async function validateBrowser(browserType, name) {
    try {
        const browser = await browserType.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('data:text/html,<html><body><h1>Test</h1></body></html>');
        const title = await page.textContent('h1');
        await browser.close();
        
        if (title === 'Test') {
            console.log(`✓ ${name}: Working`);
            return true;
        } else {
            console.log(`✗ ${name}: Failed - unexpected content`);
            return false;
        }
    } catch (error) {
        console.log(`✗ ${name}: Failed - ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('Browser Validation Results:');
    console.log('===========================');
    
    const browsers = [
        [chromium, 'Chromium'],
        [firefox, 'Firefox'],
        [webkit, 'WebKit']
    ];
    
    let allPassed = true;
    for (const [browserType, name] of browsers) {
        const result = await validateBrowser(browserType, name);
        if (!result) allPassed = false;
    }
    
    console.log('===========================');
    console.log(`Overall: ${allPassed ? 'All browsers working' : 'Some browsers failed'}`);
    process.exit(allPassed ? 0 : 1);
}

main();
EOF

    # Run validation with timeout
    timeout 60 node /tmp/validate_browsers.js || {
        log_error "Browser validation failed"
        return 1
    }
    
    rm -f /tmp/validate_browsers.js
    log_success "Browser validation completed"
}

# Main execution
main() {
    log_info "PlantUML E2E Browser Setup Starting..."
    echo "======================================"
    
    # Parse command line arguments
    local command="${1:-setup}"
    
    case "$command" in
        "setup")
            create_cache_directory
            if ! check_browser_cache; then
                download_browsers || exit 1
                optimize_cache
            else
                log_info "Using existing browser cache"
            fi
            
            export PLAYWRIGHT_BROWSERS_PATH="${BROWSER_CACHE_DIR}"
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            
            show_cache_stats
            ;;
            
        "validate")
            if check_browser_cache; then
                validate_browsers
            else
                log_error "No valid browser cache found. Run 'setup' first."
                exit 1
            fi
            ;;
            
        "stats")
            show_cache_stats
            ;;
            
        "clean")
            log_info "Cleaning browser cache..."
            rm -rf "${BROWSER_CACHE_DIR}"
            log_success "Cache cleaned"
            ;;
            
        "help"|"--help"|"-h")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  setup    - Setup and cache browsers (default)"
            echo "  validate - Validate browser functionality"
            echo "  stats    - Show cache statistics"
            echo "  clean    - Clean browser cache"
            echo "  help     - Show this help"
            ;;
            
        *)
            log_error "Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    log_success "Browser setup completed successfully"
}

# Execute main function with all arguments
main "$@"