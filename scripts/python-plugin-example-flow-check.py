#!/usr/bin/env python3
"""Validate scaffold -> test -> pack flow for Python plugins."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> None:
    completed = subprocess.run(cmd, cwd=str(cwd) if cwd else None, env=env, check=False)
    if completed.returncode != 0:
        raise RuntimeError(f"Command failed ({completed.returncode}): {' '.join(cmd)}")


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    sdk_src = repo_root / "plugin-sdk" / "python" / "src"
    if not sdk_src.exists():
        raise RuntimeError("Python SDK source directory not found.")

    sys.path.insert(0, str(sdk_src))
    from cognia.cli import create_plugin, generate_manifest, pack_plugin  # type: ignore

    with tempfile.TemporaryDirectory(prefix="cognia-python-flow-") as temp_dir:
        plugin_dir = Path(temp_dir) / "flow-plugin"

        # Scaffold
        create_plugin("Flow Plugin", path=str(plugin_dir), description="Flow validation plugin")

        # Validate generated manifest contract
        generate_manifest(path=str(plugin_dir), validate_only=True)

        # Run generated tests
        env = os.environ.copy()
        py_path = env.get("PYTHONPATH", "")
        env["PYTHONPATH"] = os.pathsep.join([str(plugin_dir), str(sdk_src), py_path]) if py_path else os.pathsep.join([str(plugin_dir), str(sdk_src)])
        run([sys.executable, "-m", "pytest", str(plugin_dir / "tests"), "-q"], env=env)

        # Package
        pack_plugin(path=str(plugin_dir))
        dist_dir = plugin_dir / "dist"
        artifacts = list(dist_dir.glob("*.zip"))
        if not artifacts:
            raise RuntimeError("Packaging succeeded but no zip artifact was produced.")

    print("Python scaffold->test->pack flow check passed.")


if __name__ == "__main__":
    main()

