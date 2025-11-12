"""MCP (Model Context Protocol) client for integrations."""

import httpx
from typing import Any

from app.config import get_settings


class MCPClient:
    """Client for MCP integrations (Firecrawl, Brave Search, etc.)."""

    def __init__(self) -> None:
        """Initialize MCP client."""
        self.settings = get_settings()
        self.client = httpx.AsyncClient(timeout=60.0)

    async def close(self) -> None:
        """Close HTTP client."""
        await self.client.aclose()

    async def firecrawl_scrape(
        self,
        url: str,
        formats: list[str] | None = None
    ) -> dict[str, Any]:
        """
        Scrape a website using Firecrawl.

        Args:
            url: URL to scrape
            formats: Output formats (e.g., ['markdown', 'html'])

        Returns:
            Scraped content

        Note: Requires FIRECRAWL_API_KEY in environment
        """
        if not self.settings.firecrawl_api_key:
            raise ValueError("Firecrawl API key not configured")

        formats = formats or ["markdown"]

        response = await self.client.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={
                "Authorization": f"Bearer {self.settings.firecrawl_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "url": url,
                "formats": formats
            }
        )

        response.raise_for_status()
        return response.json()

    async def firecrawl_crawl(
        self,
        url: str,
        max_depth: int = 1,
        limit: int = 10
    ) -> dict[str, Any]:
        """
        Crawl a website using Firecrawl.

        Args:
            url: Base URL to crawl
            max_depth: Maximum depth to crawl
            limit: Maximum number of pages

        Returns:
            Crawl job information

        Note: Firecrawl crawl is async - you need to poll for results
        """
        if not self.settings.firecrawl_api_key:
            raise ValueError("Firecrawl API key not configured")

        response = await self.client.post(
            "https://api.firecrawl.dev/v1/crawl",
            headers={
                "Authorization": f"Bearer {self.settings.firecrawl_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "url": url,
                "maxDepth": max_depth,
                "limit": limit,
                "scrapeOptions": {
                    "formats": ["markdown"]
                }
            }
        )

        response.raise_for_status()
        return response.json()

    async def brave_search(
        self,
        query: str,
        count: int = 10,
        freshness: str | None = None
    ) -> dict[str, Any]:
        """
        Search using Brave Search API.

        Args:
            query: Search query
            count: Number of results
            freshness: Time filter (e.g., 'pd' for past day, 'pw' for past week)

        Returns:
            Search results

        Note: Requires BRAVE_API_KEY in environment
        """
        if not self.settings.brave_api_key:
            raise ValueError("Brave API key not configured")

        params = {
            "q": query,
            "count": count
        }

        if freshness:
            params["freshness"] = freshness

        response = await self.client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": self.settings.brave_api_key
            },
            params=params
        )

        response.raise_for_status()
        return response.json()


# Singleton instance
_mcp_client: MCPClient | None = None


def get_mcp_client() -> MCPClient:
    """Get MCP client instance."""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
    return _mcp_client
