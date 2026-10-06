package org.fpm.one.presentation.testimonies

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.fpm.one.core.network.ApiClient
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.TestimonyItem
import org.fpm.one.presentation.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TestimoniesScreen(viewModel: TestimoniesViewModel) {
  val state by viewModel.state.collectAsState()
  var showSubmitDialog by remember { mutableStateOf(false) }
  var selectedCategory by remember { mutableStateOf("All") }
  var activeLightboxImageUrl by remember { mutableStateOf<String?>(null) }
  var activeTestimonyDetail by remember { mutableStateOf<TestimonyItem?>(null) }

  val categories = listOf("All", "Healing", "Financial Breakthrough", "Deliverance", "Career & Academic", "Family & Marriage", "Salvation")

  val filteredTestimonies = remember(state.testimonies, selectedCategory) {
    if (selectedCategory == "All") state.testimonies
    else state.testimonies.filter { it.category.equals(selectedCategory, ignoreCase = true) }
  }

  Scaffold(
    floatingActionButton = {
      ExtendedFloatingActionButton(
        onClick = { showSubmitDialog = true },
        containerColor = FpmNavyDark,
        contentColor = FpmGoldLight,
        shape = RoundedCornerShape(16.dp),
        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 3.dp),
        icon = { Icon(Icons.Default.Add, contentDescription = "Share", tint = FpmGoldLight) },
        text = { Text("Share Testimony", fontWeight = FontWeight.Bold, letterSpacing = 0.3.sp, color = FpmSurfaceWhite) }
      )
    }
  ) { paddingValues ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(paddingValues)
        .background(FpmTheme.canvasBackground)
    ) {
      // 1. Top Header & Scripture Tagline
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
                text = "Faith Testimonies",
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = FpmTheme.textPrimary
              )
              Text(
                text = "Celebrating the miraculous deeds of God in FPM",
                fontSize = 12.sp,
                color = FpmTheme.textSecondary
              )
            }
            IconButton(onClick = { viewModel.loadTestimonies() }) {
              Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = FpmGold)
            }
          }

          Spacer(modifier = Modifier.height(10.dp))

          // Inspiration Quote
          Surface(
            color = if (FpmTheme.isDark) FpmAmberContainerDark else FpmGoldSubtle,
            shape = RoundedCornerShape(8.dp),
            border = androidx.compose.foundation.BorderStroke(0.5.dp, if (FpmTheme.isDark) FpmAmberBorderDark else FpmGoldMuted.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
              Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = if (FpmTheme.isDark) FpmGold else FpmGoldDark, modifier = Modifier.size(14.dp))
              Text(
                text = "\"They overcame him by the word of their testimony.\" — Rev 12:11",
                fontSize = 11.sp,
                fontStyle = FontStyle.Italic,
                fontWeight = FontWeight.Medium,
                color = if (FpmTheme.isDark) FpmGoldLight else FpmTheme.textPrimary
              )
            }
          }

          Spacer(modifier = Modifier.height(10.dp))

          // Filter categories
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            categories.forEach { cat ->
              org.fpm.one.presentation.components.FpmPillChip(
                text = cat,
                isSelected = selectedCategory == cat,
                onClick = { selectedCategory = cat }
              )
            }
          }
        }
      }

      // Success Banner
      state.submitSuccessMessage?.let { msg ->
        Surface(
          color = FpmSuccessBg,
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
          shape = RoundedCornerShape(12.dp)
        ) {
          Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = FpmSuccess)
            Spacer(modifier = Modifier.width(10.dp))
            Text(
              text = msg,
              color = FpmSuccess,
              fontSize = 13.sp,
              fontWeight = FontWeight.Bold,
              modifier = Modifier.weight(1f)
            )
            IconButton(onClick = { viewModel.clearSuccessMessage() }) {
              Icon(Icons.Default.Close, contentDescription = "Close", tint = FpmSuccess)
            }
          }
        }
      }

      // Main List with Pull-to-Refresh
      PullToRefreshBox(
        isRefreshing = state.isLoading && state.testimonies.isNotEmpty(),
        onRefresh = { viewModel.loadTestimonies() },
        modifier = Modifier.fillMaxSize()
      ) {
        if (state.isLoading && state.testimonies.isEmpty()) {
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
        } else if (filteredTestimonies.isEmpty()) {
          EmptyStateView(
            icon = Icons.Default.FavoriteBorder,
            title = "No Testimonies Found",
            subtitle = if (selectedCategory != "All") "No testimonies in '$selectedCategory' category yet." else "Be the first to share what the Lord has done!",
            actionLabel = "Share Testimony",
            onAction = { showSubmitDialog = true },
            modifier = Modifier.fillMaxSize()
          )
        } else {
          LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
          ) {
            items(filteredTestimonies) { testimony ->
              TestimonyCard(
                testimony = testimony,
                onCardClick = { activeTestimonyDetail = testimony },
                onImageClick = { activeLightboxImageUrl = it }
              )
            }
            item {
              Spacer(modifier = Modifier.height(72.dp)) // FAB clearance
            }
          }
        }
      }
    }
  }

  if (showSubmitDialog) {
    SubmitTestimonyDialog(
      onDismiss = { showSubmitDialog = false },
      onSubmit = { title, content, cat, photoUrl, consent ->
        viewModel.submitTestimony(title, content, cat, photoUrl, consent) {
          showSubmitDialog = false
        }
      },
      onUploadPhoto = { bytes, filename, mimeType ->
        viewModel.uploadTestimonyPhoto(bytes, filename, mimeType)
      }
    )
  }

  // Full-Screen Image Lightbox
  if (activeLightboxImageUrl != null) {
    FpmFullscreenLightbox(
      imageUrl = activeLightboxImageUrl!!,
      title = "Faith Preachers Ministries Int'l Testimony",
      onDismiss = { activeLightboxImageUrl = null }
    )
  }

  // Full Testimony Detail Dialog
  if (activeTestimonyDetail != null) {
    TestimonyDetailDialog(
      testimony = activeTestimonyDetail!!,
      onDismiss = { activeTestimonyDetail = null },
      onPhotoClick = { activeLightboxImageUrl = it }
    )
  }
}

