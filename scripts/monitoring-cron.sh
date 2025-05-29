#!/bin/bash

# Leadify Monitoring Cron Script
# Add this to your crontab:
# */3 * * * * /path/to/your/leadify/scripts/monitoring-cron.sh scan
# */10 * * * * /path/to/your/leadify/scripts/monitoring-cron.sh qualify

# Configuration
DEPLOYMENT_URL="https://your-domain.vercel.app"  # Replace with your actual domain
CRON_SECRET="your-cron-secret-here"              # Replace with your CRON_SECRET
ORGANIZATION_IDS="org1,org2,org3"                # Replace with your organization IDs

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Function to scan for new posts
scan_reddit() {
    log "🔍 Starting Reddit scan..."
    
    response=$(curl -s -w "%{http_code}" \
        -X GET "$DEPLOYMENT_URL/api/monitoring/scan" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json")
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        log "✅ Reddit scan completed successfully"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        error "❌ Reddit scan failed with HTTP $http_code: $body"
        exit 1
    fi
}

# Function to qualify potential leads
qualify_leads() {
    log "🎯 Starting lead qualification..."
    
    IFS=',' read -ra ORG_ARRAY <<< "$ORGANIZATION_IDS"
    
    for org_id in "${ORG_ARRAY[@]}"; do
        log "Processing organization: $org_id"
        
        response=$(curl -s -w "%{http_code}" \
            -X GET "$DEPLOYMENT_URL/api/monitoring/qualify?organizationId=$org_id" \
            -H "Authorization: Bearer $CRON_SECRET" \
            -H "Content-Type: application/json")
        
        http_code="${response: -3}"
        body="${response%???}"
        
        if [ "$http_code" -eq 200 ]; then
            log "✅ Qualification completed for org $org_id"
            echo "$body" | jq . 2>/dev/null || echo "$body"
        else
            error "❌ Qualification failed for org $org_id with HTTP $http_code: $body"
        fi
    done
}

# Main execution
case "$1" in
    scan)
        scan_reddit
        ;;
    qualify)
        qualify_leads
        ;;
    *)
        echo "Usage: $0 {scan|qualify}"
        echo "  scan    - Scan Reddit for new posts"
        echo "  qualify - Qualify potential leads with AI"
        exit 1
        ;;
esac 