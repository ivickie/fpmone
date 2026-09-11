package org.fpm.one.presentation.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import org.fpm.one.R
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.core.network.ApiClient
import org.fpm.one.core.network.ServerDiscovery
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

@Composable
fun LoginScreen(
  viewModel: AuthViewModel,
  onLoginSuccess: () -> Unit,
  onNavigateToRegister: () -> Unit,
  onPendingApproval: () -> Unit
) {
  val uiState by viewModel.uiState.collectAsState()
  val scope = rememberCoroutineScope()
  var emailOrPhone by remember { mutableStateOf("worker.sarah@fpmchurch.org") }
  var password by remember { mutableStateOf("Password123!") }
  var passwordVisible by remember { mutableStateOf(false) }

  var showServerDialog by remember { mutableStateOf(false) }
  var currentServerUrl by remember { mutableStateOf(ApiClient.baseUrl) }
  var testConnectionStatus by remember { mutableStateOf<String?>(null) }
  var isTestingConnection by remember { mutableStateOf(false) }

  // Auto-discover PC IP on local network upon launching Login Screen
  LaunchedEffect(Unit) {
    scope.launch {
      val found = ServerDiscovery.discoverServer(timeoutMs = 1500)
      if (found != null) {
        currentServerUrl = found
        ApiClient.baseUrl = found
      }
    }
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(
        Brush.verticalGradient(
          colors = listOf(FpmNavyDark, FpmRoyalBlue)
        )
      )
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 24.dp, vertical = 40.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center
    ) {
      // Ministry Brand Header
      Image(
        painter = painterResource(id = R.drawable.church_logo),
        contentDescription = "Faith Preachers Ministry Emblem",
        modifier = Modifier
          .size(88.dp)
          .clip(CircleShape)
          .border(2.5.dp, FpmGold, CircleShape)
      )

      Spacer(modifier = Modifier.height(16.dp))

      Text(
        text = "FPM ONE",
        fontSize = 26.sp,
        fontWeight = FontWeight.Black,
        color = FpmSurfaceWhite,
        letterSpacing = 1.sp
      )

      Text(
        text = "Faith Preachers Ministry",
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        color = FpmAmberLight
      )

      Spacer(modifier = Modifier.height(32.dp))

      // Login Card
      FpmCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp)
      ) {
        Text(
          text = "Sign In to Your Portal",
          fontSize = 17.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )

        Text(
          text = "Access church announcements, services, and worker attendance",
          fontSize = 12.sp,
          color = FpmTextSecondary,
          modifier = Modifier.padding(top = 2.dp, bottom = 18.dp)
        )

        if (uiState.error != null) {
          Surface(
            modifier = Modifier
              .fillMaxWidth()
              .padding(bottom = 14.dp),
            color = FpmErrorBg,
            shape = RoundedCornerShape(10.dp)
          ) {
            Text(
              text = uiState.error!!,
              color = FpmError,
              fontSize = 11.sp,
              fontWeight = FontWeight.Medium,
              modifier = Modifier.padding(10.dp)
            )
          }
        }

        // Email / Phone Field
        OutlinedTextField(
          value = emailOrPhone,
          onValueChange = { emailOrPhone = it },
          label = { Text("Email Address or Phone", fontSize = 12.sp) },
          leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = FpmRoyalBlue) },
          modifier = Modifier.fillMaxWidth(),
          shape = RoundedCornerShape(12.dp),
          singleLine = true
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Password Field
        OutlinedTextField(
          value = password,
          onValueChange = { password = it },
          label = { Text("Password", fontSize = 12.sp) },
          leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = FpmRoyalBlue) },
          trailingIcon = {
            IconButton(onClick = { passwordVisible = !passwordVisible }) {
              Icon(
                imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                contentDescription = null,
                tint = FpmTextSecondary
              )
            }
          },
          visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
          keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
          modifier = Modifier.fillMaxWidth(),
          shape = RoundedCornerShape(12.dp),
          singleLine = true
        )

        Spacer(modifier = Modifier.height(20.dp))

        FpmButton(
          text = "Sign In",
          onClick = {
            viewModel.login(
              emailOrPhone,
              password,
              onSuccess = onLoginSuccess,
              onPending = onPendingApproval
            )
          },
          isLoading = uiState.isLoading,
          modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Register action
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.Center,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(text = "New to FPM? ", fontSize = 12.sp, color = FpmTextSecondary)
          TextButton(onClick = onNavigateToRegister) {
            Text(
              text = "Register as Member",
              fontSize = 12.sp,
              fontWeight = FontWeight.Bold,
              color = FpmRoyalBlue
            )
          }
        }

        // Quick Demo Accounts Switcher
        Divider(modifier = Modifier.padding(vertical = 12.dp), color = FpmCardBorder)

        Text(
          text = "QUICK DEMO ACCOUNTS",
          fontSize = 10.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextSecondary,
          textAlign = TextAlign.Center,
          modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
          OutlinedButton(
            onClick = {
              emailOrPhone = "worker.sarah@fpmchurch.org"
              password = "Password123!"
            },
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(8.dp),
            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
          ) {
            Text("Sarah (Choir)", fontSize = 10.sp, maxLines = 1)
          }

          OutlinedButton(
            onClick = {
              emailOrPhone = "worker.john@fpmchurch.org"
              password = "Password123!"
            },
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(8.dp),
            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
          ) {
            Text("John (Media)", fontSize = 10.sp, maxLines = 1)
          }

          OutlinedButton(
            onClick = {
              emailOrPhone = "member.grace@fpmchurch.org"
              password = "Password123!"
            },
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(8.dp),
            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
          ) {
            Text("Grace (Member)", fontSize = 10.sp, maxLines = 1)
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Server URL Configuration Trigger
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
      }
    }

    // Server Configuration Dialog
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
}
