package org.fpm.one.presentation.testimonies

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import org.fpm.one.presentation.components.EmptyStateView
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.FpmCardSkeleton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TestimoniesScreen(viewModel: TestimoniesViewModel) {
  val state by viewModel.state.collectAsState()
  var showSubmitDialog by remember { mutableStateOf(false) }
  var selectedCategory by remember { mutableStateOf("All") }

  val categories = listOf("All", "Healing", "Financial Breakthrough", "Deliverance", "Career & Academic", "Family & Marriage", "Salvation")

  val filteredTestimonies = remember(state.testimonies, selectedCategory) {
    if (selectedCategory == "All") state.testimonies
    else state.testimonies.filter { it.category.equals(selectedCategory, ignoreCase = true) }
  }

  Scaffold(
    floatingActionButton = {
      ExtendedFloatingActionButton(
        onClick = { showSubmitDialog = true },
        containerColor = FpmCrimson,
        contentColor = FpmSurfaceWhite,
        shape = RoundedCornerShape(16.dp),
        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 3.dp),
        icon = { Icon(Icons.Default.Add, contentDescription = "Share") },
        text = { Text("Share Testimony", fontWeight = FontWeight.Bold, letterSpacing = 0.3.sp) }
      )
    }
  ) { paddingValues ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(paddingValues)
        .background(FpmSlateBg)
    ) {
      // 1. Top Header & Scripture Tagline
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
                text = "Faith Testimonies",
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = FpmTextPrimary
              )
              Text(
                text = "Celebrating the miraculous deeds of God in FPM",
                fontSize = 12.sp,
                color = FpmTextSecondary
              )
            }
            IconButton(onClick = { viewModel.loadTestimonies() }) {
              Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = FpmGold)
            }
          }

          Spacer(modifier = Modifier.height(10.dp))

          // Inspiration Quote
          Surface(
            color = FpmAmberLight.copy(alpha = 0.5f),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
              Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = FpmGoldDark, modifier = Modifier.size(14.dp))
              Text(
                text = "\"They overcame him by the word of their testimony.\" — Rev 12:11",
                fontSize = 11.sp,
                fontStyle = FontStyle.Italic,
                fontWeight = FontWeight.Medium,
                color = FpmTextPrimary
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
              val isSelected = selectedCategory == cat
              Surface(
                modifier = Modifier
                  .clip(RoundedCornerShape(20.dp))
                  .clickable { selectedCategory = cat },
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
              TestimonyCard(testimony = testimony)
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
}

@Composable
fun TestimonyCard(testimony: TestimonyItem) {
  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Column {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Surface(
          color = FpmNavy.copy(alpha = 0.08f),
          shape = RoundedCornerShape(6.dp)
        ) {
          Text(
            text = testimony.category.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = FpmNavy,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
          )
        }
        Text(
          text = testimony.createdAt.take(10),
          fontSize = 11.sp,
          color = FpmTextMuted
        )
      }

      Spacer(modifier = Modifier.height(10.dp))

      Text(
        text = testimony.title,
        fontSize = 16.sp,
        fontWeight = FontWeight.Black,
        color = FpmTextPrimary
      )

      Spacer(modifier = Modifier.height(6.dp))

      Text(
        text = testimony.content,
        fontSize = 13.sp,
        color = FpmTextSecondary,
        lineHeight = 20.sp
      )

      if (!testimony.photoUrl.isNullOrBlank()) {
        Spacer(modifier = Modifier.height(12.dp))
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .height(190.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(FpmSlateBg)
        ) {
          AsyncImage(
            model = testimony.photoUrl,
            contentDescription = "Testimony Photo Proof",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))
      Divider(color = FpmBorderLight)
      Spacer(modifier = Modifier.height(10.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Box(
            modifier = Modifier
              .size(32.dp)
              .clip(CircleShape)
              .background(FpmNavy),
            contentAlignment = Alignment.Center
          ) {
            Text(
              text = testimony.authorName.firstOrNull()?.toString() ?: "M",
              color = FpmSurfaceWhite,
              fontWeight = FontWeight.Bold,
              fontSize = 13.sp
            )
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(
              text = testimony.authorName,
              fontSize = 12.sp,
              fontWeight = FontWeight.Bold,
              color = FpmTextPrimary
            )
            Text(
              text = testimony.branchName ?: "Faith Preachers Ministry",
              fontSize = 11.sp,
              color = FpmTextSecondary
            )
          }
        }

        Surface(
          color = FpmSuccess.copy(alpha = 0.12f),
          shape = RoundedCornerShape(12.dp)
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
          ) {
            Icon(Icons.Default.Verified, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(13.dp))
            Text(
              text = "Pastoral Verified",
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = FpmSuccess
            )
          }
        }
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

          // Strict 1MB ceiling enforcement (1,048,576 bytes)
          val maxBytes = 1024 * 1024
          if (bytes.size > maxBytes) {
            val sizeKb = bytes.size / 1024
            error = "Selected photo exceeds 1MB limit (${sizeKb} KB). Please select an image under 1MB."
            isUploading = false
            return@launch
          }

          val result = onUploadPhoto(bytes, photoFileName ?: "photo.jpg", mime)
          result.fold(
            onSuccess = { responseJson ->
              val extractedUrl = try {
                val parsed = ApiClient.json.parseToJsonElement(responseJson)
                parsed.jsonObject["publicUrl"]?.jsonPrimitive?.contentOrNull
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
    containerColor = FpmSurfaceWhite,
    shape = RoundedCornerShape(20.dp),
    title = {
      Column {
        Text(
          text = "Share Your Testimony",
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )
        Text(
          text = "And they overcame him by the blood of the Lamb and by the word of their testimony.",
          fontSize = 11.sp,
          color = FpmGoldDark,
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
            color = FpmErrorBg,
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
          ) {
            Text(
              text = it,
              color = FpmCrimson,
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
          singleLine = true
        )

        Text("Select Category", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmTextPrimary)
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
              color = if (isSelected) FpmNavy else FpmSlateBg,
              border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (isSelected) FpmNavy else FpmBorderLight
              )
            ) {
              Text(
                text = cat,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) FpmSurfaceWhite else FpmTextSecondary,
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
          maxLines = 5
        )

        // Photo Attachment Section (Strictly images & <= 1MB)
        Surface(
          color = FpmSlateBg,
          shape = RoundedCornerShape(10.dp),
          border = androidx.compose.foundation.BorderStroke(1.dp, FpmBorderLight),
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
                  model = uploadedPhotoUrl,
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
                  color = FpmTextPrimary
                )
                Text(
                  text = if (isUploading) "Uploading to Supabase Storage..."
                         else if (uploadedPhotoUrl != null) (photoFileName ?: "Photo attached (< 1MB)")
                         else "Attach blessing photo (Max 1MB)",
                  fontSize = 10.sp,
                  color = if (uploadedPhotoUrl != null) FpmSuccess else FpmTextSecondary
                )
              }
            }
            if (isUploading) {
              CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = FpmNavy)
            } else if (uploadedPhotoUrl != null) {
              IconButton(onClick = {
                uploadedPhotoUrl = null
                photoFileName = null
              }) {
                Icon(Icons.Default.Close, contentDescription = "Remove photo", tint = FpmCrimson, modifier = Modifier.size(18.dp))
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
          color = FpmSlateBg,
          shape = RoundedCornerShape(10.dp),
          border = androidx.compose.foundation.BorderStroke(1.dp, FpmBorderLight),
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
                color = FpmTextPrimary
              )
              Text(
                text = "Permit publishing on the mobile feed and church bulletins upon pastoral approval.",
                fontSize = 10.sp,
                color = FpmTextSecondary
              )
            }
            Switch(
              checked = allowPublish,
              onCheckedChange = { allowPublish = it },
              colors = SwitchDefaults.colors(
                checkedThumbColor = FpmSurfaceWhite,
                checkedTrackColor = FpmCrimson
              )
            )
          }
        }

        Text(
          text = "Note: All testimonies are held in pastoral moderation queue until reviewed.",
          fontSize = 10.sp,
          color = FpmTextMuted
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
        Text("Cancel", color = FpmTextSecondary)
      }
    }
  )
}
