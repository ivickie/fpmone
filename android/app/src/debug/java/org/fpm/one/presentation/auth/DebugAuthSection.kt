package org.fpm.one.presentation.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.fpm.one.core.network.ApiClient
import org.fpm.one.core.network.ServerDiscovery
import org.fpm.one.core.theme.*
import java.util.concurrent.TimeUnit

/**
 * Debug-only authentication helpers: provides quick fill for local development accounts
 * and local network server discovery.
 * Strictly compiled ONLY in debug builds and completely omitted from release variant.
 */
@Composable
fun DebugAuthSection(
  onFillCredentials: (String, String) -> Unit,
  modifier: Modifier = Modifier
) {
  var showServerDialog by remember { mutableStateOf(false) }
  var currentServerUrl by remember { mutableStateOf(ApiClient.baseUrl) }
  var testConnectionStatus by remember { mutableStateOf<String?>(null) }
  var isTestingConnection by remember { mutableStateOf(false) }
  val scope = rememberCoroutineScope()

  // Quick Demo Accounts Switcher (Debug only)
  HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = FpmCardBorder)

  Text(
    text = "QUICK DEMO ACCOUNTS",
    fontSize = 10.sp,
    fontWeight = FontWeight.Bold,
    color = FpmTextSecondary,
    textAlign = TextAlign.Center,
    modifier = Modifier.fillMaxWidth()
  )

  Spacer(modifier = Modifier.height(6.dp))

  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.spacedBy(6.dp)
  ) {
    OutlinedButton(
      onClick = {
        onFillCredentials("worker.sarah@fpmchurch.org", "Password123!")
      },
      modifier = Modifier.weight(1f),
      shape = RoundedCornerShape(8.dp),
      contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
    ) {
      Text("Sarah (Choir)", fontSize = 10.sp, maxLines = 1)
    }

    OutlinedButton(
      onClick = {
        onFillCredentials("worker.john@fpmchurch.org", "Password123!")
      },
      modifier = Modifier.weight(1f),
      shape = RoundedCornerShape(8.dp),
      contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
    ) {
      Text("John (Media)", fontSize = 10.sp, maxLines = 1)
    }

    OutlinedButton(
      onClick = {
        onFillCredentials("member.grace@fpmchurch.org", "Password123!")
      },
      modifier = Modifier.weight(1f),
      shape = RoundedCornerShape(8.dp),
      contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
    ) {
      Text("Grace (Member)", fontSize = 10.sp, maxLines = 1)
    }
  }

  Spacer(modifier = Modifier.height(10.dp))

  // Server URL Configuration Trigger (Debug only)
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.Center,
    verticalAlignment = Alignment.CenterVertically
  ) {
    TextButton(onClick = {
      currentServerUrl = ApiClient.baseUrl
      testConnectionStatus = null
      showServerDialog = true
    }) {
      Text(
        text = "⚙ Server: ${ApiClient.baseUrl.replace("http://", "").replace("/api", "")}",
        fontSize = 11.sp,
        color = FpmTextSecondary
      )
    }
  }

  if (showServerDialog) {
    AlertDialog(
      onDismissRequest = { showServerDialog = false },
      title = {
        Text(
          text = "Server Configuration",
          fontWeight = FontWeight.Bold,
          fontSize = 16.sp
        )
      },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
          Text(
            text = "Enter your PC's IP and port (e.g. 192.168.1.234:5000):",
            fontSize = 12.sp,
            color = FpmTextSecondary
          )
          OutlinedTextField(
            value = currentServerUrl,
            onValueChange = { currentServerUrl = it },
            label = { Text("Base URL", fontSize = 12.sp) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
          )

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            Button(
              onClick = {
                isTestingConnection = true
                testConnectionStatus = "Scanning Wi-Fi network for PC..."
                scope.launch {
                  val foundUrl = ServerDiscovery.discoverServer(timeoutMs = 2500)
                  if (foundUrl != null) {
                    currentServerUrl = foundUrl
                    ApiClient.baseUrl = foundUrl
                    testConnectionStatus = "SUCCESS: Detected PC at $foundUrl!"
                  } else {
                    testConnectionStatus = "Could not auto-detect. Ensure phone and PC are on same Wi-Fi."
                  }
                  isTestingConnection = false
                }
              },
              enabled = !isTestingConnection,
              modifier = Modifier.weight(1f),
              shape = RoundedCornerShape(8.dp),
              colors = ButtonDefaults.buttonColors(containerColor = FpmGold)
            ) {
              Text(
                text = "Auto-Detect",
                fontSize = 11.sp,
                color = FpmNavyDark,
                fontWeight = FontWeight.Bold,
                maxLines = 1
              )
            }

            Button(
              onClick = {
                isTestingConnection = true
                testConnectionStatus = "Connecting..."
                scope.launch {
                  try {
                    val trimmed = currentServerUrl.trimEnd('/')
                    val testUrl = if (trimmed.endsWith("/api")) trimmed.replace("/api", "/health") else "$trimmed/health"
                    val request = Request.Builder().url(testUrl).get().build()
                    val client = OkHttpClient.Builder()
                      .connectTimeout(4, TimeUnit.SECONDS)
                      .readTimeout(4, TimeUnit.SECONDS)
                      .build()
                    withContext(Dispatchers.IO) {
                      client.newCall(request).execute().use { response ->
                        if (response.isSuccessful) {
                          testConnectionStatus = "SUCCESS: Connected to backend!"
                        } else {
                          testConnectionStatus = "Server responded with HTTP ${response.code}"
                        }
                      }
                    }
                  } catch (e: Exception) {
                    testConnectionStatus = "Failed: ${e.message ?: "Connection timed out"}"
                  } finally {
                    isTestingConnection = false
                  }
                }
              },
              enabled = !isTestingConnection,
              modifier = Modifier.weight(1f),
              shape = RoundedCornerShape(8.dp)
            ) {
              Text(
                text = if (isTestingConnection) "Testing..." else "Test Link",
                fontSize = 11.sp,
                maxLines = 1
              )
            }
          }

          testConnectionStatus?.let { status ->
            Text(
              text = status,
              fontSize = 11.sp,
              color = if (status.startsWith("SUCCESS")) FpmSuccess else FpmError,
              fontWeight = FontWeight.SemiBold
            )
          }
        }
      },
      confirmButton = {
        Button(onClick = {
          ApiClient.baseUrl = currentServerUrl.trim()
          showServerDialog = false
        }) {
          Text("Save")
        }
      },
      dismissButton = {
        TextButton(onClick = { showServerDialog = false }) {
          Text("Cancel")
        }
      }
    )
  }
}
