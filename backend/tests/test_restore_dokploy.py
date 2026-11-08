"""Unit tests for the Dokploy disaster-recovery script."""
from pathlib import Path
from unittest.mock import MagicMock, patch
import urllib.error
import pytest

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from backups.restore_dokploy import call_dokploy_api, load_env_file


def test_load_env_file_success(tmp_path: Path):
    # Arrange
    env_file = tmp_path / "sample.env"
    env_file.write_text("# Comment\nKEY_ONE=val1\nKEY_TWO = val2 \n", encoding="utf-8")

    # Act
    result = load_env_file(env_file)

    # Assert
    assert result == {"KEY_ONE": "val1", "KEY_TWO": "val2"}


def test_load_env_file_missing_raises(tmp_path: Path):
    # Arrange
    missing = tmp_path / "nonexistent.env"

    # Act & Assert
    with pytest.raises(FileNotFoundError):
        load_env_file(missing)


@patch("urllib.request.urlopen")
def test_call_dokploy_api_success(mock_urlopen: MagicMock):
    # Arrange
    mock_resp = MagicMock()
    mock_resp.read.return_value = b'{"projectId": "123"}'
    mock_urlopen.return_value.__enter__.return_value = mock_resp

    # Act
    result = call_dokploy_api("http://192.168.1.45:3000", "fake-key", "project.create", {"name": "Cava"})

    # Assert
    assert result == {"projectId": "123"}


@patch("urllib.request.urlopen")
def test_call_dokploy_api_http_error_raises(mock_urlopen: MagicMock):
    # Arrange
    err = urllib.error.HTTPError(
        url="http://192.168.1.45:3000/api/project.create",
        code=400,
        msg="Bad Request",
        hdrs=None,  # type: ignore[arg-type]
        fp=MagicMock(read=lambda: b"invalid payload"),
    )
    mock_urlopen.side_effect = err

    # Act & Assert
    with pytest.raises(RuntimeError, match="Dokploy API call failed"):
        call_dokploy_api("http://192.168.1.45:3000", "fake-key", "project.create", {})
