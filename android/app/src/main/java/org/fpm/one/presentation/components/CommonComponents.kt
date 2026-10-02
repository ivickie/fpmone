package org.fpm.one.presentation.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import org.fpm.one.data.model.*
import org.fpm.one.R
import org.fpm.one.core.theme.*

// =============================================================================
// FAITH PREACHERS MINISTRIES INT'L — EDITORIAL & SPIRITUAL COMMON COMPONENTS
// =============================================================================

/**
 * Editorial FPM Card with warm ivory/white surface, hairline border, and gentle tonal depth.
 */
@Composable
fun FpmCard(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(16.dp),
    backgroundColor: Color = FpmSurfaceWhite,
    borderColor: Color = FpmCardBorder,
    elevation: Dp = 0.5.dp,
    contentPadding: Dp = 16.dp,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (onClick != null && isPressed) 0.985f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "cardScale"
    )

    val cardModifier = if (onClick != null) {
        modifier
            .scale(scale)
            .clip(shape)
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
    } else {
        modifier
    }

    Card(
        modifier = cardModifier,
        shape = shape,
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(borderColor)),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

/**
 * Branded intentional FPM spiritual placeholder.
 * Replaces broken images or missing photography with an editorial midnight navy & gold sacred backdrop.
 */
@Composable
fun FpmBrandedPlaceholder(
    category: String = "church",
    title: String? = null,
    modifier: Modifier = Modifier
) {
    val (icon, label) = when (category.lowercase()) {
        "service", "church", "worship" -> Pair(Icons.Default.Church, "FAITH PREACHERS MINISTRIES INT'L")
        "sermon", "word", "bible" -> Pair(Icons.AutoMirrored.Filled.MenuBook, "THE SPOKEN WORD")
        "event", "gathering", "conference", "convention" -> Pair(Icons.Default.Event, "FPM GATHERING")
        "testimony", "grace", "praise" -> Pair(Icons.Default.AutoAwesome, "TESTIMONY OF GRACE")
        "community", "fellowship", "announcement" -> Pair(Icons.Default.People, "CHURCH LIFE")
        "worker", "portal", "credentials" -> Pair(Icons.Default.Badge, "MINISTRY WORKER")
        else -> Pair(Icons.Default.Church, "FAITH PREACHERS MINISTRIES INT'L")
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.linearGradient(
                    colors = listOf(FpmNavyDeep, FpmNavyDark, FpmNavySurface),
                    start = Offset(0f, 0f),
                    end = Offset(400f, 600f)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Subtle ambient radial glow
        Box(
            modifier = Modifier
                .size(130.dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            FpmGold.copy(alpha = 0.12f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(FpmNavyDeep.copy(alpha = 0.75f))
                    .border(1.dp, FpmGold.copy(alpha = 0.45f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = FpmGoldLight,
                    modifier = Modifier.size(24.dp)
                )
            }

            Text(
                text = label,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = FpmGoldLight.copy(alpha = 0.85f),
                letterSpacing = 1.2.sp,
                textAlign = TextAlign.Center
            )

            if (!title.isNullOrBlank()) {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = FpmSurfaceWhite,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/**
 * Editorial FPM AsyncImage supporting shimmer skeleton while loading,
 * and branded intentional placeholder on error/null.
 */
@Composable
fun FpmAsyncImage(
    model: Any?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    fallbackCategory: String = "church",
    fallbackTitle: String? = null,
    onClick: (() -> Unit)? = null
) {
    val clickableModifier = if (onClick != null) {
        modifier.clickable(onClick = onClick)
    } else {
        modifier
    }

    val resolvedModel = remember(model) {
        if (model is String) org.fpm.one.core.network.ApiClient.resolveMediaUrl(model) else model
    }

    if (resolvedModel == null || (resolvedModel is String && resolvedModel.isBlank())) {
        FpmBrandedPlaceholder(
            category = fallbackCategory,
            title = fallbackTitle,
            modifier = clickableModifier
        )
    } else {
        SubcomposeAsyncImage(
            model = resolvedModel,
            contentDescription = contentDescription,
            contentScale = contentScale,
            modifier = clickableModifier,
            loading = {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .shimmerEffect()
                )
            },
            error = {
                FpmBrandedPlaceholder(
                    category = fallbackCategory,
                    title = fallbackTitle,
                    modifier = Modifier.fillMaxSize()
                )
            },
            success = {
                SubcomposeAsyncImageContent()
            }
        )
    }
}

/**
 * Fullscreen modal lightbox for high-resolution church photography inspection.
 */
@Composable
fun FpmFullscreenLightbox(
    imageUrl: String,
    title: String? = null,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = true
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(FpmNavyDeep.copy(alpha = 0.96f))
        ) {
            // Close Button & Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 14.dp)
                    .align(Alignment.TopCenter),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                    if (!title.isNullOrBlank()) {
                        Text(
                            text = title,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmSurfaceWhite,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Text(
                        text = "Faith Preachers Ministries Int'l Media",
                        fontSize = 11.sp,
                        color = FpmGoldLight
                    )
                }

                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(FpmSurfaceWhite.copy(alpha = 0.15f))
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = FpmSurfaceWhite,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // Image in center
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 70.dp),
                contentAlignment = Alignment.Center
            ) {
                val resolvedUrl = remember(imageUrl) {
                    org.fpm.one.core.network.ApiClient.resolveMediaUrl(imageUrl) ?: imageUrl
                }
                SubcomposeAsyncImage(
                    model = resolvedUrl,
                    contentDescription = title ?: "Full Image",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .wrapContentHeight()
                        .clip(RoundedCornerShape(12.dp)),
                    loading = {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(280.dp)
                                .shimmerEffect()
                        )
                    },
                    error = {
                        FpmBrandedPlaceholder(
                            category = "church",
                            title = title,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(280.dp)
                        )
                    }
                )
            }
        }
    }
}

/**
 * Media preview gallery for community posts and highlights with 1 or multiple photos.
 */
@Composable
fun FpmMediaGallery(
    mediaUrls: List<String>,
    onImageClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (mediaUrls.isEmpty()) return

    if (mediaUrls.size == 1) {
        val url = mediaUrls.first()
        Box(
            modifier = modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(14.dp))
                .clickable { onImageClick(url) }
        ) {
            FpmAsyncImage(
                model = url,
                contentDescription = "Media image",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
            // Tap to expand pill
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(10.dp),
                color = FpmNavyDeep.copy(alpha = 0.75f),
                shape = RoundedCornerShape(6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Fullscreen,
                        contentDescription = null,
                        tint = FpmGoldLight,
                        modifier = Modifier.size(13.dp)
                    )
                    Text(
                        text = "View",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmGoldLight
                    )
                }
            }
        }
    } else {
        LazyRow(
            modifier = modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(mediaUrls) { url ->
                Box(
                    modifier = Modifier
                        .size(width = 220.dp, height = 150.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onImageClick(url) }
                ) {
                    FpmAsyncImage(
                        model = url,
                        contentDescription = "Gallery image",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(6.dp),
                        color = FpmNavyDeep.copy(alpha = 0.75f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Fullscreen,
                            contentDescription = null,
                            tint = FpmGoldLight,
                            modifier = Modifier
                                .padding(4.dp)
                                .size(12.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Facebook-style media grid:
 * - 1 image: full width box
 * - 2 images: 2 boxes in a row
 * - 3+ images: 2 boxes in a row, with 2nd box having a dark overlay and +X count of hidden images (+1, +2, +3)
 * - Video banner if videoUrl is present
 * - Tapping opens full post & pictures view
 */
@Composable
fun FacebookMediaGrid(
    photos: List<String>,
    videoUrl: String? = null,
    onMediaClick: (index: Int) -> Unit,
    modifier: Modifier = Modifier
) {
    if (photos.isEmpty() && videoUrl.isNullOrBlank()) return

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (photos.isNotEmpty()) {
            when {
                photos.size == 1 -> {
                    val url = photos[0]
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(210.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { onMediaClick(0) }
                    ) {
                        FpmAsyncImage(
                            model = url,
                            contentDescription = "Post photo",
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
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(13.dp))
                                Text("View", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = FpmGoldLight)
                            }
                        }
                    }
                }
                photos.size == 2 -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp))
                                .clickable { onMediaClick(0) }
                        ) {
                            FpmAsyncImage(
                                model = photos[0],
                                contentDescription = "Photo 1",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(topEnd = 12.dp, bottomEnd = 12.dp))
                                .clickable { onMediaClick(1) }
                        ) {
                            FpmAsyncImage(
                                model = photos[1],
                                contentDescription = "Photo 2",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }
                }
                else -> {
                    // 3 or more photos: 2 boxes, 2nd box has dark overlay with +X hidden count
                    val hiddenCount = photos.size - 2
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp))
                                .clickable { onMediaClick(0) }
                        ) {
                            FpmAsyncImage(
                                model = photos[0],
                                contentDescription = "Photo 1",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(topEnd = 12.dp, bottomEnd = 12.dp))
                                .clickable { onMediaClick(1) }
                        ) {
                            FpmAsyncImage(
                                model = photos[1],
                                contentDescription = "Photo 2",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            // Dark overlay with +X
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.55f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "+$hiddenCount",
                                    color = Color.White,
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // Video preview card if video exists
        if (!videoUrl.isNullOrBlank()) {
            val context = LocalContext.current
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .clickable {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(videoUrl))
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "Could not open video", Toast.LENGTH_SHORT).show()
                        }
                    },
                color = FpmNavySurface,
                border = BorderStroke(0.5.dp, FpmCardBorder.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.PlayCircle, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(20.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Sermon Video Highlight", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmGoldLight)
                        Text("Tap to play recorded video", fontSize = 10.sp, color = FpmTextOnDark.copy(alpha = 0.7f))
                    }
                    Icon(Icons.Default.OpenInNew, contentDescription = null, tint = FpmGold.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}

/**
 * Facebook-style expandable text with inline "See more" / "See less" truncation
 */
@Composable
fun ExpandableFacebookText(
    text: String,
    modifier: Modifier = Modifier,
    maxChars: Int = 180,
    fontSize: androidx.compose.ui.unit.TextUnit = 13.sp,
    color: Color = FpmTextSecondary,
    lineHeight: androidx.compose.ui.unit.TextUnit = 20.sp,
    onSeeMoreClick: (() -> Unit)? = null
) {
    if (text.length <= maxChars) {
        Text(
            text = text,
            fontSize = fontSize,
            color = color,
            lineHeight = lineHeight,
            modifier = modifier
        )
    } else {
        var isExpanded by remember { mutableStateOf(false) }
        Column(modifier = modifier) {
            if (isExpanded) {
                Text(
                    text = text,
                    fontSize = fontSize,
                    color = color,
                    lineHeight = lineHeight
                )
                Text(
                    text = "See less",
                    fontSize = fontSize,
                    fontWeight = FontWeight.Bold,
                    color = FpmRoyalBlue,
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .clickable { isExpanded = false }
                )
            } else {
                val truncated = text.take(maxChars).trimEnd()
                Text(
                    text = "$truncated...",
                    fontSize = fontSize,
                    color = color,
                    lineHeight = lineHeight,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "See more",
                    fontSize = fontSize,
                    fontWeight = FontWeight.Bold,
                    color = FpmRoyalBlue,
                    modifier = Modifier
                        .padding(top = 2.dp)
                        .clickable {
                            if (onSeeMoreClick != null) {
                                onSeeMoreClick()
                            } else {
                                isExpanded = true
                            }
                        }
                )
            }
        }
    }
}

/**
 * Full page dialog opening sermon recap details and complete picture gallery
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SermonRecapDetailDialog(
    highlight: ServiceHighlightItem,
    onDismiss: () -> Unit,
    onPhotoClick: (String) -> Unit
) {
    val context = LocalContext.current
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = "Sermon Recap",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmTextPrimary
                            )
                            Text(
                                text = highlight.highlightDate,
                                fontSize = 11.sp,
                                color = FpmTextSecondary
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = FpmTextPrimary)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = FpmSurfaceWhite)
                )
            },
            containerColor = FpmIvoryBg
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Preacher & Category Header
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
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(FpmNavyDeep),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = highlight.speaker.take(1).uppercase(),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                color = FpmGoldLight
                            )
                        }
                        Column {
                            Text(
                                text = "Preached by ${highlight.speaker}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmTextPrimary
                            )
                            Text(
                                text = "Faith Preachers Ministries Int'l",
                                fontSize = 11.sp,
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
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                // Title
                Text(
                    text = highlight.title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = FpmTextPrimary,
                    lineHeight = 28.sp
                )

                // Anchor Scripture
                if (!highlight.scripture.isNullOrBlank()) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = FpmGoldSubtle,
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, FpmGoldMuted.copy(alpha = 0.4f))
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "📖",
                                fontSize = 16.sp
                            )
                            Text(
                                text = highlight.scripture,
                                fontSize = 13.sp,
                                fontStyle = FontStyle.Italic,
                                fontWeight = FontWeight.SemiBold,
                                color = FpmTextPrimary,
                                lineHeight = 19.sp
                            )
                        }
                    }
                }

                // Sermon Summary (Full unabbreviated text)
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = FpmSurfaceWhite,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, FpmCardBorder)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "MESSAGE SUMMARY",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmGoldDark,
                            letterSpacing = 0.8.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = highlight.summary,
                            fontSize = 14.sp,
                            color = FpmTextPrimary,
                            lineHeight = 22.sp
                        )
                    }
                }

                // Key Points
                if (highlight.keyPoints.isNotEmpty()) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = FpmSurfaceWhite,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, FpmCardBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "KEY TAKEAWAYS",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmGoldDark,
                                letterSpacing = 0.8.sp
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            highlight.keyPoints.forEachIndexed { idx, point ->
                                Row(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Text(
                                        text = "${idx + 1}.",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FpmRoyalBlue
                                    )
                                    Text(
                                        text = point,
                                        fontSize = 13.sp,
                                        color = FpmTextPrimary,
                                        lineHeight = 19.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // Inspiring Quote
                if (!highlight.quote.isNullOrBlank()) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = FpmNavyDeep,
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Text(
                                text = "“${highlight.quote}”",
                                fontSize = 14.sp,
                                fontStyle = FontStyle.Italic,
                                fontWeight = FontWeight.Medium,
                                color = FpmSurfaceWhite,
                                lineHeight = 21.sp
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "— ${highlight.speaker}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmGoldLight
                            )
                        }
                    }
                }

                // Video Section
                if (!highlight.videoUrl.isNullOrBlank()) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(highlight.videoUrl))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Could not open video", Toast.LENGTH_SHORT).show()
                                }
                            },
                        color = FpmNavyDark
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.PlayCircle, contentDescription = null, tint = FpmGold, modifier = Modifier.size(28.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Recorded Sermon Video", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FpmSurfaceWhite)
                                Text("Tap to watch the complete message broadcast", fontSize = 11.sp, color = FpmTextOnDark.copy(alpha = 0.8f))
                            }
                            Icon(Icons.Default.OpenInNew, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(16.dp))
                        }
                    }
                }

                // Full Photo Gallery
                if (highlight.photos.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "PHOTOS FROM THE ALTAR (${highlight.photos.size})",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmGoldDark,
                                letterSpacing = 0.8.sp
                            )
                            Text(
                                text = "Tap photo to zoom",
                                fontSize = 10.sp,
                                color = FpmTextSecondary
                            )
                        }

                        highlight.photos.forEachIndexed { index, photoUrl ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(240.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .clickable { onPhotoClick(photoUrl) }
                            ) {
                                FpmAsyncImage(
                                    model = photoUrl,
                                    contentDescription = "Photo ${index + 1}",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                                Surface(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .padding(10.dp),
                                    color = FpmNavyDeep.copy(alpha = 0.75f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(13.dp))
                                        Text("Tap to Zoom", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = FpmGoldLight)
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

/**
 * Full page dialog opening testimony details
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TestimonyDetailDialog(
    testimony: TestimonyItem,
    onDismiss: () -> Unit,
    onPhotoClick: (String) -> Unit
) {
    val context = LocalContext.current
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = "Testimony",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmTextPrimary
                            )
                            Text(
                                text = testimony.category.uppercase(),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmGoldDark,
                                letterSpacing = 0.6.sp
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = FpmTextPrimary)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = FpmSurfaceWhite)
                )
            },
            containerColor = FpmIvoryBg
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Author Header
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
                            size = 42.dp
                        )
                        Column {
                            Text(
                                text = testimony.authorName,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmTextPrimary
                            )
                            Text(
                                text = testimony.branchName.ifBlank { "Faith Preachers Ministries Int'l" },
                                fontSize = 11.sp,
                                color = FpmTextSecondary
                            )
                        }
                    }

                    Text(
                        text = testimony.createdAt.take(10),
                        fontSize = 11.sp,
                        color = FpmTextMuted
                    )
                }

                // Title
                Text(
                    text = testimony.title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = FpmTextPrimary,
                    lineHeight = 28.sp
                )

                // Full Content
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = FpmSurfaceWhite,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, FpmCardBorder)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = testimony.content,
                            fontSize = 14.sp,
                            color = FpmTextPrimary,
                            lineHeight = 22.sp
                        )
                    }
                }

                // Photo if attached
                if (!testimony.photoUrl.isNullOrBlank()) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "TESTIMONY EVIDENCE / PHOTO",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmGoldDark,
                            letterSpacing = 0.8.sp
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(260.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .clickable { onPhotoClick(testimony.photoUrl) }
                        ) {
                            FpmAsyncImage(
                                model = testimony.photoUrl,
                                contentDescription = testimony.title,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            Surface(
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(10.dp),
                                color = FpmNavyDeep.copy(alpha = 0.75f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Fullscreen, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(13.dp))
                                    Text("Tap to Zoom", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = FpmGoldLight)
                                }
                            }
                        }
                    }
                }

                // Video if attached
                if (!testimony.videoUrl.isNullOrBlank()) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(testimony.videoUrl))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Could not open video", Toast.LENGTH_SHORT).show()
                                }
                            },
                        color = FpmNavyDark
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.PlayCircle, contentDescription = null, tint = FpmGold, modifier = Modifier.size(28.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Recorded Video Testimony", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FpmSurfaceWhite)
                                Text("Tap to view full video testimony", fontSize = 11.sp, color = FpmTextOnDark.copy(alpha = 0.8f))
                            }
                            Icon(Icons.Default.OpenInNew, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(16.dp))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

/**
 * Editorial 16:9 Hero Card with photographic background, scrim, and spiritual typography.
 */
@Composable
fun FpmEditorialHero(
    title: String,
    subtitle: String? = null,
    kicker: String? = "THIS WEEK AT FPM",
    imageUrl: String? = null,
    ctaText: String? = null,
    onCtaClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.985f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "editorialHeroScale"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(230.dp)
            .scale(scale)
            .clip(RoundedCornerShape(20.dp))
            .border(1.dp, FpmGold.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            .then(
                if (onClick != null) Modifier.clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
                else Modifier
            )
    ) {
        FpmAsyncImage(
            model = imageUrl,
            contentDescription = title,
            contentScale = ContentScale.Crop,
            fallbackCategory = "worship",
            fallbackTitle = null,
            modifier = Modifier.fillMaxSize()
        )

        // Gradient Scrim
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            FpmNavyDeep.copy(alpha = 0.5f),
                            FpmNavyDeep.copy(alpha = 0.96f)
                        ),
                        startY = 60f
                    )
                )
        )

        // Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(18.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            if (kicker != null) {
                Surface(
                    color = FpmNavyDeep.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(6.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, FpmGold.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = kicker.uppercase(),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmGoldLight,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            } else {
                Spacer(modifier = Modifier.height(1.dp))
            }

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = title,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = FpmSurfaceWhite,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 25.sp
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Normal,
                        color = FpmTextOnDark.copy(alpha = 0.85f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                if (ctaText != null && onCtaClick != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(onClick = onCtaClick),
                        color = FpmGold,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = ctaText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmNavyDark,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * High-impact photographic Hero Card with gradient scrim and editorial typography.
 */
@Composable
fun FpmHeroCard(
    title: String,
    subtitle: String? = null,
    kicker: String? = null,
    imageUrl: String? = null,
    modifier: Modifier = Modifier,
    badgeText: String? = null,
    badgeColor: Color = FpmGold,
    onClick: (() -> Unit)? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "heroScale"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(210.dp)
            .scale(scale)
            .clip(RoundedCornerShape(20.dp))
            .background(FpmNavyDeep)
            .border(1.dp, FpmGold.copy(alpha = 0.25f), RoundedCornerShape(20.dp))
            .then(
                if (onClick != null) Modifier.clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
                else Modifier
            )
    ) {
        FpmAsyncImage(
            model = imageUrl,
            contentDescription = title,
            contentScale = ContentScale.Crop,
            fallbackCategory = "service",
            fallbackTitle = null,
            modifier = Modifier.fillMaxSize()
        )

        // Editorial Scrim overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            FpmNavyDeep.copy(alpha = 0.5f),
                            FpmNavyDeep.copy(alpha = 0.95f)
                        ),
                        startY = 60f
                    )
                )
        )

        // Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(18.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (kicker != null) {
                    Surface(
                        color = FpmNavyDeep.copy(alpha = 0.8f),
                        shape = RoundedCornerShape(6.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, FpmGold.copy(alpha = 0.4f))
                    ) {
                        Text(
                            text = kicker.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmGoldLight,
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                if (badgeText != null) {
                    Surface(
                        color = badgeColor,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = badgeText,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmSurfaceWhite,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = title,
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Black,
                    color = FpmSurfaceWhite,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 24.sp
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Normal,
                        color = FpmTextOnDark.copy(alpha = 0.8f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

/**
 * Editorial Devotional / Scripture Card with gold quotation accent.
 */
@Composable
fun FpmDevotionalCard(
    verse: String,
    reference: String,
    modifier: Modifier = Modifier,
    kicker: String = "WORD FOR THE SEASON"
) {
    FpmCard(
        modifier = modifier.fillMaxWidth(),
        backgroundColor = FpmGoldSubtle,
        borderColor = FpmGoldMuted.copy(alpha = 0.4f),
        contentPadding = 18.dp
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
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = FpmGold,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = kicker.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGoldDark,
                    letterSpacing = 1.sp
                )
            }
            Surface(
                color = FpmGold.copy(alpha = 0.15f),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = reference,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGoldDark,
                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "\"$verse\"",
            style = ScriptureTextStyle,
            fontSize = 14.sp,
            fontStyle = FontStyle.Italic,
            color = FpmTextPrimary,
            lineHeight = 21.sp
        )
    }
}

/**
 * Interactive filter chip with refined spring micro-interaction.
 */
@Composable
fun FpmPillChip(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    count: Int? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "pillScale"
    )

    Surface(
        modifier = modifier
            .scale(scale)
            .clip(RoundedCornerShape(20.dp))
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) FpmNavyDark else FpmSurfaceWhite,
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (isSelected) FpmNavyDark else FpmCardBorder
        ),
        shadowElevation = if (isSelected) 2.dp else 0.dp
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = text,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) FpmGoldLight else FpmTextSecondary
            )
            if (count != null) {
                Surface(
                    color = if (isSelected) FpmGold.copy(alpha = 0.25f) else FpmSurfaceTonal,
                    shape = CircleShape
                ) {
                    Text(
                        text = "$count",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isSelected) FpmGoldLight else FpmTextMuted,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
                    )
                }
            }
        }
    }
}

