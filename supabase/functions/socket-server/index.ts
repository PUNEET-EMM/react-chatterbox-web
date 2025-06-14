
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const connectedClients = new Map<string, WebSocket>()
const userConnections = new Map<string, string>() // userId -> socketId

serve(async (req) => {
  console.log('Socket server request received:', req.method, req.url)
  
  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const socketId = crypto.randomUUID()
    let userId: string | null = null

    socket.onopen = () => {
      connectedClients.set(socketId, socket)
      console.log(`WebSocket connected: ${socketId}`)
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
              userId: userId
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
        }
      } catch (error) {
        console.error('Error parsing message:', error)
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }))
      }
    }

    socket.onclose = () => {
      connectedClients.delete(socketId)
      if (userId) {
        userConnections.delete(userId)
        console.log(`User ${userId} disconnected`)
      }
      console.log(`WebSocket disconnected: ${socketId}`)
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return response
  } catch (error) {
    console.error('Error upgrading WebSocket:', error)
    return new Response('WebSocket upgrade failed', { status: 500 })
  }
})

function handleCallUser(data: any, fromSocketId: string) {
  const { receiverId, callId, callerId, offer } = data
  console.log(`Handling call from ${callerId} to ${receiverId}`)
  
  const receiverSocketId = userConnections.get(receiverId)
  
  if (receiverSocketId && connectedClients.has(receiverSocketId)) {
    const receiverSocket = connectedClients.get(receiverSocketId)!
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
  } else {
    // User is offline, send missed call notification
    const callerSocket = connectedClients.get(fromSocketId)
    if (callerSocket) {
      callerSocket.send(JSON.stringify({
        type: 'call-failed',
        reason: 'User offline'
      }))
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
    targetSocket.send(JSON.stringify({
      type: 'call-accepted',
      callId,
      answer
    }))
    console.log(`Call answer sent to user ${targetUserId}`)
  }
}

function handleRejectCall(data: any, fromSocketId: string) {
  const { callId, targetUserId } = data
  console.log(`Handling call rejection for call ${callId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    targetSocket.send(JSON.stringify({
      type: 'call-rejected',
      callId
    }))
    console.log(`Call rejection sent to user ${targetUserId}`)
  }
}

function handleEndCall(data: any, fromSocketId: string) {
  const { callId, targetUserId } = data
  console.log(`Handling call end for call ${callId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    targetSocket.send(JSON.stringify({
      type: 'call-ended',
      callId
    }))
    console.log(`Call end notification sent to user ${targetUserId}`)
  }
}

function handleIceCandidate(data: any, fromSocketId: string) {
  const { callId, candidate, targetUserId } = data
  console.log(`Handling ICE candidate for call ${callId}`)
  
  const targetSocketId = userConnections.get(targetUserId)
  
  if (targetSocketId && connectedClients.has(targetSocketId)) {
    const targetSocket = connectedClients.get(targetSocketId)!
    targetSocket.send(JSON.stringify({
      type: 'ice-candidate',
      callId,
      candidate
    }))
    console.log(`ICE candidate sent to user ${targetUserId}`)
  }
}
