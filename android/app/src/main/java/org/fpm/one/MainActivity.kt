package org.fpm.one

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.fpm.one.R
import org.fpm.one.core.notification.FpmFirebaseMessagingService
import org.fpm.one.core.notification.NotificationHelper
import org.fpm.one.core.security.SessionManager
import org.fpm.one.core.theme.*
import org.fpm.one.data.repository.AttendanceRepository
import org.fpm.one.data.repository.AuthRepository
import org.fpm.one.data.repository.ChurchRepository
import org.fpm.one.data.repository.NotificationRepository
import org.fpm.one.presentation.auth.AuthViewModel
import org.fpm.one.presentation.auth.LoginScreen
import org.fpm.one.presentation.auth.PendingApprovalScreen
import org.fpm.one.presentation.auth.VerifyEmailScreen
import org.fpm.one.presentation.events.EventsViewModel
import org.fpm.one.presentation.home.HomeViewModel
import org.fpm.one.presentation.main.MainScreen
import org.fpm.one.presentation.notifications.NotificationsViewModel
import org.fpm.one.presentation.registration.RegistrationViewModel
import org.fpm.one.presentation.registration.RegistrationWizardScreen
import org.fpm.one.presentation.services.ServicesViewModel
import org.fpm.one.presentation.testimonies.TestimoniesViewModel
import org.fpm.one.presentation.biblegame.BibleGameViewModel
import org.fpm.one.presentation.worker.WorkerViewModel

class MainActivity : FragmentActivity() {

  private var pendingActionUrl by mutableStateOf<String?>(null)

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    val actionUrl = intent.getStringExtra("actionUrl")
    if (!actionUrl.isNullOrBlank()) {
      pendingActionUrl = actionUrl
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Capture notification deep link action URL if launched from tray
    intent.getStringExtra("actionUrl")?.let {
      if (it.isNotBlank()) pendingActionUrl = it
    }

    // Initialize session manager, theme manager, and notification channels
    val sessionManager = SessionManager.init(applicationContext)
    ThemeManager.init(applicationContext)
    NotificationHelper.init(applicationContext)

    // Repositories
    val authRepository = AuthRepository(sessionManager)
    val churchRepository = ChurchRepository()
    val attendanceRepository = AttendanceRepository()
    val notificationRepository = NotificationRepository()

    // Sync FCM registration token with backend on app startup
    try {
      FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
        if (task.isSuccessful && !task.result.isNullOrBlank()) {
          val token = task.result
          FpmFirebaseMessagingService.saveLocalFcmToken(applicationContext, token)
          val user = SessionManager.getUserSession()
          CoroutineScope(Dispatchers.IO).launch {
            try {
              notificationRepository.registerDeviceToken(
                deviceToken = token,
                branchId = user?.branchId
              )
            } catch (e: Exception) {
              Log.w("FPM_FCM", "Startup device token registration notice: ${e.message}")
            }
          }
        }
      }
    } catch (e: Exception) {
      Log.w("FPM_FCM", "Firebase token acquisition notice: ${e.message}")
    }

    setContent {
      FpmGlobalTheme {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = MaterialTheme.colorScheme.background
        ) {
          // Determine initial destination based on existing session
          val targetDestination = remember {
            val user = SessionManager.getUserSession()
            if (user != null && SessionManager.isLoggedIn()) {
              if (user.accountStatus.lowercase() == "pending_approval") "PENDING" else "MAIN"
            } else {
              "LOGIN"
            }
          }

          var currentScreen by remember { mutableStateOf("SPLASH") }
          var verifyEmailTarget by remember { mutableStateOf("") }

          // Android 13+ (API 33+) Runtime Push Notification Permission
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val notificationPermissionLauncher = rememberLauncherForActivityResult(
              contract = ActivityResultContracts.RequestPermission()
            ) { /* Permission response handled by OS */ }

            LaunchedEffect(Unit) {
              if (!NotificationHelper.hasPermission(this@MainActivity)) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
              }
            }
          }

          // ViewModels
          val authViewModel = remember { AuthViewModel(authRepository) }
          val registrationViewModel = remember { RegistrationViewModel(authRepository, churchRepository) }
          val homeViewModel = remember { HomeViewModel(churchRepository) }
          val servicesViewModel = remember { ServicesViewModel(churchRepository) }
          val eventsViewModel = remember { EventsViewModel(churchRepository) }
          val testimoniesViewModel = remember { TestimoniesViewModel(churchRepository) }
          val workerViewModel = remember { WorkerViewModel(attendanceRepository, churchRepository) }
          val notificationsViewModel = remember { NotificationsViewModel(notificationRepository, applicationContext) }
          val bibleGameViewModel = remember { BibleGameViewModel() }