/**
 * Modern FPM tactile button with smooth press micro-interaction and loading indicator.
 */
@Composable
fun FpmButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    containerColor: Color = FpmNavyDark,
    contentColor: Color = FpmSurfaceWhite,
    icon: ImageVector? = null,
    shape: RoundedCornerShape = RoundedCornerShape(12.dp),
    height: Dp = 48.dp
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "buttonScale"
    )

    Button(
        onClick = onClick,
        modifier = modifier
            .height(height)
            .scale(scale),
        enabled = enabled && !isLoading,
        shape = shape,
        interactionSource = interactionSource,
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
            disabledContainerColor = containerColor.copy(alpha = 0.45f),
            disabledContentColor = contentColor.copy(alpha = 0.7f)
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.5.dp, pressedElevation = 0.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = contentColor,
                strokeWidth = 2.2.dp
            )
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (icon != null) {
                    Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = contentColor)
                }
                Text(
                    text = text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.3.sp
                )
            }
        }
    }
}

/**
 * Circular user avatar with initial letter fallback in midnight navy / gold accent ring.
 */
@Composable
fun FpmAvatar(
    name: String,
    modifier: Modifier = Modifier,
    imageUrl: String? = null,
    size: Dp = 40.dp
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .border(1.5.dp, FpmGold.copy(alpha = 0.4f), CircleShape)
            .background(FpmNavyDark),
        contentAlignment = Alignment.Center
    ) {
        val resolvedUrl = remember(imageUrl) {
            org.fpm.one.core.network.ApiClient.resolveMediaUrl(imageUrl)
        }
        if (!resolvedUrl.isNullOrBlank()) {
            SubcomposeAsyncImage(
                model = resolvedUrl,
                contentDescription = name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                loading = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .shimmerEffect()
                    )
                },
                error = {
                    Text(
                        text = name.trim().take(1).uppercase(),
                        fontSize = (size.value * 0.4f).sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmGoldLight
                    )
                },
                success = {
                    SubcomposeAsyncImageContent()
                }
            )
        } else {
            Text(
                text = name.trim().take(1).uppercase(),
                fontSize = (size.value * 0.4f).sp,
                fontWeight = FontWeight.Bold,
                color = FpmGoldLight
            )
        }
    }
}

