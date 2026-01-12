"""
RAG Integration Plugin for Cognia

Demonstrates the Vector/RAG API for semantic search and knowledge retrieval.
"""

from cognia import (
    Plugin, tool, hook,
    VectorDocument, VectorSearchOptions, VectorFilter,
    CollectionOptions, ExtendedPluginContext,
)
from typing import List, Dict, Any, Optional
import hashlib


class RAGIntegrationPlugin(Plugin):
    """RAG Integration Plugin - Semantic search and knowledge management"""
    
    name = "rag-integration"
    version = "1.0.0"
    description = "Semantic search and RAG capabilities for enhanced knowledge retrieval"
    capabilities = ["tools", "hooks"]
    permissions = ["vector:read", "vector:write", "session:read"]
    
    def __init__(self, context: Optional[ExtendedPluginContext] = None):
        super().__init__(context)
        self._default_collection = "plugin_knowledge"
    
    async def on_enable(self):
        """Initialize the plugin and create default collection"""
        await super().on_enable()
        
        if self.context.vector:
            try:
                collections = await self.context.vector.list_collections()
                if self._default_collection not in collections:
                    await self.context.vector.create_collection(
                        self._default_collection,
                        CollectionOptions(
                            embedding_model="text-embedding-3-small",
                            dimensions=1536,
                        )
                    )
                    self.logger.log_info(f"Created collection: {self._default_collection}")
            except Exception as e:
                self.logger.log_error(f"Failed to initialize collection: {e}")
    
    @tool(
        name="add_knowledge",
        description="Add documents to the knowledge base for semantic search",
        parameters={
            "documents": {
                "type": "array",
                "description": "List of documents to add. Each document should have 'content' and optional 'metadata'."
            },
            "collection": {
                "type": "string",
                "description": "Collection name (default: plugin_knowledge)",
                "required": False
            }
        }
    )
    async def add_knowledge(
        self,
        documents: List[Dict[str, Any]],
        collection: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add documents to the vector store"""
        if not self.context.vector:
            return {"success": False, "error": "Vector API not available"}
        
        collection_name = collection or self._default_collection
        
        # Convert to VectorDocument format
        vector_docs = []
        for doc in documents:
            content = doc.get("content", "")
            metadata = doc.get("metadata", {})
            
            # Generate a deterministic ID from content if not provided
            doc_id = doc.get("id") or hashlib.md5(content.encode()).hexdigest()[:16]
            
            vector_docs.append(VectorDocument(
                id=doc_id,
                content=content,
                metadata=metadata,
            ))
        
        try:
            ids = await self.context.vector.add_documents(collection_name, vector_docs)
            return {
                "success": True,
                "added_count": len(ids),
                "document_ids": ids,
                "collection": collection_name,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="search_knowledge",
        description="Search the knowledge base using semantic similarity",
        parameters={
            "query": {
                "type": "string",
                "description": "Search query"
            },
            "top_k": {
                "type": "integer",
                "description": "Number of results to return (default: 5)",
                "required": False
            },
            "threshold": {
                "type": "number",
                "description": "Minimum similarity score (0-1, default: 0.7)",
                "required": False
            },
            "collection": {
                "type": "string",
                "description": "Collection to search (default: plugin_knowledge)",
                "required": False
            },
            "filters": {
                "type": "object",
                "description": "Metadata filters (e.g., {'source': 'docs'})",
                "required": False
            }
        }
    )
    async def search_knowledge(
        self,
        query: str,
        top_k: int = 5,
        threshold: float = 0.7,
        collection: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Search documents by semantic similarity"""
        if not self.context.vector:
            return {"success": False, "error": "Vector API not available"}
        
        collection_name = collection or self._default_collection
        
        # Build search options
        search_options = VectorSearchOptions(
            top_k=top_k,
            threshold=threshold,
            include_metadata=True,
        )
        
        # Add filters if provided
        if filters:
            search_options.filters = [
                VectorFilter(key=k, value=v, operation="eq")
                for k, v in filters.items()
            ]
        
        try:
            results = await self.context.vector.search(
                collection_name,
                query,
                search_options
            )
            
            return {
                "success": True,
                "query": query,
                "result_count": len(results),
                "results": [
                    {
                        "id": r.id,
                        "content": r.content,
                        "score": r.score,
                        "metadata": r.metadata,
                    }
                    for r in results
                ],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="get_embedding",
        description="Generate embeddings for text",
        parameters={
            "text": {
                "type": "string",
                "description": "Text to embed"
            }
        }
    )
    async def get_embedding(self, text: str) -> Dict[str, Any]:
        """Generate embedding for text"""
        if not self.context.vector:
            return {"success": False, "error": "Vector API not available"}
        
        try:
            embedding = await self.context.vector.embed(text)
            return {
                "success": True,
                "dimensions": len(embedding),
                "embedding": embedding[:10],  # Return first 10 for preview
                "embedding_preview": f"[{embedding[0]:.4f}, {embedding[1]:.4f}, ... ({len(embedding)} dims)]",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="list_collections",
        description="List all vector collections"
    )
    async def list_collections(self) -> Dict[str, Any]:
        """List all collections in the vector store"""
        if not self.context.vector:
            return {"success": False, "error": "Vector API not available"}
        
        try:
            collections = await self.context.vector.list_collections()
            collection_info = []
            
            for name in collections:
                try:
                    info = await self.context.vector.get_collection_info(name)
                    collection_info.append({
                        "name": name,
                        "document_count": info.document_count,
                        "dimensions": info.dimensions,
                    })
                except Exception:
                    collection_info.append({"name": name})
            
            return {
                "success": True,
                "collection_count": len(collections),
                "collections": collection_info,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @tool(
        name="delete_documents",
        description="Delete documents from the knowledge base",
        parameters={
            "document_ids": {
                "type": "array",
                "description": "List of document IDs to delete"
            },
            "collection": {
                "type": "string",
                "description": "Collection name (default: plugin_knowledge)",
                "required": False
            }
        }
    )
    async def delete_documents(
        self,
        document_ids: List[str],
        collection: Optional[str] = None
    ) -> Dict[str, Any]:
        """Delete documents from the vector store"""
        if not self.context.vector:
            return {"success": False, "error": "Vector API not available"}
        
        collection_name = collection or self._default_collection
        
        try:
            await self.context.vector.delete_documents(collection_name, document_ids)
            return {
                "success": True,
                "deleted_count": len(document_ids),
                "collection": collection_name,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @hook("on_message_receive")
    async def on_message_receive(self, message):
        """Automatically index received messages for future reference"""
        if not self.context.vector:
            return message
        
        # Only index if auto-indexing is enabled
        if not self.config.get("autoIndexMessages", False):
            return message
        
        try:
            await self.context.vector.add_documents(
                self._default_collection,
                [VectorDocument(
                    content=message.content,
                    metadata={
                        "type": "message",
                        "role": message.role,
                        "message_id": message.id,
                    }
                )]
            )
        except Exception as e:
            self.logger.log_warn(f"Failed to index message: {e}")
        
        return message


# Export the plugin class
__all__ = ["RAGIntegrationPlugin"]
