package org.fpm.one.core.network

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress

object ServerDiscovery {
  private const val DISCOVERY_PORT = 5001
  private const val DISCOVERY_QUERY = "FPM_DISCOVER_SERVER"

  /**
   * Broadcasts UDP packet to local network to locate FPM ONE backend server.
   * Returns discovered Base URL (e.g. "http://10.164.108.241:5000/api") or null if not found.
   */
  suspend fun discoverServer(timeoutMs: Int = 2500): String? = withContext(Dispatchers.IO) {
    var socket: DatagramSocket? = null
    try {
      socket = DatagramSocket(null).apply {
        reuseAddress = true
        broadcast = true
        soTimeout = timeoutMs
        bind(InetSocketAddress(0))
      }

      val sendData = DISCOVERY_QUERY.toByteArray()
      val broadcastAddr = InetAddress.getByName("255.255.255.255")
      val sendPacket = DatagramPacket(sendData, sendData.size, broadcastAddr, DISCOVERY_PORT)
      socket.send(sendPacket)

      val receiveData = ByteArray(256)
      val receivePacket = DatagramPacket(receiveData, receiveData.size)
      socket.receive(receivePacket)

      val senderIp = receivePacket.address.hostAddress
      val message = String(receivePacket.data, 0, receivePacket.length).trim()

      if (message.startsWith("FPM_SERVER_INFO:")) {
        val port = message.substringAfter("FPM_SERVER_INFO:").trim().toIntOrNull() ?: 5000
        val discoveredUrl = "http://$senderIp:$port/api"
        ApiClient.baseUrl = discoveredUrl
        return@withContext discoveredUrl
      }
    } catch (e: Exception) {
      // Broadcast might be restricted on some Wi-Fi configurations
    } finally {
      try {
        socket?.close()
      } catch (_: Exception) {}
    }
    return@withContext null
  }
}
