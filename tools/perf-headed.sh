#!/bin/bash
# Runs perf-bench headed on the laptop's own display: wakes the screen, keeps it awake for the run.
export WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
gdbus call --session --dest org.gnome.ScreenSaver --object-path /org/gnome/ScreenSaver --method org.gnome.ScreenSaver.SetActive false >/dev/null
cat /proc/loadavg
exec gnome-session-inhibit --inhibit idle node tools/perf-bench.cjs --headed "$@"