@Composable
fun TestimonyCard(
  testimony: TestimonyItem,
  onCardClick: (() -> Unit)? = null,
  onImageClick: ((String) -> Unit)? = null
) {
  val hasPhoto = !testimony.photoUrl.isNullOrBlank()

  FpmCard(
    modifier = Modifier
      .fillMaxWidth()
      .clickable { onCardClick?.invoke() }
  ) {
    Column {
      // 1. Post Header: Author Avatar, Name, Branch, Date, and Category Pill
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          FpmAvatar(
            name = testimony.authorName,
            size = 36.dp
          )
          Column {
            Text(
              text = testimony.authorName,
              fontSize = 13.sp,
              fontWeight = FontWeight.Bold,
              color = FpmTheme.textPrimary
            )
            Text(
              text = "${testimony.branchName.ifBlank { "Faith Preachers Ministries Int'l" }} • ${testimony.createdAt.take(10)}",
              fontSize = 11.sp,
              color = FpmTheme.textSecondary
            )
          }
        }

        Surface(
          color = FpmGold.copy(alpha = 0.15f),
          shape = RoundedCornerShape(6.dp),
          border = BorderStroke(0.5.dp, FpmGold.copy(alpha = 0.4f))
        ) {
          Text(
            text = testimony.category.uppercase(),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark,
            letterSpacing = 0.6.sp,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
          )
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      // 2. Post Title (Text comes before image)
      Text(
        text = testimony.title,
        fontSize = 16.sp,
        fontWeight = FontWeight.Black,
        color = FpmTheme.textPrimary
      )

      Spacer(modifier = Modifier.height(4.dp))

      // 3. Post Content (Text comes before image, truncated with See more)
      ExpandableFacebookText(
        text = testimony.content,
        maxChars = 180,
        onSeeMoreClick = onCardClick
      )

      // 4. Photo Evidence (Comes AFTER the text)
      if (hasPhoto) {
        Spacer(modifier = Modifier.height(10.dp))
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable {
              if (onImageClick != null) onImageClick(testimony.photoUrl!!)
              else onCardClick?.invoke()
            }
        ) {
          FpmAsyncImage(
            model = testimony.photoUrl,
            contentDescription = testimony.title,
            fallbackCategory = "testimony",
            fallbackTitle = testimony.title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
          )
          Surface(
            modifier = Modifier
              .align(Alignment.BottomEnd)
              .padding(8.dp),
            color = FpmNavyDeep.copy(alpha = 0.75f),
            shape = RoundedCornerShape(6.dp)
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
              Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(13.dp))
              Text("View Photo", color = FpmGoldLight, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
          }
        }
      }

      // Video Evidence (if present)
      if (!testimony.videoUrl.isNullOrBlank()) {
        val context = LocalContext.current
        Spacer(modifier = Modifier.height(8.dp))
        Surface(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable {
              try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(testimony.videoUrl))
                context.startActivity(intent)
              } catch (e: Exception) {
                android.widget.Toast.makeText(context, "Could not open video", android.widget.Toast.LENGTH_SHORT).show()
              }
            },
          color = FpmNavyDark
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            Icon(Icons.Default.PlayCircle, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(20.dp))
            Column(modifier = Modifier.weight(1f)) {
              Text("Watch Testimony Video", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmGoldLight)
              Text("Tap to play recorded evidence video", fontSize = 10.sp, color = FpmTextOnDark.copy(alpha = 0.7f))
            }
            Icon(Icons.Default.OpenInNew, contentDescription = null, tint = FpmGold.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
          }
        }
      }

      // 5. Post Bottom Bar: Pastoral Verified badge & Read Full Story
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Surface(
          color = FpmSuccess.copy(alpha = 0.12f),
          shape = RoundedCornerShape(10.dp)
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
          ) {
            Icon(Icons.Default.Verified, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(12.dp))
            Text(
              text = "Pastoral Verified",
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = FpmSuccess
            )
          }
        }

        Text(
          text = "Read Full Story →",
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
          color = FpmRoyalBlue,
          modifier = Modifier.clickable { onCardClick?.invoke() }
        )
      }
    }
  }
}

