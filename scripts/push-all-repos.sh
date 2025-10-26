#!/bin/bash

# Push All Repositories Script
# Commits and pushes changes to both staging and production repositories

set -euo pipefail

echo "🚀 Committing and Pushing All Repositories"
echo "=========================================="
echo ""

# Configuration
STAGING_DIR="/Users/gervin/Desktop/QSS/Applications/QSS/payrun-pro-staging"
PRODUCTION_DIR="/Users/gervin/Desktop/QSS/Applications/payrun-pro"

# Function to commit and push a repository
commit_and_push() {
    local repo_dir="$1"
    local repo_name="$2"
    local commit_message="$3"
    
    echo "📁 Processing $repo_name repository..."
    echo "   Directory: $repo_dir"
    
    cd "$repo_dir"
    
    # Check if there are changes to commit
    if git diff --quiet && git diff --cached --quiet; then
        echo "   ⏭️ No changes to commit in $repo_name"
        return 0
    fi
    
    # Add all changes
    echo "   📝 Adding changes..."
    git add .
    
    # Commit changes
    echo "   💾 Committing changes..."
    git commit -m "$commit_message"
    
    # Push to GitHub
    echo "   📤 Pushing to GitHub..."
    git push origin main
    
    echo "   ✅ $repo_name repository updated successfully!"
    echo ""
}

# Main execution
main() {
    # Get commit message from user or use default
    if [ $# -eq 0 ]; then
        echo "📝 Enter commit message (or press Enter for default):"
        read -r commit_message
        if [ -z "$commit_message" ]; then
            commit_message="🔄 Update: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
    else
        commit_message="$1"
    fi
    
    echo "📋 Commit message: $commit_message"
    echo ""
    
    # Process staging repository
    commit_and_push "$STAGING_DIR" "Staging" "$commit_message"
    
    # Process production repository
    commit_and_push "$PRODUCTION_DIR" "Production" "$commit_message"
    
    echo "🎉 All repositories processed successfully!"
    echo ""
    echo "📊 Summary:"
    echo "   ✅ Staging repository: https://github.com/Q-Sourcing/payrun-pro-staging.git"
    echo "   ✅ Production repository: https://github.com/Q-Sourcing/payrun-pro.git"
    echo ""
    echo "🔗 GitHub URLs:"
    echo "   📱 Staging: https://github.com/Q-Sourcing/payrun-pro-staging"
    echo "   🚀 Production: https://github.com/Q-Sourcing/payrun-pro"
}

# Run main function with any arguments
main "$@"
