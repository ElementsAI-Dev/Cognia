---
description: Create API routes and endpoints following Next.js App Router conventions.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Extract from user input:
   - Route path (e.g., `/api/users`, `/api/chat/stream`)
   - HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
   - Options: `--stream` for streaming responses

2. **Create Route File**:
   - Location: `app/api/<path>/route.ts`
   - Streaming: Add `+stream` or use Response streaming

3. **Generate Route Handler**:

   **Basic Route**:

   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   
   export async function GET(request: NextRequest) {
     try {
       // Implementation
       const data = await fetchData()
       
       return NextResponse.json({ data })
     } catch (error) {
       console.error('API error:', error)
       return NextResponse.json(
         { error: 'Internal server error' },
         { status: 500 }
       )
     }
   }
   
   export async function POST(request: NextRequest) {
     try {
       const body = await request.json()
       
       // Validate input
       if (!body.requiredField) {
         return NextResponse.json(
           { error: 'Missing required field' },
           { status: 400 }
         )
       }
       
       // Process request
       const result = await processData(body)
       
       return NextResponse.json({ result }, { status: 201 })
     } catch (error) {
       console.error('API error:', error)
       return NextResponse.json(
         { error: 'Internal server error' },
         { status: 500 }
       )
     }
   }
   ```

   **Dynamic Route** (`app/api/users/[id]/route.ts`):

   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   
   interface RouteParams {
     params: { id: string }
   }
   
   export async function GET(
     request: NextRequest,
     { params }: RouteParams
   ) {
     const { id } = params
     
     const user = await getUser(id)
     
     if (!user) {
       return NextResponse.json(
         { error: 'User not found' },
         { status: 404 }
       )
     }
     
     return NextResponse.json({ user })
   }
   ```

   **Streaming Route** (AI/LLM):

   ```typescript
   import { NextRequest } from 'next/server'
   import { streamText } from 'ai'
   
   export async function POST(request: NextRequest) {
     const { messages, model } = await request.json()
     
     const result = streamText({
       model: getModel(model),
       messages,
     })
     
     return result.toDataStreamResponse()
   }
   ```

   **SSE (Server-Sent Events)**:

   ```typescript
   import { NextRequest } from 'next/server'
   
   export async function GET(request: NextRequest) {
     const encoder = new TextEncoder()
     
     const stream = new ReadableStream({
       async start(controller) {
         const send = (data: object) => {
           controller.enqueue(
             encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
           )
         }
         
         // Send events
         for await (const item of dataSource) {
           send(item)
         }
         
         controller.close()
       },
     })
     
     return new Response(stream, {
       headers: {
         'Content-Type': 'text/event-stream',
         'Cache-Control': 'no-cache',
         Connection: 'keep-alive',
       },
     })
   }
   ```

4. **Add Request Validation**:

   ```typescript
   import { z } from 'zod'
   
   const requestSchema = z.object({
     name: z.string().min(1),
     email: z.string().email(),
     age: z.number().optional(),
   })
   
   export async function POST(request: NextRequest) {
     const body = await request.json()
     
     const result = requestSchema.safeParse(body)
     
     if (!result.success) {
       return NextResponse.json(
         { error: 'Validation failed', details: result.error.issues },
         { status: 400 }
       )
     }
     
     const validData = result.data
     // ...
   }
   ```

5. **Add Authentication** (if needed):

   ```typescript
   export async function GET(request: NextRequest) {
     const authHeader = request.headers.get('authorization')
     
     if (!authHeader?.startsWith('Bearer ')) {
       return NextResponse.json(
         { error: 'Unauthorized' },
         { status: 401 }
       )
     }
     
     const token = authHeader.slice(7)
     const user = await verifyToken(token)
     
     if (!user) {
       return NextResponse.json(
         { error: 'Invalid token' },
         { status: 401 }
       )
     }
     
     // Continue with authenticated request
   }
   ```

## Route Structure

```
app/api/
├── chat/
│   ├── route.ts           # /api/chat
│   └── stream/
│       └── route.ts       # /api/chat/stream
├── users/
│   ├── route.ts           # /api/users (GET all, POST create)
│   └── [id]/
│       └── route.ts       # /api/users/:id (GET, PUT, DELETE)
└── health/
    └── route.ts           # /api/health
```

## HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Response Patterns

```typescript
// Success with data
return NextResponse.json({ data })

// Success with message
return NextResponse.json({ message: 'Created successfully' }, { status: 201 })

// Error response
return NextResponse.json({ error: 'Error message' }, { status: 400 })

// No content
return new NextResponse(null, { status: 204 })
```

## Notes

- Use `NextRequest` and `NextResponse` from `next/server`
- Always handle errors with try/catch
- Validate input before processing
- Use appropriate HTTP status codes
- Add CORS headers if needed for external access
- Consider rate limiting for public APIs
