
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;

  constructor() {
    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStreamCallback?.(this.remoteStream);
    };
  }

  async startCall(): Promise<RTCSessionDescriptionInit> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!);
        }
      });

      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async answerCall(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!);
        }
      });

      await this.peerConnection!.setRemoteDescription(offer);
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.peerConnection!.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.peerConnection!.addIceCandidate(candidate);
  }

  onIceCandidate?: (candidate: RTCIceCandidate) => void;

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.setupPeerConnection();
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}
