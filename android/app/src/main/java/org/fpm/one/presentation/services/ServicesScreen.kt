package org.fpm.one.presentation.services

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.EmptyStateView
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.FpmCardSkeleton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServicesScreen(viewModel: ServicesViewModel) {
  val state by viewModel.state.collectAsState()
  var activeTab by remember { mutableIntStateOf(0) } // 0 = Schedule, 1 = Highlights

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmSlateBg)
  ) {
    // 1. Header with Segmented Pill Selector
    Surface(
      color = FpmSurfaceWhite,
      shadowElevation = 2.dp
    ) {
      Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Column {
            Text(
              text = "Church Services",
              fontSize = 19.sp,
              fontWeight = FontWeight.Black,
              color = FpmTextPrimary
            )
            Text(
              text = "Weekly gatherings, grace windows, and sermon archives",
              fontSize = 12.sp,
              color = FpmTextSecondary
            )
          }

          IconButton(onClick = { viewModel.loadServices() }) {
            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = FpmGold)
          }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Custom Modern Segmented Pill Control
        Surface(
          color = FpmSlateBg,
          shape = RoundedCornerShape(12.dp),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier
              .padding(4.dp)
              .fillMaxWidth()
          ) {
            Box(
              modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(10.dp))
                .background(if (activeTab == 0) FpmNavyDark else Color.Transparent)
                .clickable { activeTab = 0 }
                .padding(vertical = 8.dp),
              contentAlignment = Alignment.Center
            ) {
              Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
              ) {
                Icon(
                  Icons.Default.CalendarMonth,
                  contentDescription = null,
                  tint = if (activeTab == 0) FpmGoldLight else FpmTextSecondary,
                  modifier = Modifier.size(16.dp)
                )
                Text(
                  text = "Weekly Schedule",
                  fontSize = 12.sp,
                  fontWeight = if (activeTab == 0) FontWeight.Bold else FontWeight.Medium,
                  color = if (activeTab == 0) FpmSurfaceWhite else FpmTextSecondary
                )
              }
            }

            Box(
              modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(10.dp))
                .background(if (activeTab == 1) FpmNavyDark else Color.Transparent)
                .clickable { activeTab = 1 }
                .padding(vertical = 8.dp),
              contentAlignment = Alignment.Center
            ) {
              Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
              ) {
                Icon(
                  Icons.Default.MenuBook,
                  contentDescription = null,
                  tint = if (activeTab == 1) FpmGoldLight else FpmTextSecondary,
                  modifier = Modifier.size(16.dp)
                )
                Text(
                  text = "Sermon Recaps",
                  fontSize = 12.sp,
                  fontWeight = if (activeTab == 1) FontWeight.Bold else FontWeight.Medium,
                  color = if (activeTab == 1) FpmSurfaceWhite else FpmTextSecondary
                )
              }
            }
          }
        }
      }
    }

    PullToRefreshBox(
      isRefreshing = state.isLoading && (state.services.isNotEmpty() || state.highlights.isNotEmpty()),
      onRefresh = { viewModel.loadServices() },
      modifier = Modifier.fillMaxSize()
    ) {
      if (state.isLoading && state.services.isEmpty() && state.highlights.isEmpty()) {
        Column(
          modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
          verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
          FpmCardSkeleton()
          FpmCardSkeleton()
          FpmCardSkeleton()
        }
      } else {
        Crossfade(
          targetState = activeTab,
          animationSpec = tween(250),
          label = "serviceTabTransition"
        ) { tab ->
          if (tab == 0) {
            if (state.services.isEmpty()) {
              EmptyStateView(
                title = "No Services Scheduled",
                subtitle = "Weekly service times will appear here once published by church administration.",
                icon = Icons.Default.Church,
                modifier = Modifier.fillMaxSize()
              )
            } else {
              LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
              ) {
                items(state.services) { svc ->
                  FpmCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      horizontalArrangement = Arrangement.SpaceBetween,
                      verticalAlignment = Alignment.CenterVertically
                    ) {
                      Surface(
                        color = FpmGold.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(6.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, FpmGold.copy(alpha = 0.35f))
                      ) {
                        Text(
                          text = svc.dayOfWeek.uppercase(),
                          fontSize = 10.sp,
                          fontWeight = FontWeight.Bold,
                          color = FpmGoldDark,
                          modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                      }

                      Surface(
                        color = FpmRoyalBlue.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(6.dp)
                      ) {
                        Row(
                          verticalAlignment = Alignment.CenterVertically,
                          horizontalArrangement = Arrangement.spacedBy(4.dp),
                          modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                          Icon(Icons.Default.AccessTime, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(13.dp))
                          Text(
                            text = "${svc.startTime.take(5)} - ${svc.expectedEndTime.take(5)}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmRoyalBlue
                          )
                        }
                      }
                    }

                    Text(
                      text = svc.name,
                      fontSize = 16.sp,
                      fontWeight = FontWeight.Black,
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
                      Column(horizontalAlignment = Alignment.End) {
                        Text("Attendance Timeout", fontSize = 10.sp, color = FpmTextSecondary)
                        Text("${svc.attendanceDurationHours} Hours", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmTextPrimary)
                      }
                    }
                  }
                }
              }
            }
          } else {
            if (state.highlights.isEmpty()) {
              EmptyStateView(
                title = "No Sermon Highlights",
                subtitle = "Sermon recaps, scriptures, and ministerial quotes will be posted after each service.",
                icon = Icons.Default.MenuBook,
                modifier = Modifier.fillMaxSize()
              )
            } else {
              LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
              ) {
                items(state.highlights) { h ->
                  FpmCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      horizontalArrangement = Arrangement.SpaceBetween,
                      verticalAlignment = Alignment.CenterVertically
                    ) {
                      Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                      ) {
                        Box(
                          modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(FpmRoyalBlue),
                          contentAlignment = Alignment.Center
                        ) {
                          Text(
                            text = h.speaker.take(1),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmSurfaceWhite
                          )
                        }
                        Text(
                          text = h.speaker,
                          fontSize = 12.sp,
                          fontWeight = FontWeight.Bold,
                          color = FpmTextPrimary
                        )
                      }

                      Text(
                        text = h.highlightDate,
                        fontSize = 10.sp,
                        color = FpmTextSecondary
                      )
                    }

                    Text(
                      text = h.title,
                      fontSize = 16.sp,
                      fontWeight = FontWeight.Black,
                      color = FpmTextPrimary,
                      modifier = Modifier.padding(top = 8.dp)
                    )

                    if (h.scripture != null) {
                      Surface(
                        modifier = Modifier
                          .fillMaxWidth()
                          .padding(vertical = 8.dp),
                        color = FpmAmberLight.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(8.dp)
                      ) {
                        Row(
                          modifier = Modifier.padding(8.dp),
                          verticalAlignment = Alignment.CenterVertically,
                          horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                          Icon(Icons.Default.BookmarkBorder, contentDescription = null, tint = FpmGoldDark, modifier = Modifier.size(15.dp))
                          Text(
                            text = h.scripture,
                            fontSize = 11.sp,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.Medium,
                            color = FpmTextPrimary
                          )
                        }
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
                          fontStyle = FontStyle.Italic,
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
  }
}
