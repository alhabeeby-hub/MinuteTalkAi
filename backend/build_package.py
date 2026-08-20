#!/usr/bin/env python3
"""
Build a Lambda-compatible deployment package for the MinuteTalk AI backend.

This script installs Python dependencies targeting AWS Lambda's runtime
(Linux x86_64 / CPython 3.11) regardless of the local OS and Python version,
then bundles them together with the application code into ``deployment.zip``.

Why this matters:
    AWS Lambda runs on Linux x86_64 with Python 3.11. Some packages (notably
    ``pydantic-core``) ship compiled native binaries that are specific to the
    OS + Python version. A plain ``pip install -t ./package`` installs binaries
    for YOUR machine, which causes Lambda to fail with:

        "Unable to import module 'app.main':
         No module named 'pydantic_core._pydantic_core'"

    Using ``--platform manylinux2014_x86_64 --python-version 3.11
    --only-binary=:all:`` forces pip to download the correct Linux wheels.

Usage:
    python build_package.py          # from the backend/ directory

Output:
    backend/deployment.zip  (ready to be deployed by CDK)
"""

import os
import shutil
import subprocess
import sys
import zipfile


def main() -> None:
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    package_dir = os.path.join(backend_dir, "package")
    app_dir = os.path.join(backend_dir, "app")
    zip_path = os.path.join(backend_dir, "deployment.zip")
    requirements = os.path.join(backend_dir, "requirements.txt")

    # 1. Clean any previous build artifacts
    if os.path.exists(package_dir):
        shutil.rmtree(package_dir)
    if os.path.exists(zip_path):
        os.remove(zip_path)
    os.makedirs(package_dir, exist_ok=True)

    # 2. Install dependencies for Lambda's platform (Linux x86_64 / Python 3.11)
    print("Installing Lambda-compatible dependencies (Linux x86_64, Python 3.11)...")
    cmd = [
        sys.executable, "-m", "pip", "install",
        "-r", requirements,
        "--platform", "manylinux2014_x86_64",
        "--target", package_dir,
        "--only-binary=:all:",
        "--implementation", "cp",
        "--python-version", "3.11",
        "--upgrade",
    ]
    subprocess.run(cmd, check=True)

    # 3. Copy the application source into the package
    shutil.copytree(app_dir, os.path.join(package_dir, "app"))
    # Remove any compiled bytecode to keep the package lean
    for root, _dirs, files in os.walk(package_dir):
        for name in files:
            if name.endswith(".pyc"):
                os.remove(os.path.join(root, name))

    # 4. Zip the package contents (app/ at the root of the zip)
    print("Creating deployment.zip...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _dirs, files in os.walk(package_dir):
            for name in files:
                full = os.path.join(root, name)
                rel = os.path.relpath(full, package_dir)
                zf.write(full, rel)

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Built deployment.zip ({size_mb:.1f} MB) for Lambda (Python 3.11, Linux x86_64)")
    print("Next: cd amplify && npm run build && npx cdk deploy")


if __name__ == "__main__":
    main()
