package org.fpm.one.presentation.events

import android.content.Intent
import android.provider.CalendarContract
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.LoadingSpinner

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
    // Top Bar
    Surface(
      color = FpmSurfaceWhite,
      shadowElevation = 1.dp
    ) {
      Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
        Text(
          text = "Church Events",
          fontSize = 18.sp,
          fontWeight = FontWeight.Black,
          color = FpmTextPrimary
        )
        Text(
          text = "Global conventions, worker training, and fellowship meetings",
          fontSize = 12.sp,
          color = FpmTextSecondary,
          modifier = Modifier.padding(top = 2.dp, bottom = 10.dp)
        )

        // Category Filter Chips
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          categories.forEach { cat ->
            val isSelected = state.selectedCategory == cat
            FilterChip(
              selected = isSelected,
              onClick = { viewModel.loadEvents(cat) },
              label = { Text(cat, fontSize = 11.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
              colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = FpmRoyalBlue,
                selectedLabelColor = FpmSurfaceWhite
              )
            )
          }
        }
      }
    }

    if (registeredMessage != null) {
      Surface(
        modifier = Modifier
          .fillMaxWidth()
          .padding(16.dp),
        color = FpmSuccessBg,
        shape = RoundedCornerShape(10.dp)
      ) {
        Row(
          modifier = Modifier.padding(12.dp),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(text = registeredMessage!!, color = FpmSuccess, fontSize = 12.sp, fontWeight = FontWeight.Bold)
          IconButton(onClick = { registeredMessage = null }, modifier = Modifier.size(16.dp)) {
            Icon(Icons.Default.Close, contentDescription = null, tint = FpmSuccess)
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
        LoadingSpinner(message = "Loading Events...")
      } else {
        LazyColumn(
          modifier = Modifier.fillMaxSize(),
          contentPadding = PaddingValues(16.dp),
          verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
          items(state.events) { ev ->
            FpmCard(modifier = Modifier.fillMaxWidth()) {
              // 1. Event Image Thumbnail
              if (!ev.bannerUrl.isNullOrBlank()) {
                Box(
                  modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
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
                  // Tap to View Overlay Badge
                  Surface(
                    modifier = Modifier
                      .align(Alignment.BottomEnd)
                      .padding(8.dp),
                    color = Color.Black.copy(alpha = 0.65f),
                    shape = RoundedCornerShape(6.dp)
                  ) {
                    Row(
                      modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                      verticalAlignment = Alignment.CenterVertically,
                      horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                      Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmSurfaceWhite, modifier = Modifier.size(13.dp))
                      Text("View Full", color = FpmSurfaceWhite, fontSize = 10.sp, fontWeight = FontWeight.Bold)
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
                  color = FpmAmberLight,
                  shape = RoundedCornerShape(6.dp)
                ) {
                  Text(
                    text = ev.category.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                  )
                }

                Text(
                  text = "${ev.currentRegistrationsCount} Attending",
                  fontSize = 11.sp,
                  color = FpmTextSecondary
                )
              }

              Text(
                text = ev.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
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

              Spacer(modifier = Modifier.height(10.dp))

              // Metadata rows
              Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Icon(Icons.Default.CalendarToday, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(14.dp))
                  Text(text = ev.startDatetime.take(10), fontSize = 12.sp, color = FpmTextPrimary)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Icon(Icons.Default.Place, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(14.dp))
                  Text(text = ev.location, fontSize = 12.sp, color = FpmTextPrimary)
                }
                if (ev.speaker != null) {
                  Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = FpmGold, modifier = Modifier.size(14.dp))
                    Text(text = ev.speaker, fontSize = 12.sp, color = FpmTextPrimary)
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
                  Text("Add Calendar", fontSize = 11.sp)
                }

                // Register Button
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
          // Dismiss button
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
