"""
Setup script for Cognia Plugin SDK
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="cognia-plugin-sdk",
    version="1.0.0",
    author="Cognia Team",
    author_email="support@cognia.dev",
    description="SDK for creating Cognia plugins",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/cognia/plugin-sdk",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.9",
    install_requires=[],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-asyncio>=0.21",
            "mypy>=1.0",
            "black>=23.0",
            "isort>=5.12",
        ],
    },
)
