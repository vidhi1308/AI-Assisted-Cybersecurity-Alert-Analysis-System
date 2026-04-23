from fastapi import HTTPException
from .alert_service import AlertService
from pathlib import Path

from fastapi import FastAPI

from .detection_loader import load_detections

app = FastAPI(title="Alert Trainer Backend")

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # .../project_root
VENDOR_DIR = PROJECT_ROOT / "vendor"
alert_service = AlertService(VENDOR_DIR, seed=42)



@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/detections")
def get_detections():
    detections = load_detections(VENDOR_DIR)
    return {
        "count": len(detections),
        "vendor_dir": str(VENDOR_DIR),
        "detections": detections,
    }
@app.post("/detections/{detection_id}/generate-alert")
def generate_alert(detection_id: str):
    try:
        alert = alert_service.generate_alert(detection_id)
        return alert
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate alert: {e}")
