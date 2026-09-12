package org.fpm.one

import android.os.Bundle
import androidx.activity.compose.setContent
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
import kotlinx.coroutines.delay
import org.fpm.one.R
import org.fpm.one.core.security.SessionManager
import org.fpm.one.core.theme.*
import org.fpm.one.data.repository.AttendanceRepository
import org.fpm.one.data.repository.AuthRepository
import org.fpm.one.data.repository.ChurchRepository
import org.fpm.one.data.repository.NotificationRepository
import org.fpm.one.presentation.auth.AuthViewModel
import org.fpm.one.presentation.auth.LoginScreen
import org.fpm.one.presentation.auth.PendingApprovalScreen
import org.fpm.one.presentation.events.EventsViewModel
import org.fpm.one.presentation.home.HomeViewModel
import org.fpm.one.presentation.main.MainScreen
import org.fpm.one.presentation.notifications.NotificationsViewModel
import org.fpm.one.presentation.registration.RegistrationViewModel
import org.fpm.one.presentation.registration.RegistrationWizardScreen
import org.fpm.one.presentation.services.ServicesViewModel
import org.fpm.one.presentation.testimonies.TestimoniesViewModel
import org.fpm.one.presentation.worker.WorkerViewModel

class MainActivity : FragmentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Initialize session manager singleton
    val sessionManager = SessionManager.init(applicationContext)

    // Repositories
    val authRepository = AuthRepository(sessionManager)
    val churchRepository = ChurchRepository()
    val attendanceRepository = AttendanceRepository()
    val notificationRepository = NotificationRepository()

    setContent {
      FpmOneTheme {
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

          // ViewModels
          val authViewModel = remember { AuthViewModel(authRepository) }
          val registrationViewModel = remember { RegistrationViewModel(authRepository, churchRepository) }
          val homeViewModel = remember { HomeViewModel(churchRepository) }
          val servicesViewModel = remember { ServicesViewModel(churchRepository) }
          val eventsViewModel = remember { EventsViewModel(churchRepository) }
          val testimoniesViewModel = remember { TestimoniesViewModel(churchRepository) }
          val workerViewModel = remember { WorkerViewModel(attendanceRepository, churchRepository) }
          val notificationsViewModel = remember { NotificationsViewModel(notificationRepository) }

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
                  }
                )
              }
              "REGISTER" -> {
                RegistrationWizardScreen(
                  viewModel = registrationViewModel,
                  onNavigateBack = {
                    currentScreen = "LOGIN"
                  },
                  onRegistrationComplete = {
                    currentScreen = "PENDING"
                  }
                )
              }
              "PENDING" -> {
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
                  onLogout = {
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
          contentDescription = "Faith Preachers Ministry Emblem",
          modifier = Modifier
            .size(92.dp)
            .clip(CircleShape)
        )
      }

      Spacer(modifier = Modifier.height(24.dp))

      Text(
        text = "FPM ONE",
        fontSize = 28.sp,
        fontWeight = FontWeight.Black,
        color = FpmSurfaceWhite,
        letterSpacing = 2.sp
      )

      Spacer(modifier = Modifier.height(6.dp))

      Text(
        text = "FAITH PREACHERS MINISTRY",
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
