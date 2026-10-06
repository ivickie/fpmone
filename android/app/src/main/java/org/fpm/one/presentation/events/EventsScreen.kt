package org.fpm.one.presentation.events

import android.content.Intent
import android.provider.CalendarContract
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.EventNote
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventsScreen(viewModel: EventsViewModel) {
  val state by viewModel.state.collectAsState()
  val context = LocalContext.current
  var registeredMessage by remember { mutableStateOf<String?>(null) }
  var fullScreenImageUrl by remember { mutableStateOf<Pair<String, String>?>(null) }

  val categories = listOf("All", "Convention", "Training", "Youth", "Conference")

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmTheme.canvasBackground)
  ) {
    // 1. Top Bar
    Surface(
      color = FpmTheme.cardBackground,
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
              text = "Church Events",
              fontSize = 19.sp,
              fontWeight = FontWeight.Black,
              color = FpmTheme.textPrimary
            )
            Text(
              text = "Conventions, leadership retreats, and fellowship conferences",
              fontSize = 12.sp,
              color = FpmTheme.textSecondary
            )
          }

          IconButton(onClick = { viewModel.loadEvents(state.selectedCategory) }) {
            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = FpmGold)
          }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Category Filter Chips
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          categories.forEach { cat ->
            FpmPillChip(
              text = cat,
              isSelected = state.selectedCategory == cat,
              onClick = { viewModel.loadEvents(cat) }
            )
          }
        }
      }
    }

    // Success notification banner
    registeredMessage?.let { msg ->
      Surface(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 16.dp, vertical = 10.dp),
        color = FpmSuccessBg,
        shape = RoundedCornerShape(10.dp)
      ) {
        Row(
          modifier = Modifier.padding(12.dp),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
          ) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(18.dp))
            Text(text = msg, color = FpmSuccess, fontSize = 12.sp, fontWeight = FontWeight.Bold)
          }
          IconButton(onClick = { registeredMessage = null }, modifier = Modifier.size(20.dp)) {
            Icon(Icons.Default.Close, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(16.dp))
          }
        }
      }
    }

    PullToRefreshBox(
      isRefreshing = state.isLoading && state.events.isNotEmpty(),
      onRefresh = { viewModel.loadEvents(state.selectedCategory) },
      modifier = Modifier.fillMaxSize()
    ) {
      if (state.isLoading && state.events.isEmpty()) {
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
      } else if (state.events.isEmpty()) {
        EmptyStateView(
          title = "No Events Found",
          subtitle = "There are currently no scheduled events under '${state.selectedCategory}'. Check back soon!",
          icon = Icons.AutoMirrored.Filled.EventNote,
          modifier = Modifier.fillMaxSize()
        )
      } else {
        LazyColumn(
          modifier = Modifier.fillMaxSize(),
          contentPadding = PaddingValues(16.dp),
          verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
          items(state.events) { ev ->
            FpmCard(modifier = Modifier.fillMaxWidth()) {
              // 1. Dominant 16:9 Event Photography Banner (with intentional fallback)
              Box(
                modifier = Modifier
                  .fillMaxWidth()
                  .height(180.dp)
                  .clip(RoundedCornerShape(12.dp))
                  .then(
                    if (!ev.bannerUrl.isNullOrBlank()) {
                      Modifier.clickable { fullScreenImageUrl = Pair(ev.bannerUrl, ev.title) }
                    } else Modifier
                  )
              ) {
                FpmAsyncImage(
                  model = ev.bannerUrl,
                  contentDescription = ev.title,
                  fallbackCategory = "event",
                  fallbackTitle = ev.title,
                  modifier = Modifier.fillMaxSize(),
                  contentScale = ContentScale.Crop
                )

                // Atmospheric Scrim
                Box(
                  modifier = Modifier
                    .fillMaxSize()
                    .background(
                      Brush.verticalGradient(
                        colors = listOf(
                          FpmNavyDeep.copy(alpha = 0.3f),
                          Color.Transparent,
                          FpmNavyDeep.copy(alpha = 0.8f)
                        )
                      )
                    )
                )

                // Category overlay pill
                Surface(
                  modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(10.dp),
                  color = FpmNavyDeep.copy(alpha = 0.85f),
                  shape = RoundedCornerShape(6.dp),
                  border = androidx.compose.foundation.BorderStroke(1.dp, FpmGold.copy(alpha = 0.45f))
                ) {
                  Text(
                    text = ev.category.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGoldLight,
                    letterSpacing = 0.8.sp,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                  )
                }

                // If real photo present, tap to view badge
                if (!ev.bannerUrl.isNullOrBlank()) {
                  Surface(
                    modifier = Modifier
                      .align(Alignment.BottomEnd)
                      .padding(10.dp),
                    color = FpmNavyDeep.copy(alpha = 0.8f),
                    shape = RoundedCornerShape(6.dp)
                  ) {
                    Row(
                      modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                      verticalAlignment = Alignment.CenterVertically,
                      horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                      Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(13.dp))
                      Text("View Full", color = FpmGoldLight, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                  }
                }
              }
              Spacer(modifier = Modifier.height(12.dp))

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
                    text = "FAITH PREACHERS EVENT",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                  )
                }

                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                  Icon(Icons.Default.People, contentDescription = null, tint = FpmTheme.textSecondary, modifier = Modifier.size(14.dp))
                  Text(
                    text = "${ev.currentRegistrationsCount} Attending",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FpmTheme.textSecondary
                  )
                }
              }

              Text(
                text = ev.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = FpmTheme.textPrimary,
                modifier = Modifier.padding(top = 8.dp)
              )

              Text(
                text = ev.description,
                fontSize = 12.sp,
                color = FpmTheme.textSecondary,
                lineHeight = 18.sp,
                modifier = Modifier.padding(top = 4.dp)
              )

              Spacer(modifier = Modifier.height(12.dp))

              // Metadata rows
              Column(
                modifier = Modifier
                  .fillMaxWidth()
                  .background(FpmTheme.surfaceTonal, RoundedCornerShape(10.dp))
                  .padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
              ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Icon(Icons.Default.CalendarToday, contentDescription = null, tint = if (FpmTheme.isDark) FpmBlueAccent else FpmRoyalBlue, modifier = Modifier.size(14.dp))
                  Text(text = ev.startDatetime.take(10), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = FpmTheme.textPrimary)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Icon(Icons.Default.Place, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(14.dp))
                  Text(text = ev.location, fontSize = 12.sp, color = FpmTheme.textSecondary)
                }
                if (ev.speaker != null) {
                  Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = FpmGold, modifier = Modifier.size(14.dp))
                    Text(text = "Speaker: ${ev.speaker}", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = FpmTheme.textPrimary)
                  }
                }
              }

              Spacer(modifier = Modifier.height(14.dp))

              Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                // Add to Device Calendar Intent
                OutlinedButton(
                  onClick = {
                    val intent = Intent(Intent.ACTION_INSERT)
                      .setData(CalendarContract.Events.CONTENT_URI)
                      .putExtra(CalendarContract.Events.TITLE, ev.title)
                      .putExtra(CalendarContract.Events.EVENT_LOCATION, ev.location)
                      .putExtra(CalendarContract.Events.DESCRIPTION, ev.description)
                    context.startActivity(intent)
                  },
                  modifier = Modifier.weight(1f),
                  shape = RoundedCornerShape(10.dp)
                ) {
                  Icon(Icons.Default.Event, contentDescription = null, modifier = Modifier.size(16.dp))
                  Spacer(modifier = Modifier.width(4.dp))
                  Text("Add Calendar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // Register / RSVP Button
                if (ev.isUserRegistered) {
                  Button(
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                      disabledContainerColor = FpmSuccess.copy(alpha = 0.15f),
                      disabledContentColor = FpmSuccess
                    )
                  ) {
                    Icon(
                      imageVector = Icons.Default.Check,
                      contentDescription = null,
                      modifier = Modifier.size(15.dp),
                      tint = FpmSuccess
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                      text = "Registered ✓",
                      fontSize = 12.sp,
                      fontWeight = FontWeight.Bold,
                      color = FpmSuccess
                    )
                  }
                } else {
                  FpmButton(
                    text = "RSVP / Register",
                    onClick = {
                      viewModel.registerForEvent(ev.id) {
                        registeredMessage = "You have successfully registered for ${ev.title}!"
                      }
                    },
                    modifier = Modifier.weight(1f)
                  )
                }
              }
            }
          }
        }
      }
    }

    // Full-Screen Image Lightbox
    if (fullScreenImageUrl != null) {
      FpmFullscreenLightbox(
        imageUrl = fullScreenImageUrl!!.first,
        title = fullScreenImageUrl!!.second,
        onDismiss = { fullScreenImageUrl = null }
      )
    }
  }
}
