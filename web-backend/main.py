"""Source the companion overlay, then run this file. It stays one process so a
single ROS client lives for the whole server:

    python3 main.py
"""

from web_backend.__main__ import main

if __name__ == "__main__":
    main()