/**
 * Standardized FPM Top Bar with church emblem, title, subtitle, back button, and actions.
 * Sleek 56dp height with vertically centered content.
 */
@Composable
fun FpmTopBar(
    title: String,
    subtitle: String? = null,
    onNavigateBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Surface(
        color = FpmNavyDark,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .height(48.dp)
                .padding(horizontal = 14.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-6).dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    if (onNavigateBack != null) {
                        IconButton(
                            onClick = onNavigateBack,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = FpmSurfaceWhite,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    Image(
                        painter = painterResource(id = R.drawable.church_logo),
                        contentDescription = "FPM Emblem",
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .border(1.dp, FpmGold, CircleShape)
                    )
                    Column {
                        Text(
                            text = title,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmSurfaceWhite,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (subtitle != null) {
                            Text(
                                text = subtitle,
                                fontSize = 11.sp,
                                color = FpmGoldLight,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    content = actions
                )
            }
        }
    }
}

/**
 * Section Header with uppercase kicker label, title, and optional action link.
 */
@Composable
fun FpmSectionHeader(
    kicker: String? = null,
    title: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onActionClick: (() -> Unit)? = null
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom
    ) {
        Column {
            if (kicker != null) {
                Text(
                    text = kicker.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGoldDark,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
            }
            Text(
                text = title,
                fontSize = 17.sp,
                fontWeight = FontWeight.Black,
                color = FpmTextPrimary
            )
        }

        if (actionText != null && onActionClick != null) {
            TextButton(
                onClick = onActionClick,
                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
            ) {
                Text(
                    text = actionText,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmGoldDark
                )
            }
        }
    }
}

/**
 * Status Pill Badge.
 */
@Composable
fun FpmBadge(
    text: String,
    modifier: Modifier = Modifier,
    containerColor: Color = FpmGold.copy(alpha = 0.15f),
    contentColor: Color = FpmGoldDark,
    icon: ImageVector? = null
) {
    Surface(
        modifier = modifier,
        color = containerColor,
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = contentColor,
                    modifier = Modifier.size(11.dp)
                )
            }
            Text(
                text = text,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = contentColor,
                letterSpacing = 0.4.sp
            )
        }
    }
}

