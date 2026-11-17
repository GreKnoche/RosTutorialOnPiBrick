"""Start and stop the lesson Nav2 stack and the student node.

The Next route still merges YAML and builds plugins. This process owns the
ROS children, on the same domain as the canvas twin.
"""

from __future__ import annotations

import os
import signal
import subprocess
import threading
from pathlib import Path

LOG_LIMIT = 4_000


class NavLab:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._nav: subprocess.Popen[str] | None = None
        self._student: subprocess.Popen[str] | None = None
        self._nav_log = ""
        self._student_log = ""
        self._nav_run_log = ""
        self._nav_run = False
        self._nav_key = ""
        self._starting = False
        self._stops = 0

    def status(self) -> dict[str, object]:
        with self._lock:
            running = self._student is not None and self._student.poll() is None
            student = self._student_log.strip()
            starting = self._starting and not student
            log = "" if starting else "\n".join(part for part in (student, "" if running else self._nav_errors()) if part)
            return {"ok": True, "running": running, "starting": starting, "log": log}

    def stop(self) -> dict[str, object]:
        with self._lock:
            self._stops += 1
            self._starting = False
            self._nav_run = False
            student = self._student
            nav = self._nav
            self._student = None
            self._nav = None
            self._nav_key = ""
            idle = student is None and nav is None
        if idle and not _matching_pids():
            with self._lock:
                self._student_log = ""
                self._starting = False
            return {"ok": True, "running": False, "starting": False, "log": "Nav2 gestoppt."}
        _signal(student, signal.SIGINT)
        _signal(nav, signal.SIGINT)
        _signal_matching(signal.SIGINT)
        _zero_twist()
        _wait_gone(student, 4.0)
        _wait_gone(nav, 4.0)
        if _matching_pids():
            _signal(student, signal.SIGKILL)
            _signal(nav, signal.SIGKILL)
            _signal_matching(signal.SIGKILL)
        _zero_twist()
        with self._lock:
            self._student_log = "Nav2 gestoppt.\n"
            self._nav_log = ""
            self._nav_run_log = ""
            self._starting = False
        return {"ok": True, "running": False, "starting": False, "log": "Nav2 gestoppt."}

    def start(self, body: dict[str, object], stop_mark: int | None = None) -> dict[str, object]:
        with self._lock:
            mark = self._stops if stop_mark is None else stop_mark
            if self._stops != mark:
                return {"ok": False, "aborted": True, "error": "Nav2 gestoppt."}
            self._starting = True
            self._student_log = ""
        student = body.get("student")
        if not isinstance(student, str) or not student or not Path(student).is_file():
            self._clear_starting()
            return {"ok": False, "error": "Der Knoten fehlt."}
        params = body.get("params_file")
        pose = body.get("pose_xml")
        through = body.get("through_xml")
        cache = body.get("cache_dir")
        for label, path in (
            ("nav2_params.yaml", params),
            ("mission.xml", pose),
            ("through_poses.xml", through),
            ("cache", cache),
        ):
            if not isinstance(path, str) or not path:
                self._clear_starting()
                return {"ok": False, "error": f"{label} fehlt."}
        nav_key = body.get("nav_key")
        key = nav_key if isinstance(nav_key, str) and nav_key else "once"
        plugin_setup = body.get("plugin_setup")
        setup = plugin_setup if isinstance(plugin_setup, str) and plugin_setup else ""
        libs = body.get("plugin_libs")
        names = [item for item in libs if isinstance(item, str) and item] if isinstance(libs, list) else []
        follower = body.get("with_follower") is True
        with self._lock:
            if self._stops != mark:
                self._clear_starting()
                return {"ok": False, "aborted": True, "error": "Nav2 gestoppt."}
        error = self._ensure_nav(key, pose, through, cache, params, follower, names, setup, mark)
        with self._lock:
            if self._stops != mark:
                self._clear_starting()
                return {"ok": False, "aborted": True, "error": "Nav2 gestoppt."}
        if error:
            self._clear_starting()
            return {"ok": False, "error": error}
        child = _popen(["bash", "-lc", f"exec python3 -u {_sh(student)}"])
        with self._lock:
            if self._stops != mark:
                _signal(child, signal.SIGINT)
                self._clear_starting()
                return {"ok": False, "aborted": True, "error": "Nav2 gestoppt."}
            self._student = child
            self._nav_run_log = ""
            self._nav_run = True
        _watch(child, self._push_student)

        def _finished() -> None:
            child.wait()
            with self._lock:
                if self._student is child:
                    self._student = None
                self._nav_run = False
                self._starting = False

        threading.Thread(target=_finished, daemon=True).start()
        code = _exit_within(child, 1.5)
        with self._lock:
            if self._stops != mark:
                self._clear_starting()
                return {"ok": False, "aborted": True, "error": "Nav2 gestoppt."}
            if code is not None and code != 0:
                if self._student is child:
                    self._student = None
                self._nav_run = False
                self._starting = False
                return {"ok": False, "error": self._student_log.strip() or "Der Knoten ist sofort beendet."}
            if self._student_log.strip():
                self._starting = False
            running = code is None
            log = self._student_log.strip()
        return {"ok": True, "running": running, "log": log}

    def stop_mark(self) -> int:
        with self._lock:
            return self._stops

    def _clear_starting(self) -> None:
        with self._lock:
            self._starting = False

    def _push_student(self, text: str) -> None:
        with self._lock:
            self._student_log = (self._student_log + text)[-LOG_LIMIT:]
            if self._student_log.strip():
                self._starting = False

    def _push_nav(self, text: str) -> None:
        with self._lock:
            self._nav_log = (self._nav_log + text)[-LOG_LIMIT:]
            if self._nav_run:
                self._nav_run_log = (self._nav_run_log + text)[-LOG_LIMIT:]

    def _nav_errors(self) -> str:
        lines = [line for line in self._nav_run_log.split("\n") if "[ERROR]" in line or "[FATAL]" in line]
        return "\n".join(lines[-8:]).strip()

    def _ensure_nav(
        self,
        nav_key: str,
        pose: str,
        through: str,
        cache: str,
        params: str,
        follower: bool,
        libs: list[str],
        plugin_setup: str,
        mark: int,
    ) -> str | None:
        with self._lock:
            if self._stops != mark:
                return "Nav2 gestoppt."
            current = self._nav
            same = (
                current is not None
                and current.poll() is None
                and self._nav_key == nav_key
                and current.pid is not None
                and "student_nav.launch.py" in _cmdline(current.pid)
            )
        if same:
            return None
        self._stop_nav_only()
        if _navigator_up():
            return "Nav2 läuft schon ohne diese XML. Beende den anderen Stack und starte noch einmal."
        launch = _launch_file()
        plugin_arg = f" plugin_lib_names:={_sh(':'.join(libs))}" if libs else ""
        lines = []
        if plugin_setup:
            lines.append(f"source {_sh(plugin_setup)}")
        lines.append(
            "exec ros2 launch "
            f"{_sh(launch)} pose_xml:={_sh(pose)} through_xml:={_sh(through)} "
            f"cache_dir:={_sh(cache)} params_file:={_sh(params)} "
            f"with_follower:={'true' if follower else 'false'}{plugin_arg}"
        )
        child = _popen(["bash", "-lc", "\n".join(lines)])
        with self._lock:
            self._nav = child
            self._nav_log = ""
        _watch(child, self._push_nav)
        if not _nav_ready(child, lambda: self._stopped(mark)):
            log = ""
            with self._lock:
                log = self._nav_log.strip()
                if self._nav is child:
                    self._nav = None
                    self._nav_key = ""
            _signal(child, signal.SIGINT)
            _wait_gone(child, 2.0)
            if self._stopped(mark):
                return "Nav2 gestoppt."
            return log or "Nav2 ist nicht hochgekommen."
        if self._stopped(mark):
            _signal(child, signal.SIGINT)
            with self._lock:
                if self._nav is child:
                    self._nav = None
            return "Nav2 gestoppt."
        with self._lock:
            self._nav_key = nav_key
        return None

    def _stopped(self, mark: int) -> bool:
        with self._lock:
            return self._stops != mark

    def _stop_nav_only(self) -> None:
        with self._lock:
            nav = self._nav
            self._nav = None
            self._nav_key = ""
        _signal(nav, signal.SIGINT)
        _signal_matching(signal.SIGINT)
        _wait_gone(nav, 4.0)
        if _matching_pids():
            _signal(nav, signal.SIGKILL)
            _signal_matching(signal.SIGKILL)


