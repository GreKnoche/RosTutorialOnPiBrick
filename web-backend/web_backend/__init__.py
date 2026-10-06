"""HTTP door in front of the I/O-box drive_wheels service."""

from web_backend.app import create_app

__all__ = ["create_app"]
