
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const connectedClients = new Map<string, WebSocket>()
const userConnections = new Map<string, string>() // userId -> socketId

// Add CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  console.log('Socket server request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  const upgradeHeader = req.headers.get("upgrade")
  const connectionHeader = req.headers.get("connection")
  
  console.log('Connection headers:', { upgrade: upgradeHeader, connection: connectionHeader })

  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    console.log('Invalid upgrade header, expected websocket, got:', upgradeHeader)
    return new Response("Expected WebSocket connection", { 
      status: 426,
      statusText: "Upgrade Required",
      headers: { 
        'Content-Type': 'text/plain',
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        ...corsHeaders
      }
    })
  }

  try {
    console.log('Attempting to upgrade WebSocket connection')
    const { socket, response } = Deno.upgradeWebSocket(req, {
      headers: corsHeaders
    })
    
    const socketId = crypto.randomUUID()
    let userId: string | null = null
    let isAlive = true
    let pingInterval: number | null = null

    console.log(`WebSocket upgrade successful: ${socketId}`)

    socket.onopen = () => {
      console.log(`WebSocket opened: ${socketId}`)
      connectedClients.set(socketId, socket)
      isAlive = true
      
      // Send immediate connection acknowledgment
      try {
        const welcomeMessage = {
          type: 'connection-established',
          socketId: socketId,
          timestamp: new Date().toISOString(),
          status: 'connected'
        }
        socket.send(JSON.stringify(welcomeMessage))
        console.log(`Welcome message sent to ${socketId}:`, welcomeMessage)
        
        // Start ping interval
        pingInterval = setInterval(() => {
          if (isAlive && socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString()
              }))
              console.log(`Ping sent to ${socketId}`)
            } catch (error) {
              console.error(`Error sending ping to ${socketId}:`, error)
              cleanup()
            }
          }
        }, 30000) // Ping every 30 seconds
        
      } catch (error) {
        console.error(`Error sending welcome message to ${socketId}:`, error)
      }
    }

    const cleanup = () => {
      console.log(`Cleaning up connection: ${socketId}`)
      isAlive = false
      if (pingInterval) {
        clearInterval(pingInterval)
        pingInterval = null
      }
      connectedClients.delete(socketId)
      if (userId) {
        userConnections.delete(userId)
        console.log(`User ${userId} disconnected and removed from connections`)
      }
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log(`Message received from ${socketId}:`, data.type, data)

        switch (data.type) {
          case 'connect':
            userId = data.userId
            if (userId) {
              userConnections.set(userId, socketId)
              console.log(`User ${userId} connected with socket ${socketId}`)
              
              // Send connection confirmation
              socket.send(JSON.stringify({
                type: 'connected',
                userId: userId,
                socketId: socketId,
                timestamp: new Date().toISOString()
              }))
            }
            break

          case 'pong':
            console.log(`Pong received from ${socketId}`)
            isAlive = true
            break

          case 'ping':
            // Respond to client ping with pong
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }))
            console.log(`Pong sent in response to ping from ${socketId}`)
            break

          case 'call-user':
            handleCallUser(data, socketId)
            break

          case 'answer-call':
            handleAnswerCall(data, socketId)
            break

          case 'reject-call':
            handleRejectCall(data, socketId)
            break

          case 'end-call':
            handleEndCall(data, socketId)
            break

          case 'ice-candidate':
            handleIceCandidate(data, socketId)
            break

          default:
            console.log(`Unknown message type from ${socketId}:`, data.type)
            socket.send(JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${data.type}`,
              timestamp: new Date().toISOString()
            }))
        }
      } catch (error) {
        console.error(`Error parsing message from ${socketId}:`, error)
        try {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          }))
        } catch (sendError) {
          console.error(`Error sending error response to ${socketId}:`, sendError)
        }
      }
    }

    socket.onclose = (event) => {
      console.log(`WebSocket closed: ${socketId}`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })
      cleanup()
    }

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${socketId}:`, error)
      cleanup()
    }

    console.log(`Returning WebSocket response for ${socketId}`)
    return response
    
  } catch (error) {
    console.error('Error upgrading WebSocket:', error)
    return new Response(`WebSocket upgrade failed: ${error.message}`, { 
      status: 500,
      headers: { 
        'Content-Type': 'text/plain',
        ...corsHeaders 
      }
    })
  }
})