@Composable
fun SubmitTestimonyDialog(
  onDismiss: () -> Unit,
  onSubmit: (String, String, String, String?, Boolean) -> Unit,
  onUploadPhoto: suspend (ByteArray, String, String) -> Result<String>
) {
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()
  var title by remember { mutableStateOf("") }
  var content by remember { mutableStateOf("") }
  var category by remember { mutableStateOf("Healing") }
  var allowPublish by remember { mutableStateOf(true) }
  var error by remember { mutableStateOf<String?>(null) }
  var isUploading by remember { mutableStateOf(false) }
  var uploadedPhotoUrl by remember { mutableStateOf<String?>(null) }
  var photoFileName by remember { mutableStateOf<String?>(null) }

  val photoPickerLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.PickVisualMedia()
  ) { uri ->
    if (uri != null) {
      photoFileName = uri.lastPathSegment ?: "testimony_photo.jpg"
      isUploading = true
      error = null
      coroutineScope.launch {
        try {
          val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
          if (!mime.startsWith("image/")) {
            error = "Only photo and image files (JPEG, PNG, WEBP) are permitted."
            isUploading = false
            return@launch
          }

          val inputStream = context.contentResolver.openInputStream(uri)
          val bytes = inputStream?.readBytes() ?: throw Exception("Unable to read image data.")
          inputStream.close()

          // Strict 10MB ceiling enforcement (10,485,760 bytes)
          val maxBytes = 10 * 1024 * 1024
          if (bytes.size > maxBytes) {
            val sizeMb = bytes.size / (1024 * 1024)
            error = "Selected photo exceeds 10MB limit (${sizeMb} MB). Please select an image under 10MB."
            isUploading = false
            return@launch
          }

          val result = onUploadPhoto(bytes, photoFileName ?: "photo.jpg", mime)
          result.fold(
            onSuccess = { responseJson ->
              val extractedUrl = try {
                val parsed = ApiClient.json.parseToJsonElement(responseJson)
                parsed.jsonObject["publicUrl"]?.jsonPrimitive?.contentOrNull
                  ?: parsed.jsonObject["media"]?.jsonObject?.get("publicUrl")?.jsonPrimitive?.contentOrNull
                  ?: parsed.jsonObject["file"]?.jsonObject?.get("publicUrl")?.jsonPrimitive?.contentOrNull
                  ?: ""
              } catch (e: Exception) {
                ""
              }
              uploadedPhotoUrl = if (extractedUrl.isNotBlank()) extractedUrl else null
              isUploading = false
            },
            onFailure = { ex ->
              error = "Failed to upload photo: ${ex.message}"
              isUploading = false
            }
          )
        } catch (e: Exception) {
          error = "Error reading photo: ${e.message}"
          isUploading = false
        }
      }
    }
  }

  val categories = listOf("Healing", "Financial Breakthrough", "Deliverance", "Career & Academic", "Family & Marriage", "Salvation", "Other")

  AlertDialog(
    onDismissRequest = onDismiss,
    containerColor = FpmTheme.dialogBackground,
    shape = RoundedCornerShape(20.dp),
    title = {
      Column {
        Text(
          text = "Share Your Testimony",
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTheme.textPrimary
        )
        Text(
          text = "And they overcame him by the blood of the Lamb and by the word of their testimony.",
          fontSize = 11.sp,
          color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark,
          lineHeight = 15.sp
        )
      }
    },
    text = {
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
      ) {
        error?.let {
          Surface(
            color = FpmTheme.errorContainer,
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
          ) {
            Text(
              text = it,
              color = FpmTheme.errorText,
              fontSize = 12.sp,
              fontWeight = FontWeight.Medium,
              modifier = Modifier.padding(10.dp)
            )
          }
        }

        OutlinedTextField(
          value = title,
          onValueChange = { title = it },
          label = { Text("Testimony Title") },
          placeholder = { Text("e.g. Healed of Chronic Migraines") },
          modifier = Modifier.fillMaxWidth(),
          shape = RoundedCornerShape(10.dp),
          colors = fpmOutlinedTextFieldColors(),
          singleLine = true
        )

        Text("Select Category", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmTheme.textPrimary)
        Row(
          modifier = Modifier.horizontalScroll(rememberScrollState()),
          horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
          categories.forEach { cat ->
            val isSelected = category == cat
            Surface(
              modifier = Modifier
                .clip(RoundedCornerShape(16.dp))
                .clickable { category = cat },
              color = if (isSelected) (if (FpmTheme.isDark) FpmNavySurface else FpmNavyDark) else FpmTheme.surfaceTonal,
              border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (isSelected) FpmGold else FpmTheme.cardBorder
              )
            ) {
              Text(
                text = cat,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) (if (FpmTheme.isDark) FpmGold else FpmSurfaceWhite) else FpmTheme.textSecondary,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
              )
            }
          }
        }

        OutlinedTextField(
          value = content,
          onValueChange = { content = it },
          label = { Text("What did God do?") },
          placeholder = { Text("Narrate the testimony with details of how God intervened...") },
          modifier = Modifier
            .fillMaxWidth()
            .height(120.dp),
          shape = RoundedCornerShape(10.dp),
          colors = fpmOutlinedTextFieldColors(),
          maxLines = 5
        )

        // Photo Attachment Section (Strictly images & <= 1MB)
        Surface(
          color = FpmTheme.surfaceTonal,
          shape = RoundedCornerShape(10.dp),
          border = androidx.compose.foundation.BorderStroke(1.dp, FpmTheme.cardBorder),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
          ) {
            Row(
              modifier = Modifier.weight(1f),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
              if (uploadedPhotoUrl != null) {
                AsyncImage(
                  model = ApiClient.resolveMediaUrl(uploadedPhotoUrl),
                  contentDescription = "Uploaded photo preview",
                  modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(6.dp)),
                  contentScale = ContentScale.Crop
                )
              }
              Column(modifier = Modifier.weight(1f)) {
                Text(
                  text = "Photo Proof / Media",
                  fontSize = 12.sp,
                  fontWeight = FontWeight.Bold,
                  color = FpmTheme.textPrimary
                )
                Text(
                  text = if (isUploading) "Uploading to Supabase Storage..."
                         else if (uploadedPhotoUrl != null) (photoFileName ?: "Photo attached (< 1MB)")
                         else "Attach blessing photo (Max 1MB)",
                  fontSize = 10.sp,
                  color = if (uploadedPhotoUrl != null) FpmSuccess else FpmTheme.textSecondary
                )
              }
            }
            if (isUploading) {
              CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = FpmGold)
            } else if (uploadedPhotoUrl != null) {
              IconButton(onClick = {
                uploadedPhotoUrl = null
                photoFileName = null
              }) {
                Icon(Icons.Default.Close, contentDescription = "Remove photo", tint = FpmError, modifier = Modifier.size(18.dp))
              }
            } else {
              OutlinedButton(
                onClick = {
                  photoPickerLauncher.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                  )
                },
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
              ) {
                Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Pick Photo", fontSize = 11.sp, fontWeight = FontWeight.Bold)
              }
            }
          }
        }

        Surface(
          color = FpmTheme.surfaceTonal,
          shape = RoundedCornerShape(10.dp),
          border = androidx.compose.foundation.BorderStroke(1.dp, FpmTheme.cardBorder),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column(modifier = Modifier.weight(1f)) {
              Text(
                text = "Consent to Publish",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTheme.textPrimary
              )
              Text(
                text = "Permit publishing on the mobile feed and church bulletins upon pastoral approval.",
                fontSize = 10.sp,
                color = FpmTheme.textSecondary
              )
            }
            Switch(
              checked = allowPublish,
              onCheckedChange = { allowPublish = it },
              colors = fpmSwitchColors()
            )
          }
        }

        Text(
          text = "Note: All testimonies are held in pastoral moderation queue until reviewed.",
          fontSize = 10.sp,
          color = FpmTheme.textMuted
        )
      }
    },
    confirmButton = {
      FpmButton(
        text = "Submit for Review",
        onClick = {
          if (title.isBlank() || content.isBlank()) {
            error = "Please fill in both title and testimony description."
          } else if (isUploading) {
            error = "Please wait for photo upload to finish."
          } else {
            onSubmit(title, content, category, uploadedPhotoUrl, allowPublish)
          }
        }
      )
    },
    dismissButton = {
      TextButton(onClick = onDismiss) {
        Text("Cancel", color = FpmTheme.textSecondary)
      }
    }
  )
}