          Crossfade(
            targetState = currentScreen,
            animationSpec = tween(durationMillis = 400),
            label = "screenTransition"
          ) { screen ->
            when (screen) {
              "SPLASH" -> {
                AnimatedSplashScreen(
                  onFinished = {
                    currentScreen = targetDestination
                    if (targetDestination == "MAIN") {
                      homeViewModel.loadHomeData()
                      workerViewModel.loadWorkerHub()
                    }
                  }
                )
              }
              "LOGIN" -> {
                LoginScreen(
                  viewModel = authViewModel,
                  onLoginSuccess = {
                    val user = SessionManager.getUserSession()
                    FpmFirebaseMessagingService.syncTokenWithBackend(applicationContext, user?.branchId)
                    if (user?.accountStatus?.lowercase() == "pending_approval") {
                      currentScreen = "PENDING"
                    } else {
                      homeViewModel.loadHomeData()
                      workerViewModel.loadWorkerHub()
                      currentScreen = "MAIN"
                    }
                  },
                  onNavigateToRegister = {
                    registrationViewModel.loadMetadata()
                    currentScreen = "REGISTER"
                  },
                  onPendingApproval = {
                    currentScreen = "PENDING"
                  },
                  onNavigateToVerifyEmail = { email ->
                    verifyEmailTarget = email
                    currentScreen = "VERIFY_EMAIL"
                  }
                )
              }
              "REGISTER" -> {
                BackHandler { currentScreen = "LOGIN" }
                RegistrationWizardScreen(
                  viewModel = registrationViewModel,
                  onNavigateBack = {
                    currentScreen = "LOGIN"
                  },
                  onRegistrationComplete = { requiresVerification, email ->
                    if (requiresVerification) {
                      verifyEmailTarget = email
                      currentScreen = "VERIFY_EMAIL"
                    } else {
                      currentScreen = "PENDING"
                    }
                  }
                )
              }
              "VERIFY_EMAIL" -> {
                BackHandler { currentScreen = "LOGIN" }
                VerifyEmailScreen(
                  email = verifyEmailTarget,
                  viewModel = authViewModel,
                  onVerificationComplete = {
                    currentScreen = "PENDING"
                  },
                  onBackToLogin = {
                    currentScreen = "LOGIN"
                  }
                )
              }
              "PENDING" -> {
                BackHandler {
                  SessionManager.clearSession()
                  currentScreen = "LOGIN"
                }
                PendingApprovalScreen(
                  onBackToLogin = {
                    SessionManager.clearSession()
                    currentScreen = "LOGIN"
                  }
                )
              }
              "MAIN" -> {
                MainScreen(
                  homeViewModel = homeViewModel,
                  servicesViewModel = servicesViewModel,
                  eventsViewModel = eventsViewModel,
                  testimoniesViewModel = testimoniesViewModel,
                  workerViewModel = workerViewModel,
                  notificationsViewModel = notificationsViewModel,
                  bibleGameViewModel = bibleGameViewModel,
                  initialActionUrl = pendingActionUrl,
                  onLogout = {
                    val fcmToken = FpmFirebaseMessagingService.getLocalFcmToken(applicationContext)
                    if (fcmToken != null) {
                      CoroutineScope(Dispatchers.IO).launch {
                        try {
                          notificationRepository.unregisterDeviceToken(fcmToken)
                        } catch (_: Exception) {}
                      }
                    }
                    currentScreen = "LOGIN"
                  }
                )
              }
            }
          }
        }
      }
    }
  }
}

@Composable
fun AnimatedSplashScreen(onFinished: () -> Unit) {
  var startAnimation by remember { mutableStateOf(false) }
  val alphaAnim by animateFloatAsState(
    targetValue = if (startAnimation) 1f else 0f,
    animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
    label = "splashAlpha"
  )
  val scaleAnim by animateFloatAsState(
    targetValue = if (startAnimation) 1f else 0.8f,
    animationSpec = spring(
      dampingRatio = Spring.DampingRatioMediumBouncy,
      stiffness = Spring.StiffnessLow
    ),
    label = "splashScale"
  )

  LaunchedEffect(Unit) {
    startAnimation = true
    delay(1300)
    onFinished()
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(
        Brush.verticalGradient(
          colors = listOf(FpmNavyDeep, FpmNavyDark, Color(0xFF0F2B5C))
        )
      ),
    contentAlignment = Alignment.Center
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
      modifier = Modifier
        .scale(scaleAnim)
        .alpha(alphaAnim)
        .padding(32.dp)
    ) {
      Box(
        modifier = Modifier
          .size(116.dp)
          .clip(CircleShape)
          .background(FpmGold.copy(alpha = 0.15f))
          .border(2.dp, FpmGold.copy(alpha = 0.6f), CircleShape)
          .padding(10.dp),
        contentAlignment = Alignment.Center
      ) {
        Image(
          painter = painterResource(id = R.drawable.church_logo),
          contentDescription = "Faith Preachers Ministries Int'l Emblem",
          modifier = Modifier
            .size(92.dp)
            .clip(CircleShape)
        )
      }

      Spacer(modifier = Modifier.height(24.dp))

      Text(
        text = "FPM GLOBAL",
        fontSize = 28.sp,
        fontWeight = FontWeight.Black,
        color = FpmSurfaceWhite,
        letterSpacing = 2.sp
      )

      Spacer(modifier = Modifier.height(6.dp))

      Text(
        text = "FAITH PREACHERS MINISTRIES INT'L",
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = FpmGoldLight,
        letterSpacing = 1.5.sp
      )

      Text(
        text = "Proclaiming Christ Worldwide",
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        color = FpmSurfaceWhite.copy(alpha = 0.7f),
        modifier = Modifier.padding(top = 4.dp)
      )
    }

    Box(
      modifier = Modifier
        .align(Alignment.BottomCenter)
        .padding(bottom = 36.dp)
        .alpha(alphaAnim)
    ) {
      Text(
        text = "Jeremiah 1:8 • Official Ministry Platform",
        fontSize = 10.sp,
        color = FpmSurfaceWhite.copy(alpha = 0.5f),
        fontWeight = FontWeight.Medium
      )
    }
  }
}