function handleCallUser(data: any, fromSocketId: string) {
  const { receiverId, callId, callerId, offer } = data
  console.log(`Handling call from ${callerId} to ${receiverId}, callId: ${callId}`)
  
  const receiverSocketId = userConnections.get(receiverId)
  
  if (receiverSocketId && connectedClients.has(receiverSocketId)) {
    const receiverSocket = connectedClients.get(receiverSocketId)!
    try {
      const callMessage = {
        type: 'incoming-call',
        call: {
          id: callId,
          caller_id: callerId,
          receiver_id: receiverId,
          status: 'pending'
        },
        offer,
        timestamp: new Date().toISOString()
      }
      receiverSocket.send(JSON.stringify(callMessage))
      console.log(`Call invitation sent to user ${receiverId}`)
    } catch (error) {
      console.error(`Error sending call invitation to ${receiverId}:`, error)
    }
  } else {
    // User is offline, send missed call notification
    const callerSocket = connectedClients.get(fromSocketId)
    if (callerSocket) {
      try {
        callerSocket.send(JSON.stringify({
          type: 'call-failed',
          reason: 'User offline',
          callId,
          timestamp: new Date().toISOString()
        }))
      } catch (error) {
        console.error('Error sending call failed notification:', error)
      }
    }
    console.log(`User ${receiverId} is offline for call ${callId}`)
  }
}

function handleAnswerCall(data: any, fromSocketId: string) {
  const { callId, answer, targetUserId } = data
  console.log(`Handling call answer for call ${callId} to user ${targetUserId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'call-accepted',
        callId,
        answer,
        timestamp: new Date().toISOString()
      }))
      console.log(`Call answer sent to user ${targetUserId}`)
    } catch (error) {
      console.error(`Error sending call answer to ${targetUserId}:`, error)
    }
  } else {
    console.log(`Target user ${targetUserId} not found for call answer ${callId}`)
  }
}

function handleRejectCall(data: any, fromSocketId: string) {
  const { callId, targetUserId } = data
  console.log(`Handling call rejection for call ${callId} to user ${targetUserId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'call-rejected',
        callId,
        timestamp: new Date().toISOString()
      }))
      console.log(`Call rejection sent to user ${targetUserId}`)
    } catch (error) {
      console.error(`Error sending call rejection to ${targetUserId}:`, error)
    }
  } else {
    console.log(`Target user ${targetUserId} not found for call rejection ${callId}`)
  }
}

function handleEndCall(data: any, fromSocketId: string) {
  const { callId, targetUserId } = data
  console.log(`Handling call end for call ${callId} to user ${targetUserId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'call-ended',
        callId,
        timestamp: new Date().toISOString()
      }))
      console.log(`Call end notification sent to user ${targetUserId}`)
    } catch (error) {
      console.error(`Error sending call end notification to ${targetUserId}:`, error)
    }
  } else {
    console.log(`Target user ${targetUserId} not found for call end ${callId}`)
  }
}

function handleIceCandidate(data: any, fromSocketId: string) {
  const { callId, candidate, targetUserId } = data
  console.log(`Handling ICE candidate for call ${callId} to user ${targetUserId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'ice-candidate',
        callId,
        candidate,
        timestamp: new Date().toISOString()
      }))
      console.log(`ICE candidate sent to user ${targetUserId}`)
    } catch (error) {
      console.error(`Error sending ICE candidate to ${targetUserId}:`, error)
    }
  } else {
    console.log(`Target user ${targetUserId} not found for ICE candidate ${callId}`)
  }
}
