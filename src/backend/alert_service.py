from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

# alert_generator.py is located at: C:\Users\sharm\FINAL PROJECT\src\alert_generator.py
from src.alert_generator import (
    RandomAlertState,
    sentinel_yaml_to_random_alert_json,
)


class AlertService:
    """
    Keeps a single RandomAlertState so IPs/emails don't repeat across alerts.
    """

    def __init__(self, vendor_dir: Path, seed: int = 42):
        self.vendor_dir = Path(vendor_dir)
        self.state = RandomAlertState(seed=seed)

    def _resolve_detection_path(self, detection_id: str) -> Path:
        """
        Resolve detection_id to an actual YAML file under vendor_dir.
        detection_id may be a filename or a relative path.
        """
        # 1) Try direct path
        candidate = (self.vendor_dir / detection_id).resolve()
        try:
            candidate.relative_to(self.vendor_dir.resolve())
            if candidate.exists() and candidate.is_file():
                return candidate
        except Exception:
            pass

        # 2) Recursive search by filename
        matches = list(self.vendor_dir.rglob(detection_id))
        matches = [m for m in matches if m.is_file()]

        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise FileNotFoundError(
                f"Multiple detection files matched '{detection_id}'. "
                f"Use a relative path instead."
            )

        raise FileNotFoundError(
            f"Detection file not found: {detection_id} under {self.vendor_dir}"
        )

    def generate_alert(self, detection_id: str) -> Dict[str, Any]:
        yaml_path = self._resolve_detection_path(detection_id)

        alert = sentinel_yaml_to_random_alert_json(
            yaml_path,
            state=self.state,
            as_json=False,  # return dict
        )
        return alert
