package org.fpm.one.core.navigation

sealed class Screen(val route: String) {
  object Login : Screen("login")
  object Register : Screen("register")
  object PendingApproval : Screen("pending_approval")
  object Main : Screen("main")
  object WorkerHub : Screen("worker_hub")
  object Notifications : Screen("notifications")
}

enum class BottomNavTab(val title: String) {
  HOME("Home"),
  EVENTS("Events"),
  SERVICES("Services"),
  TESTIMONIES("Testimonies"),
  PROFILE("Profile")
}