def _frontend() -> Path:
    raw = os.environ.get("WEB_FRONTEND", "")
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parent.parent / "web_frontend"


def _launch_file() -> str:
    return str(_frontend() / "scripts" / "student_nav.launch.py")


def _sh(text: str) -> str:
    return "'" + text.replace("'", "'\\''") + "'"


def _popen(argv: list[str]) -> subprocess.Popen[str]:
    return subprocess.Popen(
        argv,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
        env=os.environ.copy(),
    )


def _watch(child: subprocess.Popen[str], push) -> None:
    def read(pipe) -> None:
        if pipe is None:
            return
        try:
            for chunk in iter(lambda: pipe.read(256), ""):
                if not chunk:
                    break
                push(chunk)
        except Exception:
            return

    threading.Thread(target=read, args=(child.stdout,), daemon=True).start()
    threading.Thread(target=read, args=(child.stderr,), daemon=True).start()


def _signal(child: subprocess.Popen[str] | None, sig: signal.Signals) -> None:
    if child is None or child.poll() is not None or child.pid is None:
        return
    try:
        os.killpg(child.pid, sig)
    except ProcessLookupError:
        return
    except PermissionError:
        child.send_signal(sig)


def _wait_gone(child: subprocess.Popen[str] | None, seconds: float) -> None:
    if child is None:
        return
    try:
        child.wait(timeout=seconds)
    except subprocess.TimeoutExpired:
        return


