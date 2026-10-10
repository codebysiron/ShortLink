from __future__ import annotations

import logging
import redis
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_redis_client, get_url_service
from app.api.schemas import ShortenRequest, ShortenResponse
from app.core.config import Settings, get_settings
from app.db.models import ShortLink
from app.services.url_service import ResolveStatus, UrlService

logger = logging.getLogger(__name__)
router = APIRouter()
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"


@router.get("/", include_in_schema=False)
def home() -> FileResponse:
    """Serve the small frontend from the same origin as the API."""
    return FileResponse(FRONTEND_DIR / "index.html")


@router.get("/health", tags=["ops"])
def health() -> dict[str, str]:
    return {"status": "ok"}


def _public_short_url(settings: Settings, short_code: str) -> str:
    base = str(settings.short_url_base).rstrip("/")
    return f"{base}/redirect/{short_code}"


@router.post(
    "/shorten",
    response_model=ShortenResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["URL Shortener"],
)
def shorten_url(
    body: ShortenRequest,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis_client),
    service: UrlService = Depends(get_url_service),
    settings: Settings = Depends(get_settings),
) -> ShortenResponse:
    try:
        result = service.shorten(
            db,
            redis_client,
            str(body.url),
            body.expires_in_days,
        )
    except RuntimeError as exc:
        logger.exception("shorten failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not create a short link. Try again.",
        ) from exc

    return ShortenResponse(
        short_code=result.short_code,
        short_url=_public_short_url(settings, result.short_code),
        long_url=result.long_url,
        expires_at=result.expires_at,
    )


@router.get("/stats/{short_code}", tags=["URL Shortener"])
def get_url_stats(
    short_code: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    link = db.execute(
        select(ShortLink).where(ShortLink.short_code == short_code)
    ).scalar_one_or_none()

    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short link not found.",
        )

    return {
        "short_code": link.short_code,
        "short_url": _public_short_url(settings, link.short_code),
        "long_url": link.long_url,
        "click_count": link.click_count,
        "created_at": link.created_at,
        "expires_at": link.expires_at,
    }


def _resolve_link(
    short_code: str,
    db: Session,
    redis_client: redis.Redis,
    service: UrlService,
) -> str:
    resolved = service.resolve(db, redis_client, short_code)

    if resolved.status == ResolveStatus.EXPIRED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This short link has expired.",
        )
    if resolved.status in (ResolveStatus.NOT_FOUND, ResolveStatus.INVALID_CODE):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short link not found.",
        )
    if not resolved.long_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short link not found.",
        )

    return resolved.long_url


@router.get("/redirect/{short_code}", tags=["URL Shortener"])
def redirect_short_code(
    short_code: str,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis_client),
    service: UrlService = Depends(get_url_service),
) -> RedirectResponse:
    destination = _resolve_link(short_code, db, redis_client, service)
    return RedirectResponse(url=destination, status_code=status.HTTP_302_FOUND)


# Keep the original short-link format working for links created earlier.
@router.get("/{short_code}", include_in_schema=False)
def legacy_redirect(
    short_code: str,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis_client),
    service: UrlService = Depends(get_url_service),
) -> RedirectResponse:
    destination = _resolve_link(short_code, db, redis_client, service)
    return RedirectResponse(url=destination, status_code=status.HTTP_302_FOUND)
