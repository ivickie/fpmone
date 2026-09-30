package org.fpm.one.presentation.services

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.ServiceHighlightItem
import org.fpm.one.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServicesScreen(viewModel: ServicesViewModel) {
  val context = LocalContext.current
  val state by viewModel.state.collectAsState()
  var activeTab by remember { mutableIntStateOf(0) } // 0 = Schedule, 1 = Highlights
  var activeLightboxImageUrl by remember { mutableStateOf<String?>(null) }
  var activeHighlightDetail by remember { mutableStateOf<ServiceHighlightItem?>(null) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmIvoryBg)
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
                  Icons.AutoMirrored.Filled.MenuBook,
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
                // 1. Editorial Worship Hero Banner
                item {
                  FpmEditorialHero(
                    title = "Gather in His Presence",
                    subtitle = "Experience dynamic worship, sound doctrine, and the move of the Holy Spirit.",
                    kicker = "CHURCH SERVICES",
                    imageUrl = state.services.firstOrNull { !it.imageUrl.isNullOrBlank() }?.imageUrl
                      ?: state.highlights.firstOrNull { it.photos.isNotEmpty() }?.photos?.firstOrNull(),
                    ctaText = null,
                    onCtaClick = null
                  )
                }

                items(state.services) { svc ->
                  FpmCard(modifier = Modifier.fillMaxWidth()) {
                    if (!svc.imageUrl.isNullOrBlank()) {
                      Box(
                        modifier = Modifier
                          .fillMaxWidth()
                          .height(180.dp)
                          .clip(RoundedCornerShape(12.dp))
                          .clickable { activeLightboxImageUrl = svc.imageUrl }
                      ) {
                        FpmAsyncImage(
                          model = svc.imageUrl,
                          contentDescription = "${svc.name} Flyer",
                          fallbackCategory = "worship",
                          fallbackTitle = svc.name,
                          modifier = Modifier.fillMaxSize()
                        )
                        Surface(
                          modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(8.dp),
                          color = FpmNavyDeep.copy(alpha = 0.85f),
                          shape = RoundedCornerShape(6.dp)
                        ) {
                          Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                          ) {
                            Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(13.dp))
                            Text("View Flyer", color = FpmGoldLight, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                          }
                        }
                      }
                      Spacer(modifier = Modifier.height(10.dp))
                    }

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

                    if (!svc.liveStreamUrl.isNullOrBlank()) {
                      val isStarted = remember(svc.dayOfWeek, svc.startTime) {
                        isServiceStarted(svc.dayOfWeek, svc.startTime)
                      }
                      Spacer(modifier = Modifier.height(10.dp))
                      Surface(
                        modifier = Modifier
                          .fillMaxWidth()
                          .clip(RoundedCornerShape(10.dp))
                          .clickable {
                            if (!isStarted) {
                              android.widget.Toast.makeText(
                                context,
                                "This service is yet to start. Streaming will begin on ${svc.dayOfWeek} at ${svc.startTime.take(5)}.",
                                android.widget.Toast.LENGTH_SHORT
                              ).show()
                            } else {
                              try {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(svc.liveStreamUrl))
                                context.startActivity(intent)
                              } catch (e: Exception) {
                                android.widget.Toast.makeText(context, "Could not open streaming link", android.widget.Toast.LENGTH_SHORT).show()
                              }
                            }
                          },
                        color = if (isStarted) Color(0xFFDC2626) else FpmSlateBg
                      ) {
                        Row(
                          modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 10.dp, horizontal = 12.dp),
                          verticalAlignment = Alignment.CenterVertically,
                          horizontalArrangement = Arrangement.Center
                        ) {
                          Icon(
                            imageVector = if (isStarted) Icons.Default.PlayArrow else Icons.Default.AccessTime,
                            contentDescription = null,
                            tint = if (isStarted) Color.White else FpmTextSecondary,
                            modifier = Modifier.size(18.dp)
                          )
                          Spacer(modifier = Modifier.width(6.dp))
                          Text(
                            text = if (isStarted) "Watch Service Live Online" else "Live Stream Starts ${svc.dayOfWeek} ${svc.startTime.take(5)}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isStarted) Color.White else FpmTextSecondary
                          )
                        }
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
                icon = Icons.AutoMirrored.Filled.MenuBook,
                modifier = Modifier.fillMaxSize()
              )
            } else {
              LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
              ) {
                items(state.highlights) { h ->
                  FpmCard(
                    modifier = Modifier
                      .fillMaxWidth()
                      .clickable { activeHighlightDetail = h },
                    backgroundColor = FpmSurfaceWhite,
                    borderColor = FpmCardBorder
                  ) {
                    // 1. Post Header: Speaker Avatar & Date
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      horizontalArrangement = Arrangement.SpaceBetween,
                      verticalAlignment = Alignment.CenterVertically
                    ) {
                      Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                      ) {
                        Box(
                          modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(FpmNavyDark),
                          contentAlignment = Alignment.Center
                        ) {
                          Text(
                            text = h.speaker.take(1),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmGoldLight
                          )
                        }
                        Column {
                          Text(
                            text = "Preached by ${h.speaker}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmTextPrimary
                          )
                          Text(
                            text = h.highlightDate,
                            fontSize = 10.sp,
                            color = FpmTextSecondary
                          )
                        }
                      }

                      Surface(
                        color = FpmGold.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(0.5.dp, FpmGold.copy(alpha = 0.4f))
                      ) {
                        Text(
                          text = "SERMON RECAP",
                          fontSize = 10.sp,
                          fontWeight = FontWeight.Bold,
                          color = FpmGoldDark,
                          letterSpacing = 0.8.sp,
                          modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                      }
                    }

                    // 2. Post Title (Text comes before media)
                    Text(
                      text = h.title,
                      fontSize = 16.sp,
                      fontWeight = FontWeight.Black,
                      color = FpmTextPrimary,
                      modifier = Modifier.padding(top = 10.dp)
                    )

                    // 3. Anchor Scripture (if present)
                    if (!h.scripture.isNullOrBlank()) {
                      Surface(
                        modifier = Modifier
                          .fillMaxWidth()
                          .padding(vertical = 6.dp),
                        color = FpmGoldSubtle,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(0.5.dp, FpmGoldMuted.copy(alpha = 0.3f))
                      ) {
                        Row(
                          modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                          verticalAlignment = Alignment.CenterVertically,
                          horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                          Text(text = "📖", fontSize = 13.sp)
                          Text(
                            text = h.scripture!!,
                            fontSize = 12.sp,
                            fontStyle = FontStyle.Italic,
                            color = FpmTextPrimary
                          )
                        }
                      }
                    }

                    // 4. Expandable Message Summary (Truncated with "See more" button)
                    ExpandableFacebookText(
                      text = h.summary,
                      maxChars = 160,
                      modifier = Modifier.padding(top = 4.dp),
                      onSeeMoreClick = { activeHighlightDetail = h }
                    )

                    // 5. Facebook Media Grid (Comes AFTER the text; 2 boxes with +X overlay for multi-images)
                    if (h.photos.isNotEmpty() || !h.videoUrl.isNullOrBlank()) {
                      Spacer(modifier = Modifier.height(10.dp))
                      FacebookMediaGrid(
                        photos = h.photos,
                        videoUrl = h.videoUrl,
                        onMediaClick = { activeHighlightDetail = h }
                      )
                    }

                    // 6. Inspiring Quote (if present)
                    if (!h.quote.isNullOrBlank()) {
                      Spacer(modifier = Modifier.height(8.dp))
                      Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = FpmSlateBg,
                        shape = RoundedCornerShape(8.dp)
                      ) {
                        Text(
                          text = "“${h.quote}”",
                          fontSize = 11.sp,
                          fontStyle = FontStyle.Italic,
                          color = FpmNavyDark,
                          modifier = Modifier.padding(10.dp)
                        )
                      }
                    }

                    // 7. Post Footer Action
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      horizontalArrangement = Arrangement.End,
                      verticalAlignment = Alignment.CenterVertically
                    ) {
                      Text(
                        text = "Full Recap & Notes →",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmRoyalBlue,
                        modifier = Modifier.clickable { activeHighlightDetail = h }
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

  if (activeLightboxImageUrl != null) {
    FpmFullscreenLightbox(
      imageUrl = activeLightboxImageUrl!!,
      title = "Faith Preachers Ministries Int'l",
      onDismiss = { activeLightboxImageUrl = null }
    )
  }

  if (activeHighlightDetail != null) {
    SermonRecapDetailDialog(
      highlight = activeHighlightDetail!!,
      onDismiss = { activeHighlightDetail = null },
      onPhotoClick = { activeLightboxImageUrl = it }
    )
  }
}

