"""Source the companion overlay, then from this directory run: python3 main.py"""

from __future__ import annotations


def main() -> None:
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