def _exit_within(child: subprocess.Popen[str], seconds: float) -> int | None:
    try:
        return child.wait(timeout=seconds)
    except subprocess.TimeoutExpired:
        return None


def _cmdline(pid: int) -> str:
    try:
        return Path(f"/proc/{pid}/cmdline").read_bytes().replace(b"\0", b" ").decode("utf-8", "replace")
    except OSError:
        return ""


def _matching_pids() -> list[int]:
    found: list[int] = []
    proc = Path("/proc")
    if not proc.is_dir():
        return found
    for entry in proc.iterdir():
        if not entry.name.isdigit():
            continue
        pid = int(entry.name)
        if pid == os.getpid():
            continue
        args = _cmdline(pid)
        if "student_nav.launch.py" in args or f"{os.sep}.student{os.sep}nav2_params.yaml" in args:
            found.append(pid)
    return found


def _signal_matching(sig: signal.Signals) -> None:
    for pid in _matching_pids():
        try:
            os.kill(pid, sig)
        except OSError:
            continue


def _bash(script: str, timeout: float) -> str:
    try:
        done = subprocess.run(
            ["bash", "-lc", script],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=os.environ.copy(),
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        out = exc.stdout or ""
        err = exc.stderr or ""
        if isinstance(out, bytes):
            out = out.decode("utf-8", "replace")
        if isinstance(err, bytes):
            err = err.decode("utf-8", "replace")
        return f"{out}\n{err}"
    return f"{done.stdout}\n{done.stderr}"


def _probe(kind: str) -> str:
    if kind == "active":
        setup = (
            "from std_srvs.srv import Trigger\n"
            "client = node.create_client(Trigger, '/lifecycle_manager_navigation/is_active')"
        )
        step = (
            "if client.service_is_ready():\n"
            "    future = client.call_async(Trigger.Request())\n"
            "    rclpy.spin_until_future_complete(node, future, timeout_sec=0.4)\n"
            "    result = future.result() if future.done() else None\n"
            "    found = bool(result and result.success)\n"
            "else:\n"
            "    rclpy.spin_once(node, timeout_sec=0.2)\n"
        )
        mark = "NAV_READY"
    else:
        setup = ""
        step = (
            "rclpy.spin_once(node, timeout_sec=0.2)\n"
            "nodes = node.get_node_names_and_namespaces()\n"
            "found = any(ns.rstrip('/') + '/' + name == '/bt_navigator' for name, ns in nodes)\n"
        )
        mark = "NAV_UP"
    body = "\n".join(
        [
            "import time",
            "import rclpy",
            "from rclpy.node import Node",
            "rclpy.init()",
            "node = Node('nav_ready_probe')",
            setup,
            "found = False",
            "deadline = time.time() + 1.2",
            "while time.time() < deadline and not found:",
            *["    " + line for line in step.split("\n") if line],
            f"print('{mark}' if found else 'NAV_WAIT')",
            "node.destroy_node()",
            "rclpy.shutdown()",
        ]
    )
    return f"python3 - <<'PY'\n{body}\nPY"


def _hit(out: str, mark: str) -> bool:
    return any(line.strip() == mark for line in out.split("\n"))


def _nav_ready(child: subprocess.Popen[str], aborted) -> bool:
    import time

    deadline = time.time() + 60.0
    while time.time() < deadline:
        if aborted() or child.poll() is not None:
            return False
        if _hit(_bash(_probe("active"), 3.0), "NAV_READY"):
            return True
        time.sleep(0.3)
    return False


def _navigator_up() -> bool:
    return _hit(_bash(_probe("navigator"), 3.0), "NAV_UP")


def _zero_twist() -> None:
    _bash(
        "\n".join(
            [
                "python3 - <<'PY'",
                "import random",
                "import time",
                "import rclpy",
                "from geometry_msgs.msg import Twist",
                "rclpy.init()",
                "node = rclpy.create_node('nav_stop_%d' % random.randrange(1_000_000_000))",
                "pub = node.create_publisher(Twist, 'cmd_vel', 10)",
                "deadline = time.time() + 1.2",
                "while time.time() < deadline:",
                "    pub.publish(Twist())",
                "    rclpy.spin_once(node, timeout_sec=0.05)",
                "node.destroy_node()",
                "rclpy.shutdown()",
                "PY",
            ]
        ),
        4.0,
    )
