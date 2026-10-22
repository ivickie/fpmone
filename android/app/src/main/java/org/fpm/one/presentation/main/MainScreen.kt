package org.fpm.one.presentation.main

import androidx.activity.compose.BackHandler
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.security.SessionManager
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.events.EventsScreen
import org.fpm.one.presentation.events.EventsViewModel
import org.fpm.one.presentation.home.HomeScreen
import org.fpm.one.presentation.home.HomeViewModel
import org.fpm.one.presentation.notifications.NotificationsScreen
import org.fpm.one.presentation.notifications.NotificationsViewModel
import org.fpm.one.presentation.profile.ProfileScreen
import org.fpm.one.presentation.services.ServicesScreen
import org.fpm.one.presentation.services.ServicesViewModel
import org.fpm.one.presentation.testimonies.TestimoniesScreen
import org.fpm.one.presentation.biblegame.BibleGameScreen
import org.fpm.one.presentation.biblegame.BibleGameViewModel
import org.fpm.one.presentation.testimonies.TestimoniesViewModel
import org.fpm.one.presentation.worker.WorkerHubScreen
import org.fpm.one.presentation.worker.WorkerViewModel

sealed class BottomNavTab(val route: String, val title: String, val icon: ImageVector) {
  object Home : BottomNavTab("home", "Home", Icons.Default.Home)
  object Services : BottomNavTab("services", "Services", Icons.Default.Church)
  object Events : BottomNavTab("events", "Events", Icons.Default.Event)
  object Testimonies : BottomNavTab("testimonies", "Testimonies", Icons.Default.Favorite)
  object Profile : BottomNavTab("profile", "Profile", Icons.Default.Person)
}

@Composable
fun MainScreen(
  homeViewModel: HomeViewModel,
  servicesViewModel: ServicesViewModel,
  eventsViewModel: EventsViewModel,
  testimoniesViewModel: TestimoniesViewModel,
  workerViewModel: WorkerViewModel,
  notificationsViewModel: NotificationsViewModel,
  bibleGameViewModel: BibleGameViewModel = remember { BibleGameViewModel() },
  initialActionUrl: String? = null,
  onLogout: () -> Unit
) {
  var selectedTab by remember {
    mutableStateOf<BottomNavTab>(
      when {
        initialActionUrl?.contains("services") == true -> BottomNavTab.Services
        initialActionUrl?.contains("events") == true -> BottomNavTab.Events
        initialActionUrl?.contains("testimonies") == true -> BottomNavTab.Testimonies
        else -> BottomNavTab.Home
      }
    )
  }
  var subScreen by remember {
    mutableStateOf<String?>(
      when {
        initialActionUrl?.contains("notifications") == true -> "notifications"
        initialActionUrl?.contains("bible") == true -> "bible_challenge"
        else -> null
      }
    )
  }
  val user = remember { SessionManager.getUserSession() }
  val tabBackStack = remember { mutableStateListOf<BottomNavTab>() }

  // Intercept back button when on a secondary tab or deep tab stack to return to Home before app exit
  BackHandler(enabled = subScreen == null && (selectedTab != BottomNavTab.Home || tabBackStack.isNotEmpty())) {
    if (tabBackStack.isNotEmpty()) {
      selectedTab = tabBackStack.removeAt(tabBackStack.size - 1)
    } else {
      selectedTab = BottomNavTab.Home
    }
  }

  val tabs = listOf(
    BottomNavTab.Home,
    BottomNavTab.Services,
    BottomNavTab.Events,
    BottomNavTab.Testimonies,
    BottomNavTab.Profile
  )

  Crossfade(
    targetState = subScreen,
    animationSpec = tween(300),
    label = "subScreenTransition"
  ) { currentSub ->
    when (currentSub) {
      "worker_hub" -> {
        BackHandler { subScreen = null }
        WorkerHubScreen(
          viewModel = workerViewModel,
          onNavigateBack = { subScreen = null }
        )
      }
      "notifications" -> {
        BackHandler { subScreen = null }
        NotificationsScreen(
          viewModel = notificationsViewModel,
          onBackClick = { subScreen = null }
        )
      }
      "bible_challenge" -> {
        BibleGameScreen(
          viewModel = bibleGameViewModel,
          onNavigateBack = { subScreen = null }
        )
      }
      else -> {
        Scaffold(
          containerColor = FpmTheme.canvasBackground,
          bottomBar = {
            Surface(
              color = FpmTheme.bottomNavBackground,
              shadowElevation = 8.dp,
              border = androidx.compose.foundation.BorderStroke(0.5.dp, FpmTheme.cardBorder)
            ) {
              NavigationBar(
                containerColor = FpmTheme.bottomNavBackground,
                tonalElevation = 0.dp,
                modifier = Modifier
                  .height(72.dp)
                  .padding(top = 6.dp, bottom = 4.dp)
              ) {
                tabs.forEach { tab ->
                  val isSelected = selectedTab == tab
                  val activeColor = if (FpmTheme.isDark) FpmGold else FpmNavyDark
                  val inactiveColor = FpmTheme.textMuted
                  NavigationBarItem(
                    selected = isSelected,
                    icon = {
                      Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.title,
                        tint = if (isSelected) activeColor else inactiveColor
                      )
                    },
                    label = {
                      Text(
                        text = tab.title,
                        fontSize = 10.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) activeColor else inactiveColor
                      )
                    },
                    onClick = {
                      if (selectedTab != tab) {
                        tabBackStack.add(selectedTab)
                        selectedTab = tab
                      }
                    },
                    colors = NavigationBarItemDefaults.colors(
                      indicatorColor = if (FpmTheme.isDark) FpmNavySurface else FpmGoldSubtle,
                      selectedIconColor = activeColor,
                      selectedTextColor = activeColor,
                      unselectedIconColor = inactiveColor,
                      unselectedTextColor = inactiveColor
                    )
                  )
                }
              }
            }
          }
        ) { paddingValues ->
          Box(
            modifier = Modifier
              .fillMaxSize()
              .padding(paddingValues)
          ) {
            Crossfade(
              targetState = selectedTab,
              animationSpec = tween(250),
              label = "tabContentTransition"
            ) { activeTab ->
              when (activeTab) {
                BottomNavTab.Home -> {
                  HomeScreen(
                    viewModel = homeViewModel,
                    currentUser = user,
                    onNavigateToServices = { selectedTab = BottomNavTab.Services },
                    onNavigateToNotifications = { subScreen = "notifications" },
                    onOpenWorkerHub = { subScreen = "worker_hub" },
                    onOpenBibleChallenge = { subScreen = "bible_challenge" }
                  )
                }
                BottomNavTab.Services -> {
                  ServicesScreen(viewModel = servicesViewModel)
                }
                BottomNavTab.Events -> {
                  EventsScreen(viewModel = eventsViewModel)
                }
                BottomNavTab.Testimonies -> {
                  TestimoniesScreen(viewModel = testimoniesViewModel)
                }
                BottomNavTab.Profile -> {
                  ProfileScreen(
                    onNavigateToWorkerHub = { subScreen = "worker_hub" },
                    onNavigateToNotifications = { subScreen = "notifications" },
                    onLogout = onLogout
                  )
                }
              }
            }
          }
        }
      }
    }
  }
}
