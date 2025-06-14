
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const connectedClients = new Map<string, WebSocket>()
const userConnections = new Map<string, string>() // userId -> socketId

// Add CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('Socket server request received:', req.method, req.url)
  
  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: { 
        'Content-Type': 'text/plain',
        ...corsHeaders
      }
    })
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req, {
      headers: corsHeaders
    })
    const socketId = crypto.randomUUID()
    let userId: string | null = null

    socket.onopen = () => {
      connectedClients.set(socketId, socket)
      console.log(`WebSocket connected: ${socketId}`)
      
      // Send immediate connection acknowledgment
      try {
        socket.send(JSON.stringify({
          type: 'connection-established',
          socketId: socketId,
          timestamp: new Date().toISOString()
        }))
      } catch (error) {
        console.error('Error sending connection acknowledgment:', error)
      }
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Received message:', data.type, data)

        switch (data.type) {
          case 'connect':
            userId = data.userId
            userConnections.set(userId, socketId)
            console.log(`User ${userId} connected with socket ${socketId}`)
            
            // Send connection confirmation
            socket.send(JSON.stringify({
              type: 'connected',
              userId: userId,
              socketId: socketId,
              timestamp: new Date().toISOString()
            }))
            break

          case 'ping':
            // Respond to ping with pong
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }))
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
            console.log('Unknown message type:', data.type)
            socket.send(JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${data.type}`
            }))
        }
      } catch (error) {
        console.error('Error parsing message:', error)
        try {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }))
        } catch (sendError) {
          console.error('Error sending error response:', sendError)
        }
      }
    }

    socket.onclose = (event) => {
      console.log(`WebSocket disconnected: ${socketId}, code: ${event.code}, reason: ${event.reason}`)
      connectedClients.delete(socketId)
      if (userId) {
        userConnections.delete(userId)
        console.log(`User ${userId} disconnected`)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket error for socket', socketId, ':', error)
    }

    return response
  } catch (error) {
    console.error('Error upgrading WebSocket:', error)
    return new Response('WebSocket upgrade failed', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

function handleCallUser(data: any, fromSocketId: string) {
  const { receiverId, callId, callerId, offer } = data
  console.log(`Handling call from ${callerId} to ${receiverId}`)
  
  const receiverSocketId = userConnections.get(receiverId)
  
  if (receiverSocketId && connectedClients.has(receiverSocketId)) {
    const receiverSocket = connectedClients.get(receiverSocketId)!
    try {
      receiverSocket.send(JSON.stringify({
        type: 'incoming-call',
        call: {
          id: callId,
          caller_id: callerId,
          receiver_id: receiverId,
          status: 'pending'
        },
        offer
      }))
      console.log(`Call invitation sent to user ${receiverId}`)
    } catch (error) {
      console.error('Error sending call invitation:', error)
    }
  } else {
    // User is offline, send missed call notification
    const callerSocket = connectedClients.get(fromSocketId)
    if (callerSocket) {
      try {
        callerSocket.send(JSON.stringify({
          type: 'call-failed',
          reason: 'User offline'
        }))
      } catch (error) {
        console.error('Error sending call failed notification:', error)
      }
    }
    console.log(`User ${receiverId} is offline`)
  }
}

function handleAnswerCall(data: any, fromSocketId: string) {
  const { callId, answer, targetUserId } = data
  console.log(`Handling call answer for call ${callId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'call-accepted',
        callId,
        answer
      }))
      console.log(`Call answer sent to user ${targetUserId}`)
    } catch (error) {
      console.error('Error sending call answer:', error)
    }
  }
}

function handleRejectCall(data: any, fromSocketId: string) {
  const { callId, targetUserId } = data
  console.log(`Handling call rejection for call ${callId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'call-rejected',
        callId
      }))
      console.log(`Call rejection sent to user ${targetUserId}`)
    } catch (error) {
      console.error('Error sending call rejection:', error)
    }
  }
}

function handleEndCall(data: any, fromSocketId: string) {
  const { callId, targetUserId } = data
  console.log(`Handling call end for call ${callId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'call-ended',
        callId
      }))
      console.log(`Call end notification sent to user ${targetUserId}`)
    } catch (error) {
      console.error('Error sending call end notification:', error)
    }
  }
}

function handleIceCandidate(data: any, fromSocketId: string) {
  const { callId, candidate, targetUserId } = data
  console.log(`Handling ICE candidate for call ${callId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    try {
      targetSocket.send(JSON.stringify({
        type: 'ice-candidate',
        callId,
        candidate
      }))
      console.log(`ICE candidate sent to user ${targetUserId}`)
    } catch (error) {
      console.error('Error sending ICE candidate:', error)
    }
  }
}
