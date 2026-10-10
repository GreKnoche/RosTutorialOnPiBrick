"""Reject stamps from the other clock before they enter the TF tree."""


def stamp_matches_clock(stamp_sec: float, clock_sec: float, tolerance_sec: float = 1.0) -> bool:
    """False when a wall-clock stamp is mixed into a sim-time tree.

    One sample about 1e9 s ahead makes tf2 drop every later sim-time update
    as TF_OLD_DATA, and RViz then cannot place a sim-time LaserScan.
    """
    return abs(stamp_sec - clock_sec) <= tolerance_sec
