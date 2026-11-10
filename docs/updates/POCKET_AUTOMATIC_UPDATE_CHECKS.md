# Pocket automatic update checks

## Detection paths

Pocket retains its existing immediate update check when the app opens or resumes. In addition, `PocketUpdateWorker` schedules one unique native WorkManager periodic check when MainActivity starts.

- Cadence: 24 hours (Android controls the exact execution time).
- Constraints: connected network and battery not low.
- Persistence: WorkManager persists the unique periodic request across process restarts and device reboot.
- Duplicate prevention: `enqueueUniquePeriodicWork(..., KEEP, ...)` prevents each app launch from creating another repeating schedule.
- Release source: GitHub Releases API for `Antarezka/Merzkava-Pocket`.
- Validation: release tag, manifest package name/build number, trusted GitHub release asset paths, APK filename, SHA-256 format, and APK size are checked before notification.
- Notification: uses the existing Pocket Updates channel and notification ID; the build number is persisted in the same native SharedPreferences key used by the foreground checker so one build is not announced twice.
- Action: tapping the background notice opens Pocket. The existing in-app update screen remains responsible for showing full release data and starting the verified APK download/install flow.

## Platform behavior

WorkManager periodic work has a 15-minute minimum interval, but Pocket intentionally uses 24 hours to avoid unnecessary background requests. Android may defer the run to satisfy constraints and battery policies. A force-stopped app cannot be guaranteed to run background work until the user launches it again. On Android 13+, notification permission must be granted for the background notice to appear.

The worker does not run a foreground service and does not keep Pocket alive continuously.
