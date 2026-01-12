"""
Session Manager Plugin for Cognia

Demonstrates the Session API for managing chat sessions, messages, and exports.
"""

from cognia import (
    Plugin, tool, hook, command,
    Session, SessionFilter, ExportFormat, ExportOptions,
    ExtendedPluginContext,
)
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


class SessionManagerPlugin(Plugin):
    """Session Manager Plugin - Advanced session and message management"""
    
    name = "session-manager"
    version = "1.0.0"
    description = "Advanced session management, backup, and export capabilities"
    capabilities = ["tools", "hooks", "commands"]
    permissions = ["session:read", "session:write", "export:session"]
    
    def __init__(self, context: Optional[ExtendedPluginContext] = None):
        super().__init__(context)
        self._session_stats_cache: Dict[str, Dict[str, Any]] = {}
    
    async def on_enable(self):
        """Initialize plugin"""
        await super().on_enable()
        self.logger.log_info("Session Manager Plugin enabled")
    
    @tool(
        name="list_sessions",
        description="List all chat sessions with optional filtering",
        parameters={
            "limit": {
                "type": "integer",
                "description": "Maximum number of sessions to return",
                "required": False
            },
            "sort_by": {
                "type": "string",
                "description": "Sort by field (createdAt, updatedAt, title)",
                "enum": ["createdAt", "updatedAt", "title"],
                "required": False
            },
            "has_messages": {
                "type": "boolean",
                "description": "Only include sessions with messages",
                "required": False
            }
        }
    )
    async def list_sessions(
        self,
        limit: int = 20,
        sort_by: str = "updatedAt",
        has_messages: Optional[bool] = None
    ) -> Dict[str, Any]:
        """List sessions with filtering options"""
        if not self.context.session:
            return {"success": False, "error": "Session API not available"}
        
        try:
            filter_opts = SessionFilter(
                limit=limit,
                sort_by=sort_by,
                sort_order="desc",
                has_messages=has_messages,
            )
            
            sessions = await self.context.session.list_sessions(filter_opts)
            
            return {
                "success": True,
                "count": len(sessions),
                "sessions": [
                    {
                        "id": s.id,
                        "title": s.title,
                        "mode": s.mode.value if hasattr(s.mode, 'value') else s.mode,
                        "created_at": str(s.created_at) if s.created_at else None,
                        "updated_at": str(s.updated_at) if s.updated_at else None,
                    }
                    for s in sessions
                ],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="get_session_stats",
        description="Get detailed statistics for a session",
        parameters={
            "session_id": {
                "type": "string",
                "description": "Session ID (uses current session if not provided)",
                "required": False
            }
        }
    )
    async def get_session_stats(
        self,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get detailed statistics for a session"""
        if not self.context.session:
            return {"success": False, "error": "Session API not available"}
        
        try:
            sid = session_id or self.context.session.get_current_session_id()
            if not sid:
                return {"success": False, "error": "No session ID provided and no active session"}
            
            stats = await self.context.session.get_session_stats(sid)
            session = await self.context.session.get_session(sid)
            
            return {
                "success": True,
                "session_id": sid,
                "title": session.title if session else "Unknown",
                "stats": {
                    "message_count": stats.message_count,
                    "user_messages": stats.user_message_count,
                    "assistant_messages": stats.assistant_message_count,
                    "total_tokens": stats.total_tokens,
                    "avg_response_time": f"{stats.average_response_time:.2f}s",
                    "branch_count": stats.branch_count,
                    "attachment_count": stats.attachment_count,
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="export_session",
        description="Export a session to various formats",
        parameters={
            "session_id": {
                "type": "string",
                "description": "Session ID to export (uses current if not provided)",
                "required": False
            },
            "format": {
                "type": "string",
                "description": "Export format",
                "enum": ["markdown", "json", "html", "pdf", "text"]
            },
            "include_metadata": {
                "type": "boolean",
                "description": "Include message metadata",
                "required": False
            }
        }
    )
    async def export_session(
        self,
        format: str = "markdown",
        session_id: Optional[str] = None,
        include_metadata: bool = False
    ) -> Dict[str, Any]:
        """Export a session to file"""
        if not self.context.session or not self.context.export:
            return {"success": False, "error": "Session or Export API not available"}
        
        try:
            sid = session_id or self.context.session.get_current_session_id()
            if not sid:
                return {"success": False, "error": "No session ID provided"}
            
            # Map format string to enum
            format_map = {
                "markdown": ExportFormat.MARKDOWN,
                "json": ExportFormat.JSON,
                "html": ExportFormat.HTML,
                "pdf": ExportFormat.PDF,
                "text": ExportFormat.TEXT,
            }
            
            export_format = format_map.get(format, ExportFormat.MARKDOWN)
            
            result = await self.context.export.export_session(
                sid,
                ExportOptions(
                    format=export_format,
                    include_metadata=include_metadata,
                    show_timestamps=True,
                )
            )
            
            if result.success:
                return {
                    "success": True,
                    "format": format,
                    "filename": result.filename,
                    "message": f"Session exported as {format}",
                }
            else:
                return {"success": False, "error": result.error}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="search_messages",
        description="Search messages across sessions",
        parameters={
            "query": {
                "type": "string",
                "description": "Search query"
            },
            "session_id": {
                "type": "string",
                "description": "Limit to specific session",
                "required": False
            },
            "limit": {
                "type": "integer",
                "description": "Maximum results",
                "required": False
            }
        }
    )
    async def search_messages(
        self,
        query: str,
        session_id: Optional[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Search messages containing query text"""
        if not self.context.session:
            return {"success": False, "error": "Session API not available"}
        
        try:
            results = []
            
            if session_id:
                sessions = [await self.context.session.get_session(session_id)]
            else:
                sessions = await self.context.session.list_sessions(
                    SessionFilter(limit=50, has_messages=True)
                )
            
            query_lower = query.lower()
            
            for session in sessions:
                if not session:
                    continue
                    
                messages = await self.context.session.get_messages(session.id)
                
                for msg in messages:
                    if query_lower in msg.content.lower():
                        results.append({
                            "session_id": session.id,
                            "session_title": session.title,
                            "message_id": msg.id,
                            "role": msg.role,
                            "content_preview": msg.content[:200] + "..." if len(msg.content) > 200 else msg.content,
                        })
                        
                        if len(results) >= limit:
                            break
                
                if len(results) >= limit:
                    break
            
            return {
                "success": True,
                "query": query,
                "result_count": len(results),
                "results": results,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="cleanup_old_sessions",
        description="Delete sessions older than specified days",
        parameters={
            "days": {
                "type": "integer",
                "description": "Delete sessions older than this many days"
            },
            "dry_run": {
                "type": "boolean",
                "description": "Preview without actually deleting",
                "required": False
            }
        },
        requires_approval=True
    )
    async def cleanup_old_sessions(
        self,
        days: int = 30,
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """Clean up old sessions"""
        if not self.context.session:
            return {"success": False, "error": "Session API not available"}
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            sessions = await self.context.session.list_sessions(
                SessionFilter(created_before=cutoff_date, limit=100)
            )
            
            if dry_run:
                return {
                    "success": True,
                    "dry_run": True,
                    "sessions_to_delete": len(sessions),
                    "cutoff_date": str(cutoff_date),
                    "sessions": [
                        {"id": s.id, "title": s.title, "created_at": str(s.created_at)}
                        for s in sessions[:10]
                    ],
                    "message": f"Would delete {len(sessions)} sessions. Run with dry_run=false to execute.",
                }
            
            deleted_count = 0
            for session in sessions:
                await self.context.session.delete_session(session.id)
                deleted_count += 1
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "cutoff_date": str(cutoff_date),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @command(
        name="new_session",
        description="Create a new chat session",
        shortcut="Ctrl+Shift+N"
    )
    async def cmd_new_session(self, args: List[str]) -> None:
        """Create a new session via command"""
        if not self.context.session:
            return
        
        title = " ".join(args) if args else "New Session"
        session = await self.context.session.create_session(title=title)
        await self.context.session.switch_session(session.id)
        self.logger.log_info(f"Created new session: {session.title}")
    
    @hook("on_session_create")
    def on_session_created(self, session_id: str):
        """Log when a new session is created"""
        self.logger.log_debug(f"New session created: {session_id}")
    
    @hook("on_session_switch")
    def on_session_switched(self, session_id: str):
        """Log when switching sessions"""
        self.logger.log_debug(f"Switched to session: {session_id}")
        # Clear stats cache for performance
        self._session_stats_cache.clear()


# Export the plugin class
__all__ = ["SessionManagerPlugin"]
