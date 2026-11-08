"""Automated Disaster-Recovery Script for CAVA on Dokploy (Raspberry Pi 5).

Reconstructs the Cava project, backend, frontend, domains, ports, and
Cloudflare Zero Trust Tunnel on a fresh Dokploy instance in one command.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict
import urllib.error
import urllib.request

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DokployRestore")

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_ENV_PATH = ROOT_DIR / "backend" / ".env"
SECRETS_ENV_PATH = Path(__file__).resolve().parent / ".secrets.env"
REPO_URL = "https://github.com/yentini/cava-macro-system-.git"


def load_env_file(file_path: Path) -> Dict[str, str]:
    """Read key-value pairs from a .env file without external dependencies.

    Args:
        file_path: Path to the .env file.

    Returns:
        Dictionary of parsed environment variables.

    Raises:
        FileNotFoundError: If the required env file does not exist.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Missing required configuration file: {file_path}")
    parsed: Dict[str, str] = {}
    for raw_line in file_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            parsed[key.strip()] = val.strip()
    return parsed


def call_dokploy_api(base_url: str, api_key: str, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a POST request against the Dokploy REST API.

    Args:
        base_url: Dokploy server URL (e.g., http://192.168.1.45:3000).
        api_key: Dokploy API token from Settings -> Profile.
        endpoint: API procedure name (e.g., project.create).
        payload: JSON body dictionary.

    Returns:
        Parsed JSON response dictionary.

    Raises:
        RuntimeError: If the HTTP request fails.
    """
    url = f"{base_url.rstrip('/')}/api/{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            logger.info("[OK] %s", endpoint)
            return json.loads(body) if body and body != "true" else {}
    except urllib.error.HTTPError as exc:
        err_msg = exc.read().decode("utf-8")
        logger.error("API error on %s (%d): %s", endpoint, exc.code, err_msg)
        raise RuntimeError(f"Dokploy API call failed: {endpoint}") from exc


def configure_dockerfile_service(
    base_url: str,
    api_key: str,
    app_id: str,
    subpath: str,
) -> None:
    """Configure an application to build from the public Git repo using Dockerfile."""
    call_dokploy_api(base_url, api_key, "application.saveGitProvider", {
        "applicationId": app_id,
        "customGitUrl": REPO_URL,
        "customGitBranch": "main",
        "customGitBuildPath": subpath,
        "enableSubmodules": False,
    })
    call_dokploy_api(base_url, api_key, "application.saveBuildType", {
        "applicationId": app_id,
        "buildType": "dockerfile",
        "dockerfile": "Dockerfile",
        "dockerContextPath": subpath,
        "dockerBuildStage": "",
        "publishDirectory": None,
        "herokuVersion": "24",
        "railpackVersion": "0.15.4",
    })


def deploy_cloudflare_tunnel(base_url: str, api_key: str, env_id: str, tunnel_token: str) -> None:
    """Create and deploy the Cloudflare Zero Trust Tunnel compose service."""
    created = call_dokploy_api(base_url, api_key, "compose.create", {
        "name": "cloudflare-tunnel",
        "description": "Cloudflare Zero Trust Tunnel for cabrerizolab.net",
        "environmentId": env_id,
        "composeType": "docker-compose",
        "appName": "cloudflare-tunnel",
    })
    compose_id = created["composeId"]
    compose_yaml = (
        "services:\n"
        "  cloudflared:\n"
        "    image: cloudflare/cloudflared:latest\n"
        "    container_name: cloudflared-cabrerizolab\n"
        "    restart: unless-stopped\n"
        "    network_mode: host\n"
        f"    command: tunnel --no-autoupdate run --token {tunnel_token}\n"
    )
    call_dokploy_api(base_url, api_key, "compose.update", {
        "composeId": compose_id,
        "composeFile": compose_yaml,
        "sourceType": "raw",
    })
    call_dokploy_api(base_url, api_key, "compose.deploy", {
        "composeId": compose_id,
        "title": "Restore Cloudflare Tunnel",
    })


def restore_all() -> None:
    """Orchestrate full restoration of Project Cava, Backend, Frontend, and Tunnel."""
    secrets = load_env_file(SECRETS_ENV_PATH)
    backend_env = load_env_file(BACKEND_ENV_PATH)
    base_url = secrets["DOKPLOY_URL"]
    api_key = secrets["DOKPLOY_API_KEY"]

    proj = call_dokploy_api(base_url, api_key, "project.create", {
        "name": "Cava",
        "description": "CAVA Macro Decision System",
    })
    env_id = proj["environment"]["environmentId"]

    back = call_dokploy_api(base_url, api_key, "application.create", {
        "name": "backend",
        "appName": "cava-backend-mtjg6k",
        "environmentId": env_id,
    })
    back_id = back["applicationId"]
    configure_dockerfile_service(base_url, api_key, back_id, "/backend")
    backend_env["PORT"] = "8000"
    backend_env["ENVIRONMENT"] = "production"
    env_str = "\n".join(f"{k}={v}" for k, v in backend_env.items())
    call_dokploy_api(base_url, api_key, "application.saveEnvironment", {
        "applicationId": back_id,
        "env": env_str,
        "createEnvFile": True,
    })
    call_dokploy_api(base_url, api_key, "port.create", {
        "applicationId": back_id,
        "publishedPort": 8000,
        "targetPort": 8000,
        "protocol": "tcp",
        "publishMode": "ingress",
    })
    call_dokploy_api(base_url, api_key, "application.deploy", {"applicationId": back_id})

    front = call_dokploy_api(base_url, api_key, "application.create", {
        "name": "frontend",
        "appName": "cava-frontend-kfkhz3",
        "environmentId": env_id,
    })
    front_id = front["applicationId"]
    configure_dockerfile_service(base_url, api_key, front_id, "/frontend")
    call_dokploy_api(base_url, api_key, "domain.create", {
        "applicationId": front_id,
        "host": "cava.cabrerizolab.net",
        "port": 80,
        "https": False,
        "certificateType": "none",
        "path": "/",
        "domainType": "application",
    })
    call_dokploy_api(base_url, api_key, "port.create", {
        "applicationId": front_id,
        "publishedPort": 8080,
        "targetPort": 80,
        "protocol": "tcp",
        "publishMode": "ingress",
    })
    call_dokploy_api(base_url, api_key, "application.deploy", {"applicationId": front_id})

    deploy_cloudflare_tunnel(base_url, api_key, env_id, secrets["CLOUDFLARE_TUNNEL_TOKEN"])
    logger.info("Full CAVA Homelab restoration triggered successfully!")


if __name__ == "__main__":
    restore_all()