/**
 * Shimmer Effect Modifier for skeleton loading animations.
 */
fun Modifier.shimmerEffect(): Modifier = composed {
    var size by remember { mutableStateOf(IntSize.Zero) }
    val transition = rememberInfiniteTransition(label = "shimmer")
    val startOffsetX by transition.animateFloat(
        initialValue = -2 * size.width.toFloat().coerceAtLeast(1f),
        targetValue = 2 * size.width.toFloat().coerceAtLeast(1f),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1300, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerOffsetX"
    )

    background(
        brush = Brush.linearGradient(
            colors = listOf(
                FpmShimmerBase,
                FpmShimmerHighlight,
                FpmShimmerBase
            ),
            start = Offset(startOffsetX, 0f),
            end = Offset(startOffsetX + size.width.toFloat(), size.height.toFloat())
        )
    ).onGloballyPositioned {
        size = it.size
    }
}

/**
 * Skeleton placeholder for list items / cards.
 */
@Composable
fun FpmCardSkeleton(modifier: Modifier = Modifier) {
    FpmCard(
        modifier = modifier.fillMaxWidth(),
        backgroundColor = FpmSurfaceWhite
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .shimmerEffect()
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.65f)
                        .height(14.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .shimmerEffect()
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.4f)
                        .height(11.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .shimmerEffect()
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(12.dp)
                .clip(RoundedCornerShape(4.dp))
                .shimmerEffect()
        )
        Spacer(modifier = Modifier.height(6.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .height(12.dp)
                .clip(RoundedCornerShape(4.dp))
                .shimmerEffect()
        )
    }
}

