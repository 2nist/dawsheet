This folder contains helper PowerShell scripts to manage the local Java proxy.

Files:

- `start-proxy.ps1` — start the proxy detached, rotate existing `proxy.log`, writes stdout/stderr to `proxy.log`.
- `stop-proxy.ps1` — attempts to find and stop processes launched by the gradle wrapper or java instances tied to the proxy path.
- `status-proxy.ps1` — tail the `proxy.log` and show whether port 8080 is listening.

Usage examples (PowerShell):

Start (detached):

```
cd apps/proxy-java/scripts
.\start-proxy.ps1
```

Check status / logs:

```
.\status-proxy.ps1
Get-Content ..\proxy.log -Wait -Tail 100
```

Stop the proxy:

```
.\stop-proxy.ps1
```

Notes:

- The scripts are intentionally simple and avoid requiring elevated rights.
- For a production-style service, consider using `nssm` or a Windows Scheduled Task to run the wrapper at boot.
