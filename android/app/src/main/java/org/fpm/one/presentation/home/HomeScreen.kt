package org.fpm.one.presentation.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import org.fpm.one.R
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.UserSession
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.LoadingSpinner
import org.fpm.one.presentation.components.OfflineBanner

@Composable
fun HomeScreen(
  viewModel: HomeViewModel,
  currentUser: UserSession?,
  onNavigateToServices: () -> Unit,
  onNavigateToNotifications: () -> Unit,
  onOpenWorkerHub: () -> Unit
) {
  val state by viewModel.state.collectAsState()

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmSlateBg)
  ) {
    // Church Header
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .background(FpmNavyDark)
        .padding(horizontal = 20.dp, vertical = 18.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
          Image(
            painter = painterResource(id = R.drawable.church_logo),
            contentDescription = "Faith Preachers Ministry Emblem",
            modifier = Modifier
              .size(46.dp)
              .clip(CircleShape)
              .border(1.5.dp, FpmGold, CircleShape)
          )
          Column {
            Text(
              text = "Faith Preachers Ministry",
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold,
              color = FpmAmber
            )
            Text(
              text = "Welcome, ${currentUser?.firstName ?: "Beloved"}",
              fontSize = 17.sp,
              fontWeight = FontWeight.Black,
              color = FpmSurfaceWhite
            )
            Text(
              text = currentUser?.branchName ?: "Cathedral of Grace HQ",
              fontSize = 11.sp,
              color = Color(0xFF94A3B8)
            )
          }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          if (currentUser?.isWorker == true) {
            IconButton(
              onClick = onOpenWorkerHub,
              modifier = Modifier
                .background(FpmRoyalBlue, CircleShape)
                .size(38.dp)
            ) {
              Icon(Icons.Default.Badge, contentDescription = "Worker Hub", tint = FpmAmber, modifier = Modifier.size(20.dp))
            }
          }

          IconButton(
            onClick = onNavigateToNotifications,
            modifier = Modifier
              .background(Color(0xFF1E293B), CircleShape)
              .size(38.dp)
          ) {
            Icon(Icons.Default.Notifications, contentDescription = "Notifications", tint = FpmSurfaceWhite, modifier = Modifier.size(20.dp))
          }
        }
      }
    }

    OfflineBanner(isOffline = state.isOffline)

    if (state.isLoading) {
      LoadingSpinner(message = "Fetching Church Announcements & Word...")
    } else {
      LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
      ) {
        // 1. Next Service Card
        if (state.nextService != null) {
          item {
            FpmCard(
              modifier = Modifier.fillMaxWidth(),
              backgroundColor = Color(0xFFEFF6FF)
            ) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                  Box(
                    modifier = Modifier
                      .size(40.dp)
                      .background(FpmRoyalBlue, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                  ) {
                    Icon(Icons.Default.AccessTime, contentDescription = null, tint = FpmSurfaceWhite, modifier = Modifier.size(20.dp))
                  }
                  Column {
                    Text(
                      text = "UPCOMING SERVICE",
                      fontSize = 10.sp,
                      fontWeight = FontWeight.Bold,
                      color = FpmRoyalBlue
                    )
                    Text(
                      text = state.nextService!!.name,
                      fontSize = 14.sp,
                      fontWeight = FontWeight.Bold,
                      color = FpmTextPrimary
                    )
                    Text(
                      text = "${state.nextService!!.dayOfWeek}s at ${state.nextService!!.startTime.substring(0, 5)} • Grace: ${state.nextService!!.gracePeriodMinutes}m",
                      fontSize = 11.sp,
                      color = FpmTextSecondary
                    )
                  }
                }
              }
            }
          }
        }

        // 2. Sermon Highlight Card (if any)
        val topHighlight = state.highlights.firstOrNull()
        if (topHighlight != null) {
          item {
            FpmCard(
              modifier = Modifier.fillMaxWidth(),
              backgroundColor = FpmSurfaceWhite
            ) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Text(
                  text = "SERMON HIGHLIGHT",
                  fontSize = 10.sp,
                  fontWeight = FontWeight.Bold,
                  color = FpmGold
                )
                Text(
                  text = topHighlight.highlightDate,
                  fontSize = 10.sp,
                  color = FpmTextSecondary
                )
              }

              Text(
                text = topHighlight.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Black,
                color = FpmTextPrimary,
                modifier = Modifier.padding(top = 4.dp)
              )

              Text(
                text = "Preached by ${topHighlight.speaker}",
                fontSize = 11.sp,
                color = FpmTextSecondary
              )

              if (topHighlight.scripture != null) {
                Surface(
                  modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                  color = FpmAmberLight.copy(alpha = 0.6f),
                  shape = RoundedCornerShape(8.dp)
                ) {
                  Text(
                    text = topHighlight.scripture!!,
                    fontSize = 11.sp,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                    color = FpmTextPrimary,
                    modifier = Modifier.padding(8.dp)
                  )
                }
              }

              Text(
                text = topHighlight.summary,
                fontSize = 12.sp,
                color = FpmTextPrimary,
                lineHeight = 18.sp
              )
            }
          }
        }

        // 3. Social Feed Posts
        items(state.posts) { post ->
          FpmCard(modifier = Modifier.fillMaxWidth()) {
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = Alignment.CenterVertically
            ) {
              Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(
                  modifier = Modifier
                    .size(34.dp)
                    .background(Color(0xFFE0E7FF), CircleShape),
                  contentAlignment = Alignment.Center
                ) {
                  Text(
                    text = post.authorName.take(1),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmRoyalBlue
                  )
                }
                Column {
                  Text(text = post.authorName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = FpmTextPrimary)
                  Text(text = post.createdAt.take(10), fontSize = 10.sp, color = FpmTextSecondary)
                }
              }

              if (post.isPinned) {
                Surface(
                  color = FpmAmberLight,
                  shape = RoundedCornerShape(6.dp)
                ) {
                  Row(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically
                  ) {
                    Icon(Icons.Default.PushPin, contentDescription = null, tint = FpmGold, modifier = Modifier.size(10.dp))
                    Text(" Pinned", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = FpmGold)
                  }
                }
              }
            }

            if (post.title != null) {
              Text(
                text = post.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTextPrimary,
                modifier = Modifier.padding(top = 8.dp)
              )
            }

            if (post.scriptureReference != null) {
              Text(
                text = "Scripture: ${post.scriptureReference}",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = FpmRoyalBlue,
                modifier = Modifier.padding(top = 2.dp)
              )
            }

            Text(
              text = post.content,
              fontSize = 12.sp,
              color = FpmTextPrimary,
              lineHeight = 18.sp,
              modifier = Modifier.padding(vertical = 8.dp)
            )

            // Interaction buttons
            Row(
              modifier = Modifier
                .fillMaxWidth()
                .padding(top = 6.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = Alignment.CenterVertically
            ) {
              Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                TextButton(
                  onClick = { viewModel.reactToPost(post.id, "amen") },
                  contentPadding = PaddingValues(0.dp)
                ) {
                  Icon(Icons.Default.ThumbUp, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(16.dp))
                  Spacer(modifier = Modifier.width(4.dp))
                  Text(text = "Amen (${post.likesCount})", fontSize = 11.sp, color = FpmRoyalBlue, fontWeight = FontWeight.Bold)
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                  Icon(Icons.Default.ChatBubbleOutline, contentDescription = null, tint = FpmTextSecondary, modifier = Modifier.size(16.dp))
                  Spacer(modifier = Modifier.width(4.dp))
                  Text(text = "${post.commentsCount} Comments", fontSize = 11.sp, color = FpmTextSecondary)
                }
              }
            }
          }
        }
      }
    }
  }
}
