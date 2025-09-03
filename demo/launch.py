# SPDX-License-Identifier: Apache-2.0 
# Copyright 2024 Dr Chris Culnane

import subprocess
import os
import time
from threading import Thread

DEBUG = True
log_id = None

def get_demo_folder():
    return os.path.dirname(os.path.realpath(__file__))

def get_log_folder():
    global log_id

    if not log_id:
        log_id = str(int(time.time_ns() / 1000000))

    log_folder_path = get_demo_folder() + "/logs/" + log_id

    if not os.path.exists(log_folder_path):
        os.makedirs(log_folder_path, exist_ok=True)

    return log_folder_path

def get_server_properties():
    servers = {}

    servers["drive-app"] = {
        "description": "Cloud Drive web app",
        "path": "cloud-drive-web/web-app",
        "addr": "127.0.0.1",
        "port": "5001",
        "logfile": get_log_folder() + "/drive_app_server.log"
    }

    servers["drive-agent"] = {
        "description": "Cloud Drive provider agent",
        "path": "cloud-drive-web/provider-agent",
        "addr": "127.0.0.2",
        "port": "5002",
        "logfile": get_log_folder() + "/drive_agent_server.log"
    }

    servers["notes"] = {
        "description": "Cloud Notes",
        "path": "cloud-notes",
        "addr": "127.0.0.3",
        "port": "5003",
        "logfile": get_log_folder() + "/notes_server.log"
    }

    return servers

def get_bind_for(server_name):
    servers = get_server_properties()
    addr = servers[server_name]["addr"]
    port = servers[server_name]["port"]

    return f"{addr}:{port}"

def start_flask_server(description, path, addr, port, logfile):
    log_file_fd = open(logfile, "a")
    start_cmd = ["flask", "--app", path, "run", "--host", addr, "--port", port]

    if(DEBUG):
        start_cmd.append("--debug")

    try:
        subprocess.run(start_cmd, check=True, stdout=log_file_fd, stderr=log_file_fd)
    except Exception as e:
        rel_log = os.path.relpath(logfile, os.getcwd()).replace(" ", "\\ ")
        print(
            f"Error while starting server for {description}: \n"
            f"  {e}\n"
            f"  Run `cat {rel_log}` to see log output\n"
        )

def launch_server_thread(description, path, addr, port, logfile):
    server_thread = Thread(target=start_flask_server, args=[description, path, addr, port, logfile])
    server_thread.start()
    return server_thread

def link(url):
    return f"\033]8;;{url}\033\\{url}\033]8;;\033\\"

if __name__ == "__main__":
    servers = get_server_properties()

    print("\nStarting web servers for the following services...")
    print("    Cloud Drive:")
    print(f"      web app:         {get_bind_for('drive-app')}")
    print(f"      provider agent:  {get_bind_for('drive-agent')}")
    print(f"    Cloud Notes:       {get_bind_for('notes')}\n")

    print(f"Logs saved to {get_log_folder()}\n")

    threads = []

    for server in servers.values():
        threads.append(launch_server_thread(**server))

    time.sleep(1)

    if all(thread.is_alive() for thread in threads):
        drive_link = link(f"http://{get_bind_for('drive-app')}")
        notes_link = link(f"http://{get_bind_for('notes')}")

        print("All servers launched successfully. You can now open the apps in your browser:")
        print(f"    Cloud Drive: {drive_link}")
        print(f"    Cloud Notes: {notes_link}")
