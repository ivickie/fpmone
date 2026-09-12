package org.fpm.one.presentation.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.NotificationItem
import org.fpm.one.presentation.components.EmptyStateView
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.FpmCardSkeleton
import org.fpm.one.presentation.components.FpmTopBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
  viewModel: NotificationsViewModel,
  onBackClick: () -> Unit
) {
  val state by viewModel.state.collectAsState()

  Scaffold(
    topBar = {
      FpmTopBar(
        title = "Notification Center",
        subtitle = "Church Broadcasts & Ministry Alerts",
        onNavigateBack = onBackClick,
        actions = {
          IconButton(onClick = { viewModel.loadNotifications() }) {
            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = FpmGold)
          }
        }
      )
    }
  ) { paddingValues ->
    PullToRefreshBox(
      isRefreshing = state.isLoading && state.notifications.isNotEmpty(),
      onRefresh = { viewModel.loadNotifications() },
      modifier = Modifier
        .fillMaxSize()
        .padding(paddingValues)
        .background(FpmSlateBg)
    ) {
      if (state.isLoading && state.notifications.isEmpty()) {
        Column(
          modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
          verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          FpmCardSkeleton()
          FpmCardSkeleton()
          FpmCardSkeleton()
        }
      } else if (state.notifications.isEmpty()) {
        EmptyStateView(
          icon = Icons.Default.NotificationsNone,
          title = "All Caught Up!",
          subtitle = "You have no new notifications or ministry alerts at this time.",
          modifier = Modifier.fillMaxSize()
        )
      } else {
        LazyColumn(
          modifier = Modifier.fillMaxSize(),
          contentPadding = PaddingValues(16.dp),
          verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          items(state.notifications) { item ->
            NotificationItemCard(
              item = item,
              onClick = { if (!item.isRead) viewModel.markAsRead(item.id) }
            )
          }
        }
      }
    }
  }
}

@Composable
fun NotificationItemCard(
  item: NotificationItem,
  onClick: () -> Unit
) {
  FpmCard(
    modifier = Modifier.fillMaxWidth(),
    backgroundColor = if (item.isRead) FpmSurfaceWhite else Color(0xFFF1F5F9),
    borderColor = if (item.isRead) FpmCardBorder else FpmRoyalBlue.copy(alpha = 0.3f),
    elevation = if (item.isRead) 0.5.dp else 1.5.dp,
    onClick = onClick
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.Top
    ) {
      // Themed Icon based on notification type
      val (icon, tint, bg) = when (item.notificationType.lowercase()) {
        "attendance" -> Triple(Icons.Default.CheckCircle, FpmSuccess, FpmSuccessBg)
        "reminder" -> Triple(Icons.Default.Alarm, FpmGoldDark, FpmAmberLight)
        "urgent" -> Triple(Icons.Default.Warning, FpmCrimson, FpmErrorBg)
        else -> Triple(Icons.Default.Campaign, FpmRoyalBlue, Color(0xFFE0E7FF))
      }

      Box(
        modifier = Modifier
          .size(40.dp)
          .clip(CircleShape)
          .background(bg),
        contentAlignment = Alignment.Center
      ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
      }

      Spacer(modifier = Modifier.width(12.dp))

      Column(modifier = Modifier.weight(1f)) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = item.title,
            fontSize = 14.sp,
            fontWeight = if (item.isRead) FontWeight.SemiBold else FontWeight.Black,
            color = FpmTextPrimary,
            modifier = Modifier.weight(1f)
          )
          if (!item.isRead) {
            Box(
              modifier = Modifier
                .padding(start = 6.dp)
                .size(8.dp)
                .clip(CircleShape)
                .background(FpmCrimson)
            )
          }
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
          text = item.body,
          fontSize = 12.sp,
          color = FpmTextSecondary,
          lineHeight = 17.sp
        )

        Spacer(modifier = Modifier.height(6.dp))

        Text(
          text = item.createdAt.take(16).replace("T", " "),
          fontSize = 10.sp,
          color = FpmTextMuted
        )
      }
    }
  }
}
