#!/usr/bin/env python3
"""
Script to populate the database with Spotify streaming data.
"""

import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from loaders.streaming_data_loader import SpotifyDataLoader


def main():
    """Main function to populate the database."""
    print("Starting Spotify data loading...")
    
    loader = SpotifyDataLoader()
    
    try:
        stats = loader.load_all_files()
        
        print("\n" + "="*50)
        print("LOAD SUMMARY")
        print("="*50)
        print(f"Files processed: {stats.get('files_processed', 0)}")
        print(f"Total records found: {stats.get('total_records', 0)}")
        print(f"Total records loaded: {stats.get('total_loaded', 0)}")
        
        print("\nData loading completed successfully!")
        
    except Exception as e:
        print(f"Error during data loading: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()