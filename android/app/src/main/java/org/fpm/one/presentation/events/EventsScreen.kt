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
import org.fpm.one.presentation.components.EmptyStateView
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.FpmCardSkeleton

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
      .background(FpmSlateBg)
  ) {
    // 1. Top Bar
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
              text = "Church Events",
              fontSize = 19.sp,
              fontWeight = FontWeight.Black,
              color = FpmTextPrimary
            )
            Text(
              text = "Conventions, leadership retreats, and fellowship conferences",
              fontSize = 12.sp,
              color = FpmTextSecondary
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
            val isSelected = state.selectedCategory == cat
            Surface(
              modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .clickable { viewModel.loadEvents(cat) },
              color = if (isSelected) FpmNavyDark else FpmSlateBg,
              border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (isSelected) FpmNavyDark else FpmBorderLight
              )
            ) {
              Text(
                text = cat,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) FpmSurfaceWhite else FpmTextSecondary,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
              )
            }
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
          icon = Icons.Default.EventNote,
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
              // 1. Event Image Thumbnail
              if (!ev.bannerUrl.isNullOrBlank()) {
                Box(
                  modifier = Modifier
                    .fillMaxWidth()
                    .height(170.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(FpmNavy)
                    .clickable { fullScreenImageUrl = Pair(ev.bannerUrl, ev.title) }
                ) {
                  AsyncImage(
                    model = ev.bannerUrl,
                    contentDescription = ev.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                  )
                  // Dark gradient bottom overlay
                  Box(
                    modifier = Modifier
                      .fillMaxSize()
                      .background(
                        Brush.verticalGradient(
                          colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f)),
                          startY = 180f
                        )
                      )
                  )
                  // Tap to View Overlay Badge
                  Surface(
                    modifier = Modifier
                      .align(Alignment.BottomEnd)
                      .padding(10.dp),
                    color = Color.Black.copy(alpha = 0.7f),
                    shape = RoundedCornerShape(6.dp)
                  ) {
                    Row(
                      modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                      verticalAlignment = Alignment.CenterVertically,
                      horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                      Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmSurfaceWhite, modifier = Modifier.size(14.dp))
                      Text("View Full", color = FpmSurfaceWhite, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                  }
                }
                Spacer(modifier = Modifier.height(12.dp))
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
                    text = ev.category.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGoldDark,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                  )
                }

                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                  Icon(Icons.Default.People, contentDescription = null, tint = FpmTextSecondary, modifier = Modifier.size(14.dp))
                  Text(
                    text = "${ev.currentRegistrationsCount} Attending",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FpmTextSecondary
                  )
                }
              }

              Text(
                text = ev.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = FpmTextPrimary,
                modifier = Modifier.padding(top = 8.dp)
              )

              Text(
                text = ev.description,
                fontSize = 12.sp,
                color = FpmTextSecondary,
                lineHeight = 18.sp,
                modifier = Modifier.padding(top = 4.dp)
              )

              Spacer(modifier = Modifier.height(12.dp))

              // Metadata rows
              Column(
                modifier = Modifier
                  .fillMaxWidth()
                  .background(FpmSlateBg, RoundedCornerShape(10.dp))
                  .padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
              ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Icon(Icons.Default.CalendarToday, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(14.dp))
                  Text(text = ev.startDatetime.take(10), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = FpmTextPrimary)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Icon(Icons.Default.Place, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(14.dp))
                  Text(text = ev.location, fontSize = 12.sp, color = FpmTextSecondary)
                }
                if (ev.speaker != null) {
                  Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = FpmGold, modifier = Modifier.size(14.dp))
                    Text(text = "Speaker: ${ev.speaker}", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = FpmTextPrimary)
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

    // Full-Screen Image Viewer Dialog
    if (fullScreenImageUrl != null) {
      Dialog(
        onDismissRequest = { fullScreenImageUrl = null },
        properties = DialogProperties(usePlatformDefaultWidth = false)
      ) {
        Box(
          modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.95f))
        ) {
          IconButton(
            onClick = { fullScreenImageUrl = null },
            modifier = Modifier
              .align(Alignment.TopEnd)
              .padding(16.dp)
              .background(Color.White.copy(alpha = 0.25f), CircleShape)
          ) {
            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
          }

          Column(
            modifier = Modifier
              .fillMaxSize()
              .padding(horizontal = 16.dp, vertical = 64.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
          ) {
            AsyncImage(
              model = fullScreenImageUrl!!.first,
              contentDescription = fullScreenImageUrl!!.second,
              modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight()
                .clip(RoundedCornerShape(12.dp)),
              contentScale = ContentScale.Fit
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
              text = fullScreenImageUrl!!.second,
              color = Color.White,
              fontSize = 16.sp,
              fontWeight = FontWeight.Bold
            )
          }
        }
      }
    }
  }
}
