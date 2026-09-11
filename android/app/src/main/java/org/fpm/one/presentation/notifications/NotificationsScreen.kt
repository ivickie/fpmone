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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.NotificationItem
import org.fpm.one.presentation.components.EmptyStateView
import org.fpm.one.presentation.components.LoadingSpinner

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
  viewModel: NotificationsViewModel,
  onBackClick: () -> Unit
) {
  val state by viewModel.state.collectAsState()

  Scaffold(
    topBar = {
      TopAppBar(
        title = {
          Text(
            text = "Notification Center",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = FpmSurfaceWhite
          )
        },
        navigationIcon = {
          IconButton(onClick = onBackClick) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = FpmSurfaceWhite)
          }
        },
        actions = {
          IconButton(onClick = { viewModel.loadNotifications() }) {
            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = FpmGold)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(
          containerColor = FpmNavy
        )
      )
    }
  ) { paddingValues ->
    Box(
      modifier = Modifier
        .fillMaxSize()
        .padding(paddingValues)
        .background(FpmSlateBg)
    ) {
      if (state.isLoading && state.notifications.isEmpty()) {
        LoadingSpinner(modifier = Modifier.fillMaxSize())
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
  Surface(
    color = if (item.isRead) FpmSurfaceWhite else FpmNavy.copy(alpha = 0.05f),
    shape = RoundedCornerShape(12.dp),
    shadowElevation = if (item.isRead) 0.5.dp else 1.dp,
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
  ) {
    Row(
      modifier = Modifier.padding(14.dp),
      verticalAlignment = Alignment.Top
    ) {
      // Icon
      val (icon, tint) = when (item.notificationType.lowercase()) {
        "attendance" -> Icons.Default.CheckCircle to FpmSuccess
        "reminder" -> Icons.Default.Alarm to FpmGoldDark
        "urgent" -> Icons.Default.Warning to FpmCrimson
        else -> Icons.Default.Campaign to FpmNavy
      }

      Box(
        modifier = Modifier
          .size(38.dp)
          .clip(CircleShape)
          .background(tint.copy(alpha = 0.12f)),
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
            fontWeight = if (item.isRead) FontWeight.SemiBold else FontWeight.Bold,
            color = FpmTextPrimary
          )
          if (!item.isRead) {
            Box(
              modifier = Modifier
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
