import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
import subprocess
import uvicorn

def free_port(port: int = 8000):
    if sys.platform != "win32":
        return
    try:
        output = subprocess.check_output(
            f'netstat -ano | findstr ":{port}" | findstr "LISTENING"',
            shell=True,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        my_pid = os.getpid()
        for line in output.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5:
                pid = int(parts[-1])
                if pid != my_pid and pid > 0:
                    print(f"[*] Port {port} is occupied by PID {pid}. Freeing port...")
                    subprocess.run(f"taskkill /f /pid {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

if __name__ == "__main__":
    free_port(8000)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

