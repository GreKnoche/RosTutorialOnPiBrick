from brick_nav.odom_mux import choose_source


def test_empty_selection_uses_the_first_source() -> None:
    assert choose_source(["odom", "odom/gyro"], "") == "odom"


def test_leading_slash_matches() -> None:
    assert choose_source(["odom/gyro", "odom/sono"], "/odom/sono") == "odom/sono"


def test_unknown_source_is_rejected() -> None:
    assert choose_source(["odom", "odom/gyro"], "odom/visual") is None


def test_no_sources() -> None:
    assert choose_source([], "odom") is None