/**
 * Classic loading spinner fallback.
 */
@Composable
fun LoadingSpinner(
    modifier: Modifier = Modifier.fillMaxSize(),
    message: String = "Loading..."
) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            CircularProgressIndicator(color = FpmNavyDark, strokeWidth = 3.dp)
            Text(text = message, color = FpmTextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }
    }
}

/**
 * Modern Empty State with themed icon and optional action button.
 */
@Composable
fun EmptyStateView(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Box(
        modifier = modifier.fillMaxWidth().padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (icon != null) {
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .clip(CircleShape)
                        .background(FpmNavyDark.copy(alpha = 0.06f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = FpmNavyDark,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTextPrimary,
                textAlign = TextAlign.Center
            )
            Text(
                text = subtitle,
                fontSize = 13.sp,
                color = FpmTextSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 18.sp
            )
            if (actionLabel != null && onAction != null) {
                Spacer(modifier = Modifier.height(4.dp))
                FpmButton(
                    text = actionLabel,
                    onClick = onAction
                )
            }
        }
    }
}

/**
 * Modern error state container.
 */
@Composable
fun FpmErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxWidth().padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(FpmErrorBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.WarningAmber, contentDescription = null, tint = FpmError, modifier = Modifier.size(28.dp))
            }
            Text(
                text = "Something went wrong",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTextPrimary
            )
            Text(
                text = message,
                fontSize = 12.sp,
                color = FpmTextSecondary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(6.dp))
            FpmButton(
                text = "Retry",
                onClick = onRetry,
                containerColor = FpmNavyDark
            )
        }
    }
}

