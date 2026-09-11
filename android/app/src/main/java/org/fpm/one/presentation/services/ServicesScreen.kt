package org.fpm.one.presentation.services

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.LoadingSpinner

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServicesScreen(viewModel: ServicesViewModel) {
  val state by viewModel.state.collectAsState()
  var activeTab by remember { mutableStateOf(0) } // 0 = Schedule, 1 = Highlights

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmSlateBg)
  ) {
    // Header
    Surface(
      color = FpmSurfaceWhite,
      shadowElevation = 1.dp
    ) {
      Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
        Text(
          text = "Service Schedule & Highlights",
          fontSize = 18.sp,
          fontWeight = FontWeight.Black,
          color = FpmTextPrimary
        )
        Text(
          text = "Weekly services, grace periods, and archived sermon recaps",
          fontSize = 12.sp,
          color = FpmTextSecondary,
          modifier = Modifier.padding(top = 2.dp, bottom = 10.dp)
        )

        TabRow(
          selectedTabIndex = activeTab,
          containerColor = FpmSurfaceWhite,
          contentColor = FpmRoyalBlue
        ) {
          Tab(
            selected = activeTab == 0,
            onClick = { activeTab = 0 },
            text = { Text("Weekly Schedules", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
          )
          Tab(
            selected = activeTab == 1,
            onClick = { activeTab = 1 },
            text = { Text("Sermon Highlights", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
          )
        }
      }
    }

    PullToRefreshBox(
      isRefreshing = state.isLoading && (state.services.isNotEmpty() || state.highlights.isNotEmpty()),
      onRefresh = { viewModel.loadServices() },
      modifier = Modifier.fillMaxSize()
    ) {
      if (state.isLoading && state.services.isEmpty() && state.highlights.isEmpty()) {
        LoadingSpinner(message = "Loading Service Information...")
      } else {
        LazyColumn(
          modifier = Modifier.fillMaxSize(),
          contentPadding = PaddingValues(16.dp),
          verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
        if (activeTab == 0) {
          items(state.services) { svc ->
            FpmCard(modifier = Modifier.fillMaxWidth()) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Surface(
                  color = FpmAmberLight,
                  shape = RoundedCornerShape(6.dp)
                ) {
                  Text(
                    text = svc.dayOfWeek.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                  )
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                  Icon(Icons.Default.AccessTime, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(14.dp))
                  Text(
                    text = "${svc.startTime.take(5)} - ${svc.expectedEndTime.take(5)}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmRoyalBlue
                  )
                }
              }

              Text(
                text = svc.name,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTextPrimary,
                modifier = Modifier.padding(top = 8.dp)
              )

              Spacer(modifier = Modifier.height(10.dp))

              Row(
                modifier = Modifier
                  .fillMaxWidth()
                  .background(FpmSlateBg, RoundedCornerShape(10.dp))
                  .padding(10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
              ) {
                Column {
                  Text("Worker Grace Period", fontSize = 10.sp, color = FpmTextSecondary)
                  Text("${svc.gracePeriodMinutes} Minutes", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmTextPrimary)
                }
                Column {
                  Text("Attendance Timeout", fontSize = 10.sp, color = FpmTextSecondary)
                  Text("${svc.attendanceDurationHours} Hours", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmTextPrimary)
                }
              }
            }
          }
        } else {
          items(state.highlights) { h ->
            FpmCard(modifier = Modifier.fillMaxWidth()) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
              ) {
                Text(
                  text = h.highlightDate,
                  fontSize = 10.sp,
                  fontWeight = FontWeight.Bold,
                  color = FpmGold
                )
                Text(
                  text = "Minister: ${h.speaker}",
                  fontSize = 11.sp,
                  fontWeight = FontWeight.SemiBold,
                  color = FpmRoyalBlue
                )
              }

              Text(
                text = h.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = FpmTextPrimary,
                modifier = Modifier.padding(top = 4.dp)
              )

              if (h.scripture != null) {
                Surface(
                  modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                  color = FpmAmberLight.copy(alpha = 0.5f),
                  shape = RoundedCornerShape(8.dp)
                ) {
                  Text(
                    text = h.scripture,
                    fontSize = 11.sp,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                    color = FpmTextPrimary,
                    modifier = Modifier.padding(8.dp)
                  )
                }
              }

              Text(
                text = h.summary,
                fontSize = 12.sp,
                color = FpmTextPrimary,
                lineHeight = 18.sp
              )

              if (h.quote != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                  modifier = Modifier.fillMaxWidth(),
                  color = Color(0xFFF1F5F9),
                  shape = RoundedCornerShape(8.dp)
                ) {
                  Text(
                    text = "\"${h.quote}\"",
                    fontSize = 11.sp,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                    color = FpmRoyalBlue,
                    modifier = Modifier.padding(10.dp)
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
}
