#!/bin/bash

# Create libs directory if it doesn't exist
mkdir -p libs

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to download a file with error handling
download_file() {
    local url="$1"
    local output_file="$2"
    
    echo "Downloading $(basename $output_file)..."
    if curl -L -f "$url" -o "$output_file"; then
        echo -e "${GREEN}✓ Successfully downloaded $(basename $output_file)${NC}"
    else
        echo -e "${RED}✗ Failed to download $(basename $output_file)${NC}"
        return 1
    fi
}

# Libraries to download
declare -a files=(
    "https://unpkg.com/graphre/dist/graphre.js"
    "https://unpkg.com/nomnoml/dist/nomnoml.js"
)

declare -a output_files=(
    "libs/graphre.js"
    "libs/nomnoml.js"
)

# Download each file
success=true
for i in "${!files[@]}"; do
    if ! download_file "${files[$i]}" "${output_files[$i]}"; then
        success=false
    fi
done

# Final status message
if [ "$success" = true ]; then
    echo -e "\n${GREEN}✓ All files downloaded successfully!${NC}"
    echo "Library files are now in the ./libs directory"
else
    echo -e "\n${RED}✗ Some files failed to download. Please check the errors above and try again.${NC}"
    exit 1
fi