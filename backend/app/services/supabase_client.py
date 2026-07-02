from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


def create_supabase_client() -> Client:
    settings = get_settings()
    settings.require_supabase()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase_client() -> Client:
    return create_supabase_client()
