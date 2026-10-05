package org.fpm.one.presentation.auth

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.fpm.one.R
import org.fpm.one.core.network.ApiClient
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmButton

enum class AuthScreenState {
  WELCOME,
  SIGN_IN
}

@Composable
fun LoginScreen(
  viewModel: AuthViewModel,
  onLoginSuccess: () -> Unit,
  onNavigateToRegister: () -> Unit,
  onPendingApproval: () -> Unit
) {
  val uiState by viewModel.uiState.collectAsState()
  val scope = rememberCoroutineScope()

  var authState by remember { mutableStateOf(AuthScreenState.WELCOME) }
  var emailOrPhone by remember { mutableStateOf("") }
  var password by remember { mutableStateOf("") }
  var passwordVisible by remember { mutableStateOf(false) }

  // Intercept back button when in SIGN_IN state to smoothly return to WELCOME
  BackHandler(enabled = authState == AuthScreenState.SIGN_IN) {
    authState = AuthScreenState.WELCOME
  }

  Box(modifier = Modifier.fillMaxSize()) {
    // 1. Full-bleed vertical photographic background
    Image(
      painter = painterResource(id = R.drawable.auth_hero),
      contentDescription = "Faith Preachers Ministries Int'l Worship",
      contentScale = ContentScale.Crop,
      alignment = Alignment.TopCenter,
      modifier = Modifier.fillMaxSize()
    )

    // 2. Top status scrim for branding and icons
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(180.dp)
        .background(
          Brush.verticalGradient(
            colors = listOf(
              FpmNavyDeep.copy(alpha = 0.85f),
              FpmNavyDeep.copy(alpha = 0.35f),
              Color.Transparent
            )
          )
        )
    )

    // 3. Dynamic background dimming based on current state
    val scrimAlpha by animateFloatAsState(
      targetValue = if (authState == AuthScreenState.SIGN_IN) 0.60f else 0.20f,
      animationSpec = tween(400),
      label = "scrimAlpha"
    )
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(FpmNavyDeep.copy(alpha = scrimAlpha))
    )

    // 4. Atmospheric bottom gradient in WELCOME mode for maximum text contrast
    AnimatedVisibility(
      visible = authState == AuthScreenState.WELCOME,
      enter = fadeIn(tween(350)),
      exit = fadeOut(tween(250))
    ) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(
            Brush.verticalGradient(
              colors = listOf(
                Color.Transparent,
                FpmNavyDeep.copy(alpha = 0.35f),
                FpmNavyDeep.copy(alpha = 0.80f),
                FpmNavyDeep.copy(alpha = 0.95f)
              ),
              startY = 400f
            )
          )
      )
    }

    // 5. Main content column (Header & Welcome Copy)
    Column(
      modifier = Modifier
        .fillMaxSize()
        .statusBarsPadding()
    ) {
      // Top Header Bar: Church Emblem, Brand Tag, and Server Configuration Icon
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Image(
            painter = painterResource(id = R.drawable.church_logo),
            contentDescription = "Faith Preachers Ministries Int'l Emblem",
            modifier = Modifier
              .size(42.dp)
              .clip(CircleShape)
              .border(1.8.dp, FpmGold, CircleShape)
          )
          Spacer(modifier = Modifier.width(12.dp))
          Column {
            Text(
              text = "FPM GLOBAL",
              fontSize = 15.sp,
              fontWeight = FontWeight.Black,
              color = FpmSurfaceWhite,
              letterSpacing = 1.2.sp
            )
            Text(
              text = "Faith Preachers Ministries Int'l",
              fontSize = 11.sp,
              fontWeight = FontWeight.Medium,
              color = FpmGoldLight
            )
          }
        }
      }

      Spacer(modifier = Modifier.weight(1f))

      // Center / Lower-Middle: Inspiring Welcome Headline & Kicker
      AnimatedVisibility(
        visible = authState == AuthScreenState.WELCOME,
        enter = fadeIn(tween(400)) + slideInVertically(tween(400)) { 50 },
        exit = fadeOut(tween(250)) + slideOutVertically(tween(250)) { 50 }
      ) {
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(bottom = 24.dp)
        ) {
          // Refined Gold Kicker Pill
          Surface(
            color = FpmGold.copy(alpha = 0.22f),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.7f)),
            modifier = Modifier.padding(bottom = 12.dp)
          ) {
            Text(
              text = "✦  CHURCH OF ALL NATIONS",
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold,
              color = FpmGoldLight,
              letterSpacing = 0.8.sp,
              modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
            )
          }

          // Main Welcome Headline
          Text(
            text = "Welcome to\nFPM Global",
            fontSize = 34.sp,
            fontWeight = FontWeight.Black,
            color = FpmSurfaceWhite,
            lineHeight = 40.sp,
            letterSpacing = (-0.5).sp
          )

          Spacer(modifier = Modifier.height(10.dp))

          // Inspiring Church Subtitle
          Text(
            text = "Stay connected to the people, ministry and moments that make our church one family.",
            fontSize = 14.sp,
            lineHeight = 20.sp,
            color = FpmSurfaceWhite.copy(alpha = 0.90f),
            fontWeight = FontWeight.Normal
          )
        }
      }

      // Reserve space when in welcome mode so the copy sits comfortably above the card
      if (authState == AuthScreenState.WELCOME) {
        Spacer(modifier = Modifier.height(180.dp))
      }
    }

    // 6. Interactive Morphing Bottom Card (State 1: Gateway Actions / State 2: Expanded Sign In Form)
    Surface(
      modifier = Modifier
        .fillMaxWidth()
        .align(Alignment.BottomCenter)
        .animateContentSize(
          animationSpec = tween(
            durationMillis = 420,
            easing = FastOutSlowInEasing
          )
        ),
      shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
      color = FpmSurfaceWhite,
      shadowElevation = 24.dp,
      border = BorderStroke(1.dp, FpmCardBorder.copy(alpha = 0.7f))
    ) {
      if (authState == AuthScreenState.WELCOME) {
        // STATE 1: WELCOME / GATEWAY ACTIONS (matching reference composition)
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp, vertical = 26.dp),
          horizontalAlignment = Alignment.CenterHorizontally
        ) {
          // Primary CTA Button: "Create an account"
          Button(
            onClick = onNavigateToRegister,
            modifier = Modifier
              .fillMaxWidth()
              .height(54.dp),
            shape = RoundedCornerShape(27.dp),
            colors = ButtonDefaults.buttonColors(
              containerColor = FpmRoyalBlue
            ),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
          ) {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.Center
            ) {
              Text(
                text = "Create an account",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = FpmSurfaceWhite
              )
              Spacer(modifier = Modifier.width(8.dp))
              Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = null,
                tint = FpmGoldLight,
                modifier = Modifier.size(18.dp)
              )
            }
          }

          Spacer(modifier = Modifier.height(14.dp))

          // Secondary Action: "Already have an account" -> Expands to Sign In
          TextButton(
            onClick = { authState = AuthScreenState.SIGN_IN },
            modifier = Modifier
              .fillMaxWidth()
              .height(44.dp)
          ) {
            Text(
              text = "Already have an account",
              fontSize = 14.sp,
              fontWeight = FontWeight.SemiBold,
              color = FpmTextPrimary
            )
          }
        }
      } else {
        // STATE 2: EXPANDED SIGN IN FORM
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 640.dp)
            .navigationBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 20.dp)
        ) {
          // Top Bar with Back Arrow + Title
          Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
          ) {
            IconButton(
              onClick = { authState = AuthScreenState.WELCOME },
              modifier = Modifier
                .size(36.dp)
                .background(FpmSurfaceTonal, CircleShape)
            ) {
              Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back to Welcome",
                tint = FpmTextPrimary,
                modifier = Modifier.size(20.dp)
              )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
              Text(
                text = "Sign In to Your Portal",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTextPrimary
              )
              Text(
                text = "Access church announcements, services & attendance",
                fontSize = 11.sp,
                color = FpmTextSecondary
              )
            }
          }

          Spacer(modifier = Modifier.height(18.dp))

          // Error Notification Banner
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
            leadingIcon = {
              Icon(Icons.Default.Person, contentDescription = null, tint = FpmRoyalBlue)
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            singleLine = true
          )

          Spacer(modifier = Modifier.height(12.dp))

          // Password Field
          OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password", fontSize = 12.sp) },
            leadingIcon = {
              Icon(Icons.Default.Lock, contentDescription = null, tint = FpmRoyalBlue)
            },
            trailingIcon = {
              IconButton(onClick = { passwordVisible = !passwordVisible }) {
                Icon(
                  imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                  contentDescription = if (passwordVisible) "Hide password" else "Show password",
                  tint = FpmTextSecondary
                )
              }
            },
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            singleLine = true
          )

          Spacer(modifier = Modifier.height(18.dp))

          // Primary Sign In CTA
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

          Spacer(modifier = Modifier.height(12.dp))

          // Register Action
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

          // Optional debug-only tools (completely absent in release builds via src/release)
          DebugAuthSection(
            onFillCredentials = { email, pass ->
              emailOrPhone = email
              password = pass
            }
          )
        }
      }
    }
  }
}
