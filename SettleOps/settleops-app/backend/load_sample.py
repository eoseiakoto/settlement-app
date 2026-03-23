#!/usr/bin/env python3
"""
SettleOps Sample Data Loader
Utility to load March 2023 VSS_Reports data into the application.
Can be run standalone or imported for use in app initialization.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime


def load_sample_data(data_dir=None):
    """
    Load sample data from VSS_Reports directory.
    Attempts to use parsers.package_parser if available.

    Args:
        data_dir: Path to data directory. Defaults to March 2023 path.

    Returns:
        Dictionary with loaded data or empty dict if unsuccessful
    """
    if data_dir is None:
        data_dir = '/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323'

    data = {
        'packages': [],
        'transactions': [],
        'settlement': {},
        'control': {},
        'raw_reports': {}
    }

    print(f"[{datetime.now().isoformat()}] Loading sample data from: {data_dir}")

    if not os.path.isdir(data_dir):
        print(f"ERROR: Data directory not found: {data_dir}")
        return data

    # Try to use parsers.package_parser
    try:
        from parsers.package_parser import parse_package
        print("Found parsers.package_parser module")
        result = parse_package(data_dir)
        if result:
            data.update(result)
            print(f"Successfully loaded data using package_parser")
            print(f"  Transactions: {len(data.get('transactions', []))}")
            print(f"  Packages: {len(data.get('packages', []))}")
            return data
    except ImportError:
        print("Parsers module not available yet")
    except Exception as e:
        print(f"Error using parsers: {e}")

    # Fallback: manually scan directory for report files
    print("Using fallback directory scan...")
    return scan_and_load_directory(data_dir, data)


def scan_and_load_directory(data_dir, data):
    """
    Fallback function to scan directory for report files.

    Args:
        data_dir: Directory path to scan
        data: Data dictionary to populate

    Returns:
        Populated data dictionary
    """
    try:
        files = os.listdir(data_dir)
        print(f"Found {len(files)} files in {data_dir}")

        # Categorize files by type
        ep_files = [f for f in files if f.startswith('EP-')]
        vss_files = [f for f in files if f.startswith('VSS-')]

        print(f"  EP reports: {len(ep_files)}")
        print(f"  VSS reports: {len(vss_files)}")

        # Create a package entry
        package = {
            'id': 'PKG_MARCH_2023',
            'timestamp': datetime.now().isoformat(),
            'source_dir': data_dir,
            'file_count': len(files),
            'status': 'loaded_from_directory',
            'reports': {
                'ep_files': ep_files,
                'vss_files': vss_files
            }
        }

        data['packages'].append(package)

        # Store file references in raw_reports
        for f in ep_files:
            data['raw_reports'][f.split('.')[0]] = {
                'file': f,
                'path': os.path.join(data_dir, f)
            }

        for f in vss_files:
            data['raw_reports'][f.split('.')[0]] = {
                'file': f,
                'path': os.path.join(data_dir, f)
            }

        # Create minimal control data structure
        data['control'] = {
            'EP-210': {
                'file': 'EP-210.txt',
                'status': 'available'
            },
            'EP-999': {
                'file': 'EP-999.txt',
                'report_count': len(ep_files) + len(vss_files)
            }
        }

        print(f"Package created: {package['id']}")
        print(f"Raw reports indexed: {len(data['raw_reports'])}")

        return data

    except Exception as e:
        print(f"Error scanning directory: {e}")
        return data


def load_mock_data():
    """
    Load minimal mock data for testing.

    Returns:
        Dictionary with mock data
    """
    data = {
        'packages': [
            {
                'id': 'PKG_MOCK_001',
                'timestamp': datetime.now().isoformat(),
                'file_count': 0,
                'status': 'mock_data',
                'message': 'No data loaded - using mock data'
            }
        ],
        'transactions': [
            {
                'id': 'MOCK_TXN_001',
                'type': 'sales',
                'date': '2023-03-10T10:30:00',
                'amount': 1500.00,
                'currency': 'USD',
                'merchant': 'Test Merchant',
                'country': 'Ghana'
            }
        ],
        'settlement': {
            'period': '2023-03-10',
            'status': 'mock_data'
        },
        'control': {},
        'raw_reports': {}
    }

    print("Mock data loaded")
    return data


def main():
    """
    Command-line entry point.
    """
    print("SettleOps Sample Data Loader")
    print("=" * 50)

    # Check if custom path provided
    data_dir = None
    if len(sys.argv) > 1:
        data_dir = sys.argv[1]

    # Load data
    data = load_sample_data(data_dir)

    # Print summary
    print("\n" + "=" * 50)
    print("Load Summary:")
    print(f"  Packages: {len(data.get('packages', []))}")
    print(f"  Transactions: {len(data.get('transactions', []))}")
    print(f"  Raw reports: {len(data.get('raw_reports', {}))}")
    print(f"  Control entries: {len(data.get('control', {}))}")

    # Save to JSON for inspection
    output_file = 'loaded_data.json'
    try:
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        print(f"\nData saved to: {output_file}")
    except Exception as e:
        print(f"Warning: Could not save to {output_file}: {e}")

    return data


if __name__ == '__main__':
    main()
