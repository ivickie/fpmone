package org.fpm.one.presentation.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.R
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.PostItem
import org.fpm.one.data.model.UserSession
import org.fpm.one.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
  viewModel: HomeViewModel,
  currentUser: UserSession?,
  onNavigateToServices: () -> Unit,
  onNavigateToNotifications: () -> Unit,
  onOpenWorkerHub: () -> Unit
) {
  val context = LocalContext.current
  val state by viewModel.state.collectAsState()
  var activeCommentPost by remember { mutableStateOf<PostItem?>(null) }
  var commentInputText by remember { mutableStateOf("") }
  var isSubmittingComment by remember { mutableStateOf(false) }
  var commentErrorMessage by remember { mutableStateOf<String?>(null) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmSlateBg)
  ) {
    // 1. Premium Church Brand Header
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .background(
          Brush.verticalGradient(
            colors = listOf(FpmNavyDeep, FpmNavyDark)
          )
        )
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
          Box(
            modifier = Modifier
              .size(50.dp)
              .clip(CircleShape)
              .background(FpmGold.copy(alpha = 0.15f))
              .border(1.5.dp, FpmGold, CircleShape)
              .padding(2.dp),
            contentAlignment = Alignment.Center
          ) {
            Image(
              painter = painterResource(id = R.drawable.church_logo),
              contentDescription = "Faith Preachers Ministry Emblem",
              modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
            )
          }

          Column {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
              Text(
                text = "FAITH PREACHERS MINISTRY",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = FpmGoldLight,
                letterSpacing = 0.8.sp
              )
            }
            Text(
              text = "Welcome, ${currentUser?.firstName ?: "Beloved"}",
              fontSize = 18.sp,
              fontWeight = FontWeight.Black,
              color = FpmSurfaceWhite
            )
            Surface(
              color = Color.White.copy(alpha = 0.12f),
              shape = RoundedCornerShape(4.dp),
              modifier = Modifier.padding(top = 2.dp)
            ) {
              Text(
                text = currentUser?.branchName ?: "Cathedral of Grace HQ",
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFFCBD5E1),
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
              )
            }
          }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          if (currentUser?.isWorker == true) {
            IconButton(
              onClick = onOpenWorkerHub,
              modifier = Modifier
                .background(FpmRoyalBlue, CircleShape)
                .size(40.dp)
            ) {
              Icon(
                Icons.Default.Badge,
                contentDescription = "Worker Portal",
                tint = FpmGoldLight,
                modifier = Modifier.size(20.dp)
              )
            }
          }

          IconButton(
            onClick = onNavigateToNotifications,
            modifier = Modifier
              .background(Color(0xFF1E293B), CircleShape)
              .size(40.dp)
          ) {
            Icon(
              Icons.Default.Notifications,
              contentDescription = "Notifications",
              tint = FpmSurfaceWhite,
              modifier = Modifier.size(20.dp)
            )
          }
        }
      }
    }

    OfflineBanner(isOffline = state.isOffline)

    PullToRefreshBox(
      isRefreshing = state.isLoading && (state.posts.isNotEmpty() || state.nextService != null),
      onRefresh = { viewModel.loadHomeData() },
      modifier = Modifier.fillMaxSize()
    ) {
      if (state.isLoading && state.posts.isEmpty() && state.nextService == null) {
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
        LazyColumn(
          modifier = Modifier.fillMaxSize(),
          contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
          verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
          // 2. Upcoming Service Hero Card
          if (state.nextService != null) {
            item {
              val svc = state.nextService!!
              Surface(
                modifier = Modifier
                  .fillMaxWidth()
                  .clip(RoundedCornerShape(18.dp))
                  .clickable(onClick = onNavigateToServices),
                color = Color.Transparent
              ) {
                Box(
                  modifier = Modifier
                    .background(
                      Brush.linearGradient(
                        colors = listOf(
                          FpmNavy,
                          Color(0xFF1E3A8A)
                        )
                      )
                    )
                    .border(1.dp, FpmRoyalBlue.copy(alpha = 0.3f), RoundedCornerShape(18.dp))
                    .padding(16.dp)
                ) {
                  Column {
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      horizontalArrangement = Arrangement.SpaceBetween,
                      verticalAlignment = Alignment.CenterVertically
                    ) {
                      Surface(
                        color = FpmGold.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(6.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, FpmGold.copy(alpha = 0.4f))
                      ) {
                        Row(
                          modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                          verticalAlignment = Alignment.CenterVertically,
                          horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                          Icon(Icons.Default.Schedule, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(12.dp))
                          Text(
                            text = "UPCOMING SERVICE",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmGoldLight,
                            letterSpacing = 0.5.sp
                          )
                        }
                      }

                      Surface(
                        color = Color.White.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp)
                      ) {
                        Text(
                          text = "${svc.dayOfWeek}s",
                          fontSize = 11.sp,
                          fontWeight = FontWeight.Bold,
                          color = FpmSurfaceWhite,
                          modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                      }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                      text = svc.name,
                      fontSize = 17.sp,
                      fontWeight = FontWeight.Black,
                      color = FpmSurfaceWhite
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                      verticalAlignment = Alignment.CenterVertically,
                      horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                      Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                      ) {
                        Icon(Icons.Default.AccessTime, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(14.dp))
                        Text(
                          text = svc.startTime.take(5),
                          fontSize = 13.sp,
                          fontWeight = FontWeight.Bold,
                          color = FpmGoldLight
                        )
                      }

                      Text(
                        text = "•",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 12.sp
                      )

                      Text(
                        text = "Worker Grace: ${svc.gracePeriodMinutes} mins",
                        fontSize = 11.sp,
                        color = Color(0xFFE2E8F0)
                      )
                    }

                    if (!svc.liveStreamUrl.isNullOrBlank()) {
                      Spacer(modifier = Modifier.height(12.dp))
                      Surface(
                        modifier = Modifier
                          .clip(RoundedCornerShape(8.dp))
                          .clickable {
                            try {
                              val intent = Intent(Intent.ACTION_VIEW, Uri.parse(svc.liveStreamUrl))
                              context.startActivity(intent)
                            } catch (e: Exception) {
                              // Ignore if no browser / app found
                            }
                          },
                        color = Color(0xFFDC2626)
                      ) {
                        Row(
                          modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                          verticalAlignment = Alignment.CenterVertically,
                          horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                          Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                          )
                          Text(
                            text = "Watch Live Online",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                          )
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // 4. Daily Inspiration / Word of Grace
          item {
            FpmCard(
              modifier = Modifier.fillMaxWidth(),
              backgroundColor = Color(0xFFFFFDF5),
              borderColor = FpmGoldLight
            ) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                  Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = FpmGold, modifier = Modifier.size(16.dp))
                  Text(
                    text = "WORD FOR THE SEASON",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGoldDark,
                    letterSpacing = 0.8.sp
                  )
                }
                Text(
                  text = "Jeremiah 1:8",
                  fontSize = 10.sp,
                  fontWeight = FontWeight.Bold,
                  color = FpmTextSecondary
                )
              }

              Spacer(modifier = Modifier.height(6.dp))

              Text(
                text = "\"Be not afraid of their faces: for I am with thee to deliver thee, saith the LORD.\"",
                fontSize = 13.sp,
                fontStyle = FontStyle.Italic,
                fontWeight = FontWeight.Medium,
                color = FpmTextPrimary,
                lineHeight = 19.sp
              )
            }
          }

          // 5. Sermon Highlights (if available)
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
                  Surface(
                    color = FpmAmberLight,
                    shape = RoundedCornerShape(6.dp)
                  ) {
                    Text(
                      text = "SERMON HIGHLIGHT",
                      fontSize = 10.sp,
                      fontWeight = FontWeight.Bold,
                      color = FpmGoldDark,
                      modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                  }
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
                  modifier = Modifier.padding(top = 6.dp)
                )

                Text(
                  text = "Preached by ${topHighlight.speaker}",
                  fontSize = 11.sp,
                  fontWeight = FontWeight.SemiBold,
                  color = FpmRoyalBlue,
                  modifier = Modifier.padding(top = 2.dp)
                )

                if (topHighlight.scripture != null) {
                  Surface(
                    modifier = Modifier
                      .fillMaxWidth()
                      .padding(vertical = 8.dp),
                    color = FpmAmberLight.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(8.dp)
                  ) {
                    Text(
                      text = topHighlight.scripture!!,
                      fontSize = 11.sp,
                      fontStyle = FontStyle.Italic,
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

          // 6. Section Header for Feed
          item {
            FpmSectionHeader(
              kicker = "CHURCH LIFE",
              title = "Announcements & Word",
              actionText = "Refresh",
              onActionClick = { viewModel.loadHomeData() }
            )
          }

          // 7. Social Feed Posts
          items(state.posts) { post ->
            FpmCard(modifier = Modifier.fillMaxWidth()) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                  Box(
                    modifier = Modifier
                      .size(36.dp)
                      .clip(CircleShape)
                      .background(FpmRoyalBlue),
                    contentAlignment = Alignment.Center
                  ) {
                    Text(
                      text = post.authorName.take(1).uppercase(),
                      fontSize = 14.sp,
                      fontWeight = FontWeight.Bold,
                      color = FpmSurfaceWhite
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
                      Text(" Pinned", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = FpmGoldDark)
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
                  modifier = Modifier.padding(top = 10.dp)
                )
              }

              if (post.scriptureReference != null) {
                Surface(
                  color = FpmRoyalBlue.copy(alpha = 0.08f),
                  shape = RoundedCornerShape(6.dp),
                  modifier = Modifier.padding(top = 4.dp)
                ) {
                  Text(
                    text = "📖 ${post.scriptureReference}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FpmRoyalBlue,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                  )
                }
              }

              Text(
                text = post.content,
                fontSize = 12.sp,
                color = FpmTextPrimary,
                lineHeight = 18.sp,
                modifier = Modifier.padding(vertical = 8.dp)
              )

              Divider(color = FpmBorderLight, modifier = Modifier.padding(top = 4.dp, bottom = 6.dp))

              // Interaction buttons
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Row(
                  horizontalArrangement = Arrangement.spacedBy(12.dp),
                  verticalAlignment = Alignment.CenterVertically
                ) {
                  TextButton(
                    onClick = { viewModel.reactToPost(post.id, "amen") },
                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                  ) {
                    Icon(Icons.Default.ThumbUp, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = "Amen (${post.likesCount})", fontSize = 12.sp, color = FpmRoyalBlue, fontWeight = FontWeight.Bold)
                  }

                  if (post.postType != "announcement") {
                    if (post.allowComments) {
                      TextButton(
                        onClick = {
                          activeCommentPost = post
                          commentInputText = ""
                          commentErrorMessage = null
                        },
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                      ) {
                        Icon(Icons.Default.ChatBubbleOutline, contentDescription = null, tint = FpmTextSecondary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Comment (${post.commentsCount})", fontSize = 12.sp, color = FpmTextSecondary, fontWeight = FontWeight.Medium)
                      }
                    } else {
                      Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                      ) {
                        Icon(Icons.Default.CommentsDisabled, contentDescription = null, tint = FpmTextSecondary.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Comments turned off", fontSize = 11.sp, color = FpmTextSecondary.copy(alpha = 0.6f), fontStyle = FontStyle.Italic)
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

  // Comment Dialog
  if (activeCommentPost != null) {
    val post = activeCommentPost!!
    AlertDialog(
      onDismissRequest = {
        if (!isSubmittingComment) {
          activeCommentPost = null
          commentInputText = ""
          commentErrorMessage = null
        }
      },
      title = {
        Column {
          Text("Add Comment", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = FpmTextPrimary)
          Text(
            text = "To: ${post.title ?: post.authorName}",
            fontSize = 12.sp,
            color = FpmTextSecondary,
            maxLines = 1
          )
        }
      },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          OutlinedTextField(
            value = commentInputText,
            onValueChange = {
              commentInputText = it
              if (commentErrorMessage != null) commentErrorMessage = null
            },
            placeholder = { Text("Write your comment...", fontSize = 13.sp) },
            modifier = Modifier.fillMaxWidth(),
            maxLines = 4,
            enabled = !isSubmittingComment
          )
          if (commentErrorMessage != null) {
            Text(
              text = commentErrorMessage!!,
              color = Color.Red,
              fontSize = 12.sp
            )
          }
        }
      },
      confirmButton = {
        Button(
          onClick = {
            if (commentInputText.isBlank()) return@Button
            isSubmittingComment = true
            commentErrorMessage = null
            viewModel.submitComment(post.id, commentInputText) { success, err ->
              isSubmittingComment = false
              if (success) {
                activeCommentPost = null
                commentInputText = ""
              } else {
                commentErrorMessage = err ?: "Failed to post comment"
              }
            }
          },
          enabled = !isSubmittingComment && commentInputText.isNotBlank(),
          colors = ButtonDefaults.buttonColors(containerColor = FpmRoyalBlue)
        ) {
          if (isSubmittingComment) {
            CircularProgressIndicator(
              modifier = Modifier.size(16.dp),
              color = Color.White,
              strokeWidth = 2.dp
            )
          } else {
            Text("Post Comment", fontWeight = FontWeight.Bold)
          }
        }
      },
      dismissButton = {
        TextButton(
          onClick = {
            activeCommentPost = null
            commentInputText = ""
            commentErrorMessage = null
          },
          enabled = !isSubmittingComment
        ) {
          Text("Cancel", color = FpmTextSecondary)
        }
      },
      containerColor = Color.White,
      shape = RoundedCornerShape(16.dp)
    )
  }
}
