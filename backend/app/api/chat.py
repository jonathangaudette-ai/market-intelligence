"""Chat API endpoints."""

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.models.chat import ChatRequest, ChatResponse, ConversationHistory, Message
from app.services.rag_engine import RAGEngine
from app.db import get_db
from app.db.postgres import Conversation, Message as DBMessage

router = APIRouter(prefix="/api/chat", tags=["chat"])
rag = RAGEngine()


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint with RAG.

    Process user message, retrieve relevant context, and generate response.
    """
    try:
        # Get or create conversation
        conversation_id = request.conversation_id or f"conv_{uuid.uuid4().hex[:16]}"

        # Get conversation history if exists
        history = []
        db = get_db()

        async with db.session() as session:
            if request.conversation_id:
                # Fetch existing conversation
                stmt = select(DBMessage).where(
                    DBMessage.conversation_id == request.conversation_id
                ).order_by(DBMessage.created_at)

                result = await session.execute(stmt)
                messages = result.scalars().all()

                # Convert to history format
                history = [
                    {"role": msg.role, "content": msg.content}
                    for msg in messages
                ]

            # Perform RAG query
            result = await rag.query(
                user_query=request.message,
                conversation_history=history,
                filters=request.filters,
                top_k=request.top_k
            )

            # Save conversation if new
            if not request.conversation_id:
                new_conv = Conversation(
                    id=conversation_id,
                    title=request.message[:100],  # Use first 100 chars as title
                    created_at=datetime.utcnow()
                )
                session.add(new_conv)

            # Save user message
            user_msg = DBMessage(
                conversation_id=conversation_id,
                role="user",
                content=request.message,
                created_at=datetime.utcnow()
            )
            session.add(user_msg)

            # Save assistant message
            assistant_msg = DBMessage(
                conversation_id=conversation_id,
                role="assistant",
                content=result["answer"],
                sources=result["sources"],
                tokens_used=result.get("tokens_used"),
                processing_time_ms=result.get("processing_time_ms"),
                created_at=datetime.utcnow()
            )
            session.add(assistant_msg)

            await session.commit()

        # Return response
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            conversation_id=conversation_id,
            model_used=result["model_used"],
            tokens_used=result.get("tokens_used"),
            processing_time_ms=result.get("processing_time_ms")
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat request: {str(e)}"
        )


@router.get("/history/{conversation_id}", response_model=ConversationHistory)
async def get_conversation_history(conversation_id: str):
    """
    Get conversation history.

    Args:
        conversation_id: Conversation identifier

    Returns:
        Full conversation with all messages
    """
    try:
        db = get_db()

        async with db.session() as session:
            # Fetch conversation
            conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
            conv_result = await session.execute(conv_stmt)
            conversation = conv_result.scalar_one_or_none()

            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation {conversation_id} not found"
                )

            # Fetch messages
            msg_stmt = select(DBMessage).where(
                DBMessage.conversation_id == conversation_id
            ).order_by(DBMessage.created_at)

            msg_result = await session.execute(msg_stmt)
            messages = msg_result.scalars().all()

            # Convert to response format
            message_list = [
                Message(
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.created_at
                )
                for msg in messages
            ]

            return ConversationHistory(
                conversation_id=conversation.id,
                messages=message_list,
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
                metadata=conversation.metadata
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching conversation history: {str(e)}"
        )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str):
    """
    Delete a conversation and all its messages.

    Args:
        conversation_id: Conversation identifier
    """
    try:
        db = get_db()

        async with db.session() as session:
            # Fetch conversation
            stmt = select(Conversation).where(Conversation.id == conversation_id)
            result = await session.execute(stmt)
            conversation = result.scalar_one_or_none()

            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation {conversation_id} not found"
                )

            # Delete conversation (cascades to messages)
            await session.delete(conversation)
            await session.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting conversation: {str(e)}"
        )


@router.get("/conversations")
async def list_conversations(limit: int = 50, offset: int = 0):
    """
    List all conversations.

    Args:
        limit: Maximum number of conversations to return
        offset: Number of conversations to skip

    Returns:
        List of conversations with metadata
    """
    try:
        db = get_db()

        async with db.session() as session:
            stmt = select(Conversation).order_by(
                Conversation.updated_at.desc()
            ).limit(limit).offset(offset)

            result = await session.execute(stmt)
            conversations = result.scalars().all()

            return {
                "conversations": [
                    {
                        "id": conv.id,
                        "title": conv.title,
                        "created_at": conv.created_at.isoformat(),
                        "updated_at": conv.updated_at.isoformat(),
                        "metadata": conv.metadata
                    }
                    for conv in conversations
                ],
                "count": len(conversations),
                "offset": offset
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing conversations: {str(e)}"
        )