/**
 * Offline banner indicator.
 */
@Composable
fun OfflineBanner(isOffline: Boolean) {
    if (isOffline) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(FpmAmber)
                .padding(vertical = 5.dp, horizontal = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(Icons.Default.CloudOff, contentDescription = null, tint = FpmNavyDark, modifier = Modifier.size(14.dp))
                Text(
                    text = "Offline Mode — Showing Cached Church Data",
                    color = FpmNavyDark,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

fun isServiceStarted(dayOfWeek: String, startTime: String): Boolean {
    return try {
        val now = java.util.Calendar.getInstance()
        val currentDay = now.get(java.util.Calendar.DAY_OF_WEEK)
        val targetDay = when (dayOfWeek.trim().lowercase()) {
            "sunday" -> java.util.Calendar.SUNDAY
            "monday" -> java.util.Calendar.MONDAY
            "tuesday" -> java.util.Calendar.TUESDAY
            "wednesday" -> java.util.Calendar.WEDNESDAY
            "thursday" -> java.util.Calendar.THURSDAY
            "friday" -> java.util.Calendar.FRIDAY
            "saturday" -> java.util.Calendar.SATURDAY
            else -> -1
        }
        if (targetDay == -1) return true
        if (currentDay != targetDay) return false

        val parts = startTime.split(":")
        val startHour = parts.getOrNull(0)?.toIntOrNull() ?: 0
        val startMinute = parts.getOrNull(1)?.toIntOrNull() ?: 0

        val currentHour = now.get(java.util.Calendar.HOUR_OF_DAY)
        val currentMinute = now.get(java.util.Calendar.MINUTE)

        if (currentHour > startHour) return true
        if (currentHour == startHour && currentMinute >= startMinute) return true
        false
    } catch (e: Exception) {
        true
    }
}

