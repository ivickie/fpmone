package org.fpm.one

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import org.fpm.one.core.security.SessionManager
import org.fpm.one.core.theme.FpmOneTheme
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
          // Navigation State
          val initialScreen = remember {
            val user = SessionManager.getUserSession()
            if (user != null && SessionManager.isLoggedIn()) {
              if (user.accountStatus.lowercase() == "pending_approval") "PENDING" else "MAIN"
            } else {
              "LOGIN"
            }
          }

          var currentScreen by remember { mutableStateOf(initialScreen) }

          // ViewModels
          val authViewModel = remember { AuthViewModel(authRepository) }
          val registrationViewModel = remember { RegistrationViewModel(authRepository, churchRepository) }
          val homeViewModel = remember { HomeViewModel(churchRepository) }
          val servicesViewModel = remember { ServicesViewModel(churchRepository) }
          val eventsViewModel = remember { EventsViewModel(churchRepository) }
          val testimoniesViewModel = remember { TestimoniesViewModel(churchRepository) }
          val workerViewModel = remember { WorkerViewModel(attendanceRepository, churchRepository) }
          val notificationsViewModel = remember { NotificationsViewModel(notificationRepository) }

          when (currentScreen) {
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
