package org.fpm.one.presentation.home

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.rememberScrollableState
import androidx.compose.foundation.gestures.scrollable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.fpm.one.R
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.*
import org.fpm.one.presentation.components.*
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    currentUser: UserSession?,
    onNavigateToServices: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onOpenWorkerHub: () -> Unit,
    onNavigateToProfile: () -> Unit = {}
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val coroutineScope = rememberCoroutineScope()
    val state by viewModel.state.collectAsState()

    // Dialog & Gallery states
    var activeCommentPost by remember { mutableStateOf<PostItem?>(null) }
    var commentInputText by remember { mutableStateOf("") }
    var isSubmittingComment by remember { mutableStateOf(false) }
    var commentErrorMessage by remember { mutableStateOf<String?>(null) }
    var activeLightboxImageUrl by remember { mutableStateOf<String?>(null) }
    var activeGalleryBranch by remember { mutableStateOf<BranchItem?>(null) }
    var activeHighlightDetail by remember { mutableStateOf<ServiceHighlightItem?>(null) }

    // Sunday photo upload dialog state
    var selectedPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var photoCaption by remember { mutableStateOf("") }
    var isUploadingSundayPhoto by remember { mutableStateOf(false) }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedPhotoUri = uri
            photoCaption = ""
        }
    }

    // Time of day greeting
    val greeting = remember {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        when (hour) {
            in 5..11 -> "Good morning"
            in 12..16 -> "Good afternoon"
            else -> "Good evening"
        }
    }

    // Sunday Date calculation
    val currentSundayDateStr = remember { getMostRecentSundayDate() }
    val formattedSundayDate = remember(currentSundayDateStr) { formatSundayDateDisplay(currentSundayDateStr) }

    // Deterministic Branch Ordering: User's branch is ALWAYS first
    val sortedBranches = remember(state.branches, currentUser?.branchId) {
        val userBranchId = currentUser?.branchId
        val userBranch = state.branches.find { it.id == userBranchId }
        val otherBranches = state.branches
            .filter { it.id != userBranchId }
            .sortedBy { it.name }
        if (userBranch != null) listOf(userBranch) + otherBranches else otherBranches
    }

    // Authenticated user's branch for the hero
    val userBranch = remember(state.branches, currentUser?.branchId) {
        state.branches.find { it.id == currentUser?.branchId }
    }
    val userBranchCoverImage = remember(userBranch) {
        userBranch?.coverImageUrl ?: userBranch?.imageUrl
    }

    // Scroll-driven Collapsing Header Coordinates
    val maxHeaderHeight = 350.dp
    val statusBarTop = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val minHeaderHeight = 48.dp + statusBarTop
    val scrollRangeDp = maxHeaderHeight - minHeaderHeight
    val scrollRangePx = with(density) { scrollRangeDp.toPx() }

    val listState = rememberLazyListState()

    // Smooth scroll progress in [0f, 1f] (0 = fully expanded, 1 = fully collapsed)
    val collapseProgress by remember {
        derivedStateOf {
            if (listState.firstVisibleItemIndex > 0) {
                1f
            } else {
                val offset = listState.firstVisibleItemScrollOffset.toFloat()
                (offset / scrollRangePx).coerceIn(0f, 1f)
            }
        }
    }

    val currentHeaderHeight = lerp(maxHeaderHeight, minHeaderHeight, collapseProgress)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(FpmIvoryBg)
    ) {
        // ---------------------------------------------------------------------
        // SCROLLABLE CONTENT FEED
        // ---------------------------------------------------------------------
        PullToRefreshBox(
            isRefreshing = state.isLoading && (state.posts.isNotEmpty() || state.nextService != null),
            onRefresh = { viewModel.loadHomeData() },
            modifier = Modifier.fillMaxSize()
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                // Item 0: Spacer matching maxHeaderHeight so content scrolls from below the expanded hero
                item(key = "hero_spacer") {
                    Spacer(modifier = Modifier.height(maxHeaderHeight))
                }

                // Item 1: Offline Banner (if offline)
                if (state.isOffline) {
                    item(key = "offline_banner") {
                        OfflineBanner(isOffline = true)
                    }
                }

                // Item 2: Loading Skeletons when initial load is empty
                if (state.isLoading && state.posts.isEmpty() && state.nextService == null) {
                    item(key = "loading_skeletons") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            FpmCardSkeleton()
                            FpmCardSkeleton()
                            FpmCardSkeleton()
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION 2: HORIZONTALLY SWIPEABLE BRANCH / SUNDAY MOMENTS CARDS
                // -------------------------------------------------------------
                item(key = "branch_moments_section") {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 16.dp, bottom = 8.dp)
                    ) {
                        PaddingValues(horizontal = 16.dp).let {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(it),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Surface(
                                        color = FpmGold.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp),
                                        border = BorderStroke(0.5.dp, FpmGold.copy(alpha = 0.4f))
                                    ) {
                                        Text(
                                            text = "✦  SUNDAY MOMENTS",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = FpmGoldDark,
                                            letterSpacing = 0.8.sp,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Across FPM Global",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Black,
                                        color = FpmTextPrimary
                                    )
                                }

                                if (sortedBranches.isNotEmpty()) {
                                    Text(
                                        text = "${sortedBranches.size} Branches",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FpmRoyalBlue
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Horizontally swipeable branch cards
                        if (sortedBranches.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp)
                                    .height(120.dp)
                                    .background(FpmSurfaceWhite, RoundedCornerShape(16.dp))
                                    .border(1.dp, FpmCardBorder, RoundedCornerShape(16.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Loading church branches...",
                                    fontSize = 12.sp,
                                    color = FpmTextSecondary
                                )
                            }
                        } else {
                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(sortedBranches, key = { it.id }) { branch ->
                                    val isUserBranch = branch.id == currentUser?.branchId
                                    val branchMoments = remember(state.sundayMoments, branch.id) {
                                        state.sundayMoments.filter { it.branchId == branch.id }
                                    }

                                    BranchSundayMomentCard(
                                        branch = branch,
                                        isUserBranch = isUserBranch,
                                        momentsCount = branchMoments.size,
                                        onClick = { activeGalleryBranch = branch }
                                    )
                                }
                            }
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION 3: UPCOMING SERVICE
                // -------------------------------------------------------------
                if (state.nextService != null) {
                    item(key = "upcoming_service_spotlight") {
                        val svc = state.nextService!!
                        Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(22.dp))
                                    .clickable(onClick = onNavigateToServices),
                                shape = RoundedCornerShape(22.dp),
                                colors = CardDefaults.cardColors(containerColor = FpmNavyDark),
                                border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.35f)),
                                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(
                                            Brush.linearGradient(
                                                colors = listOf(FpmNavyDeep, FpmNavyDark, FpmNavySurface)
                                            )
                                        )
                                        .padding(18.dp)
                                ) {
                                    Column {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Surface(
                                                color = FpmGold.copy(alpha = 0.18f),
                                                shape = RoundedCornerShape(6.dp),
                                                border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.45f))
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                                                ) {
                                                    Icon(
                                                        Icons.Default.Schedule,
                                                        contentDescription = null,
                                                        tint = FpmGoldLight,
                                                        modifier = Modifier.size(12.dp)
                                                    )
                                                    Text(
                                                        text = "UPCOMING SERVICE",
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = FpmGoldLight,
                                                        letterSpacing = 0.8.sp
                                                    )
                                                }
                                            }

                                            Surface(
                                                color = FpmNavySurface,
                                                shape = RoundedCornerShape(12.dp),
                                                border = BorderStroke(0.5.dp, FpmCardBorder.copy(alpha = 0.3f))
                                            ) {
                                                Text(
                                                    text = "${svc.dayOfWeek}s",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = FpmGoldLight,
                                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        Text(
                                            text = svc.name,
                                            fontSize = 20.sp,
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
                                                Icon(
                                                    Icons.Default.AccessTime,
                                                    contentDescription = null,
                                                    tint = FpmGold,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Text(
                                                    text = svc.startTime.take(5),
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = FpmGoldLight
                                                )
                                            }

                                            Text(
                                                text = "•",
                                                color = FpmTextOnDark.copy(alpha = 0.4f),
                                                fontSize = 12.sp
                                            )

                                            Text(
                                                text = "Worker Grace: ${svc.gracePeriodMinutes} mins",
                                                fontSize = 12.sp,
                                                color = FpmTextOnDark.copy(alpha = 0.8f)
                                            )
                                        }

                                        if (!svc.liveStreamUrl.isNullOrBlank()) {
                                            val isStarted = remember(svc.dayOfWeek, svc.startTime) {
                                                isServiceStarted(svc.dayOfWeek, svc.startTime)
                                            }
                                            Spacer(modifier = Modifier.height(14.dp))
                                            Surface(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(10.dp))
                                                    .clickable {
                                                        if (!isStarted) {
                                                            Toast.makeText(
                                                                context,
                                                                "This service is yet to start. Streaming will begin on ${svc.dayOfWeek} at ${svc.startTime.take(5)}.",
                                                                Toast.LENGTH_SHORT
                                                            ).show()
                                                        } else {
                                                            try {
                                                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(svc.liveStreamUrl))
                                                                context.startActivity(intent)
                                                            } catch (e: Exception) {
                                                                Toast.makeText(context, "Could not open streaming link", Toast.LENGTH_SHORT).show()
                                                            }
                                                        }
                                                    },
                                                color = if (isStarted) FpmLiveRed else FpmNavySurface,
                                                shadowElevation = 2.dp
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = if (isStarted) Icons.Default.PlayArrow else Icons.Default.AccessTime,
                                                        contentDescription = null,
                                                        tint = if (isStarted) Color.White else FpmGoldLight,
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                    Text(
                                                        text = if (isStarted) "Watch Live Online" else "Live Stream Starts ${svc.dayOfWeek} ${svc.startTime.take(5)}",
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = if (isStarted) Color.White else FpmGoldLight,
                                                        letterSpacing = 0.3.sp
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

                // -------------------------------------------------------------
                // SECTION 4: WORD FOR THE SEASON (DEVOTIONAL)
                // -------------------------------------------------------------
                item(key = "word_for_the_season") {
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                        FpmDevotionalCard(
                            verse = "Be not afraid of their faces: for I am with thee to deliver thee, saith the LORD.",
                            reference = "Jeremiah 1:8",
                            kicker = "WORD FOR THE SEASON"
                        )
                    }
                }

                // -------------------------------------------------------------
                // SECTION 5: SERMON RECAP / HIGHLIGHTS (FACEBOOK POST STYLE)
                // -------------------------------------------------------------
                val topHighlight = state.highlights.firstOrNull()
                if (topHighlight != null) {
                    item(key = "sermon_recap") {
                        Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                            FpmCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { activeHighlightDetail = topHighlight },
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
                                                text = topHighlight.speaker.take(1),
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = FpmGoldLight
                                            )
                                        }
                                        Column {
                                            Text(
                                                text = "Preached by ${topHighlight.speaker}",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = FpmTextPrimary
                                            )
                                            Text(
                                                text = topHighlight.highlightDate,
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

                                // 2. Post Title (Text comes before image)
                                Text(
                                    text = topHighlight.title,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = FpmTextPrimary,
                                    modifier = Modifier.padding(top = 10.dp)
                                )

                                // 3. Scripture (if present)
                                if (!topHighlight.scripture.isNullOrBlank()) {
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
                                                text = topHighlight.scripture!!,
                                                fontSize = 12.sp,
                                                fontStyle = FontStyle.Italic,
                                                color = FpmTextPrimary
                                            )
                                        }
                                    }
                                }

                                // 4. Expandable Message Summary (Truncated with "See more" button)
                                ExpandableFacebookText(
                                    text = topHighlight.summary,
                                    maxChars = 160,
                                    modifier = Modifier.padding(top = 4.dp),
                                    onSeeMoreClick = { activeHighlightDetail = topHighlight }
                                )

                                // 5. Facebook Media Grid (Comes AFTER the text; 2 boxes with +X overlay for multi-images)
                                if (topHighlight.photos.isNotEmpty() || !topHighlight.videoUrl.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    FacebookMediaGrid(
                                        photos = topHighlight.photos,
                                        videoUrl = topHighlight.videoUrl,
                                        onMediaClick = { activeHighlightDetail = topHighlight }
                                    )
                                }

                                // 6. Post Footer Action
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (!topHighlight.quote.isNullOrBlank()) {
                                        Text(
                                            text = "“${topHighlight.quote}”",
                                            fontSize = 11.sp,
                                            fontStyle = FontStyle.Italic,
                                            color = FpmTextSecondary,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f, fill = false)
                                        )
                                    } else {
                                        Spacer(modifier = Modifier.width(1.dp))
                                    }

                                    Text(
                                        text = "Full Recap & Notes →",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FpmRoyalBlue,
                                        modifier = Modifier.clickable { activeHighlightDetail = topHighlight }
                                    )
                                }
                            }
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION 6: CHURCH FEED / COMMUNITY
                // -------------------------------------------------------------
                item(key = "feed_section_header") {
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                        FpmSectionHeader(
                            kicker = "CHURCH LIFE",
                            title = "Announcements & Community",
                            actionText = "Refresh",
                            onActionClick = { viewModel.loadHomeData() }
                        )
                    }
                }

                items(state.posts, key = { it.id }) { post ->
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                        FpmCard(
                            modifier = Modifier.fillMaxWidth(),
                            backgroundColor = FpmSurfaceWhite,
                            borderColor = FpmCardBorder
                        ) {
                            // Header: Author Avatar & Name
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
                                        name = post.authorName,
                                        size = 38.dp
                                    )
                                    Column {
                                        Text(
                                            text = post.authorName,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = FpmTextPrimary
                                        )
                                        Text(
                                            text = post.createdAt.take(10),
                                            fontSize = 11.sp,
                                            color = FpmTextMuted
                                        )
                                    }
                                }

                                if (post.isPinned) {
                                    Surface(
                                        color = FpmGold.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                Icons.Default.PushPin,
                                                contentDescription = null,
                                                tint = FpmGoldDark,
                                                modifier = Modifier.size(10.dp)
                                            )
                                            Text(
                                                text = " Pinned",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = FpmGoldDark
                                            )
                                        }
                                    }
                                }
                            }

                            // Post Title
                            if (!post.title.isNullOrBlank()) {
                                Text(
                                    text = post.title,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmTextPrimary,
                                    modifier = Modifier.padding(top = 10.dp)
                                )
                            }

                            // Scripture Reference Tag
                            if (!post.scriptureReference.isNullOrBlank()) {
                                Surface(
                                    color = FpmGoldSubtle,
                                    shape = RoundedCornerShape(6.dp),
                                    border = BorderStroke(0.5.dp, FpmGoldMuted.copy(alpha = 0.3f)),
                                    modifier = Modifier.padding(top = 6.dp)
                                ) {
                                    Text(
                                        text = "📖 ${post.scriptureReference}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = FpmGoldDark,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            // Content
                            Text(
                                text = post.content,
                                fontSize = 13.sp,
                                color = FpmTextPrimary,
                                lineHeight = 20.sp,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )

                            // Media gallery preview if available
                            if (post.mediaUrls.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                FpmMediaGallery(
                                    mediaUrls = post.mediaUrls,
                                    onImageClick = { activeLightboxImageUrl = it }
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                            }

                            HorizontalDivider(
                                color = FpmBorderLight,
                                modifier = Modifier.padding(top = 4.dp, bottom = 6.dp)
                            )

                            // Interactions: Amen & Comments
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    val isLiked = post.userReaction == "amen" || post.userReaction == "like"
                                    TextButton(
                                        onClick = { viewModel.reactToPost(post.id, "amen") },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Icon(
                                            imageVector = if (isLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                                            contentDescription = if (isLiked) "Unlike" else "Amen",
                                            tint = if (isLiked) Color(0xFFE53935) else FpmTextSecondary,
                                            modifier = Modifier.size(17.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Amen (${post.likesCount})",
                                            fontSize = 12.sp,
                                            color = if (isLiked) Color(0xFFE53935) else FpmTextSecondary,
                                            fontWeight = if (isLiked) FontWeight.Bold else FontWeight.Medium
                                        )
                                    }

                                    if (post.postType != "announcement") {
                                        if (post.allowComments) {
                                            TextButton(
                                                onClick = {
                                                    activeCommentPost = post
                                                    commentInputText = ""
                                                    commentErrorMessage = null
                                                },
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                                            ) {
                                                Icon(
                                                    Icons.Outlined.ChatBubbleOutline,
                                                    contentDescription = "Comment",
                                                    tint = FpmTextSecondary,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text(
                                                    text = "Comment (${post.commentsCount})",
                                                    fontSize = 12.sp,
                                                    color = FpmTextSecondary,
                                                    fontWeight = FontWeight.Medium
                                                )
                                            }
                                        } else {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                                            ) {
                                                Icon(
                                                    Icons.Default.CommentsDisabled,
                                                    contentDescription = null,
                                                    tint = FpmTextMuted,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text(
                                                    text = "Comments turned off",
                                                    fontSize = 11.sp,
                                                    color = FpmTextMuted,
                                                    fontStyle = FontStyle.Italic
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

        // ---------------------------------------------------------------------
        // SECTION 1: LARGE COLLAPSIBLE BRANCH HERO (AT TOP)
        // ---------------------------------------------------------------------
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(currentHeaderHeight)
                .align(Alignment.TopCenter)
                .background(FpmNavyDeep)
                .clipToBounds()
                // Touch listener so dragging directly on hero scrolls the LazyColumn smoothly
                .scrollable(
                    orientation = Orientation.Vertical,
                    state = rememberScrollableState { delta ->
                        -listState.dispatchRawDelta(-delta)
                    }
                )
        ) {
            // As user scrolls up, photographic and spiritual artwork fades out smoothly
            // and is completely gone by collapseProgress >= 0.7f (completely gone when collapsed to header bar)
            val imageAlpha = (1f - collapseProgress * 1.5f).coerceIn(0f, 1f)

            // 1. Photographic Cover Image or Designed Navy Fallback
            if (!userBranchCoverImage.isNullOrBlank()) {
                if (imageAlpha > 0f) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .alpha(imageAlpha)
                    ) {
                        // The cover image filling the exact container bounds
                        FpmAsyncImage(
                            model = userBranchCoverImage,
                            contentDescription = "${userBranch?.name} Sanctuary",
                            fallbackCategory = "event",
                            fallbackTitle = userBranch?.name ?: "Cathedral of Grace",
                            modifier = Modifier.fillMaxSize()
                        )

                        // Base dark tint covering 100% of the picture area
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(FpmNavyDeep.copy(alpha = 0.35f))
                        )

                        // Full-bleed vertical gradient overlay covering 100% of the picture area:
                        // - Top: protects status bar and top navigation icons
                        // - Center: lets the sanctuary architecture show through
                        // - Bottom: seamlessly merges into solid FpmNavyDeep behind the greeting text
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colorStops = arrayOf(
                                            0.0f to FpmNavyDeep.copy(alpha = 0.88f),
                                            0.22f to FpmNavyDeep.copy(alpha = 0.40f),
                                            0.55f to FpmNavyDeep.copy(alpha = 0.65f),
                                            0.82f to FpmNavyDeep.copy(alpha = 0.92f),
                                            1.0f to FpmNavyDeep
                                        )
                                    )
                                )
                        )
                    }
                }
            } else {
                if (imageAlpha > 0f) {
                    // FPM Global Designed Default Fallback (Spiritual, Calm, Architectural)
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .alpha(imageAlpha)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(FpmNavyDeep, FpmNavyDark, FpmNavySurface)
                                )
                            )
                    ) {
                        // Subtle FPM emblem watermark
                        Image(
                            painter = painterResource(id = R.drawable.church_logo),
                            contentDescription = null,
                            alpha = 0.08f,
                            modifier = Modifier
                                .size(240.dp)
                                .align(Alignment.CenterEnd)
                                .offset(x = 60.dp, y = (-20).dp)
                        )

                        // Delicate geometric spiritual light elements
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            drawCircle(
                                brush = Brush.radialGradient(
                                    colors = listOf(FpmGoldLight.copy(alpha = 0.12f), Color.Transparent),
                                    radius = size.width * 0.7f
                                ),
                                center = androidx.compose.ui.geometry.Offset(size.width * 0.8f, size.height * 0.3f)
                            )
                        }
                    }
                }
            }

            // Subtle bottom border on the header bar when collapsed
            val borderAlpha = ((collapseProgress - 0.7f) / 0.3f).coerceIn(0f, 1f)
            if (borderAlpha > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .align(Alignment.BottomCenter)
                        .background(FpmCardBorder.copy(alpha = 0.25f * borderAlpha))
                )
            }

            // 3. Expanded Hero Copy (Greeting, Branch Name, Welcome Tagline)
            val expandedTextAlpha = (1f - collapseProgress * 2.2f).coerceIn(0f, 1f)
            if (expandedTextAlpha > 0f) {
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(horizontal = 20.dp, vertical = 22.dp)
                        .alpha(expandedTextAlpha)
                        .offset(y = (-collapseProgress * 30).dp)
                ) {
                    // Gold Kicker Pill
                    Surface(
                        color = FpmGold.copy(alpha = 0.22f),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.65f)),
                        modifier = Modifier.padding(bottom = 10.dp)
                    ) {
                        Text(
                            text = "✦  ${currentUser?.branchName?.uppercase() ?: "CATHEDRAL OF GRACE HQ"}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmGoldLight,
                            letterSpacing = 0.8.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }

                    // Main Greeting
                    Text(
                        text = "$greeting,\n${currentUser?.firstName ?: "Beloved"}",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = FpmSurfaceWhite,
                        lineHeight = 34.sp,
                        letterSpacing = (-0.5).sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Inspiring church tagline
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Place,
                            contentDescription = null,
                            tint = FpmGoldLight,
                            modifier = Modifier.size(13.dp)
                        )
                        Text(
                            text = "${userBranch?.city ?: "Lagos"} • Welcome to your church community",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = FpmGoldLight
                        )
                    }
                }
            }

            // 4. Fixed Top Bar (pinned over status bar, transforms from airy to compact)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .height(48.dp)
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .offset(y = (-6).dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left Brand: Transitions between airy brand and compact branch identity
                    Row(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.church_logo),
                            contentDescription = "FPM Emblem",
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .border(1.2.dp, FpmGold, CircleShape)
                        )

                        // When expanded: Shows subtle ministry name
                        // When collapsed: Shows "FPM Global • [Branch Name]"
                        if (collapseProgress < 0.55f) {
                            Column {
                                Text(
                                    text = "FAITH PREACHERS MINISTRIES INT'L",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldLight,
                                    letterSpacing = 0.8.sp
                                )
                                Text(
                                    text = "FPM GLOBAL",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Black,
                                    color = FpmSurfaceWhite
                                )
                            }
                        } else {
                            val compactAlpha = ((collapseProgress - 0.55f) * 2.2f).coerceIn(0f, 1f)
                            Column(modifier = Modifier.alpha(compactAlpha)) {
                                Text(
                                    text = "FPM GLOBAL",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldLight,
                                    letterSpacing = 0.8.sp
                                )
                                Text(
                                    text = currentUser?.branchName ?: userBranch?.name ?: "Cathedral of Grace",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = FpmSurfaceWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    // Right Actions: Clock In (Worker Hub), Notifications
                    // Sleek 28dp CircleShape containers with guaranteed spacing and zero overlap
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (currentUser?.isWorker == true) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(FpmNavyDeep.copy(alpha = 0.65f))
                                    .border(0.8.dp, FpmGold.copy(alpha = 0.45f), CircleShape)
                                    .clickable(onClick = onOpenWorkerHub),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AccessTime,
                                    contentDescription = "Clock In / Worker Attendance",
                                    tint = FpmGold,
                                    modifier = Modifier.size(17.dp)
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(FpmNavyDeep.copy(alpha = 0.65f))
                                .border(0.6.dp, FpmCardBorder.copy(alpha = 0.35f), CircleShape)
                                .clickable(onClick = onNavigateToNotifications),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "Notifications",
                                tint = FpmSurfaceWhite,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // SUNDAY MOMENTS BRANCH GALLERY MODAL
    // -------------------------------------------------------------------------
    if (activeGalleryBranch != null) {
        val branch = activeGalleryBranch!!
        val branchMoments = remember(state.sundayMoments, branch.id) {
            state.sundayMoments.filter { it.branchId == branch.id }
        }
        val isBranchMemberOrAdmin = currentUser?.branchId == branch.id || currentUser?.isAdmin == true

        SundayMomentsGalleryDialog(
            branch = branch,
            moments = branchMoments,
            formattedSundayDate = formattedSundayDate,
            canUpload = isBranchMemberOrAdmin,
            onDismiss = { activeGalleryBranch = null },
            onImageClick = { activeLightboxImageUrl = it },
            onStartUpload = {
                photoPickerLauncher.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                )
            },
            onDeleteMoment = { momentId ->
                viewModel.deleteSundayMoment(momentId) { success, err ->
                    if (success) {
                        Toast.makeText(context, "Moment removed", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, err ?: "Could not remove moment", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            currentUserId = currentUser?.userId,
            isAdmin = currentUser?.isAdmin == true
        )
    }

    // -------------------------------------------------------------------------
    // PHOTO UPLOAD CONFIRMATION DIALOG (When photo picked from gallery)
    // -------------------------------------------------------------------------
    if (selectedPhotoUri != null && activeGalleryBranch != null) {
        val branch = activeGalleryBranch!!
        AlertDialog(
            onDismissRequest = {
                if (!isUploadingSundayPhoto) {
                    selectedPhotoUri = null
                    photoCaption = ""
                }
            },
            title = {
                Column {
                    Text(
                        text = "Share Sunday Moment",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmTextPrimary
                    )
                    Text(
                        text = branch.name,
                        fontSize = 12.sp,
                        color = FpmGoldDark,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Thumbnail Preview
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(FpmSurfaceTonal)
                    ) {
                        AsyncImage(
                            model = selectedPhotoUri,
                            contentDescription = "Selected photo",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    OutlinedTextField(
                        value = photoCaption,
                        onValueChange = { photoCaption = it },
                        label = { Text("Caption (optional)", fontSize = 12.sp) },
                        placeholder = { Text("e.g. Wonderful time in worship today!", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        enabled = !isUploadingSundayPhoto,
                        shape = RoundedCornerShape(10.dp)
                    )

                    Text(
                        text = "Your photo will be shared with the ${branch.name} Sunday gallery.",
                        fontSize = 11.sp,
                        color = FpmTextSecondary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val uri = selectedPhotoUri ?: return@Button
                        isUploadingSundayPhoto = true
                        coroutineScope.launch {
                            val bytes = readBytesFromUri(context, uri)
                            val mimeType = getMimeTypeFromUri(context, uri)
                            val filename = "moment_${System.currentTimeMillis()}.jpg"

                            if (bytes != null && bytes.isNotEmpty()) {
                                viewModel.uploadSundayMoment(
                                    branchId = branch.id,
                                    bytes = bytes,
                                    filename = filename,
                                    mimeType = mimeType,
                                    caption = photoCaption.ifBlank { null },
                                    sundayDate = currentSundayDateStr
                                ) { success, err ->
                                    isUploadingSundayPhoto = false
                                    if (success) {
                                        selectedPhotoUri = null
                                        photoCaption = ""
                                        Toast.makeText(context, "Sunday moment shared successfully!", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, err ?: "Upload failed", Toast.LENGTH_LONG).show()
                                    }
                                }
                            } else {
                                isUploadingSundayPhoto = false
                                Toast.makeText(context, "Could not read selected photo file", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    enabled = !isUploadingSundayPhoto,
                    colors = ButtonDefaults.buttonColors(containerColor = FpmRoyalBlue),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    if (isUploadingSundayPhoto) {
                        CircularProgressIndicator(
                            color = FpmSurfaceWhite,
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Uploading...", fontSize = 12.sp)
                    } else {
                        Text("Share Photo", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        selectedPhotoUri = null
                        photoCaption = ""
                    },
                    enabled = !isUploadingSundayPhoto
                ) {
                    Text("Cancel", color = FpmTextSecondary)
                }
            },
            shape = RoundedCornerShape(18.dp),
            containerColor = FpmSurfaceWhite
        )
    }

    // -------------------------------------------------------------------------
    // COMMENT DIALOG
    // -------------------------------------------------------------------------
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
                    Text(
                        text = "Add Comment",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmTextPrimary
                    )
                    Text(
                        text = "To: ${post.title ?: post.authorName}",
                        fontSize = 12.sp,
                        color = FpmTextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
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
                        enabled = !isSubmittingComment,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = FpmNavyDark,
                            unfocusedBorderColor = FpmCardBorder
                        )
                    )
                    if (commentErrorMessage != null) {
                        Text(
                            text = commentErrorMessage!!,
                            color = FpmError,
                            fontSize = 12.sp
                        )
                    }
                }
            },
            confirmButton = {
                FpmButton(
                    text = "Post Comment",
                    onClick = {
                        if (commentInputText.isBlank()) return@FpmButton
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
                    isLoading = isSubmittingComment,
                    containerColor = FpmNavyDark,
                    height = 42.dp
                )
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
            containerColor = FpmSurfaceWhite,
            shape = RoundedCornerShape(16.dp)
        )
    }

    // -------------------------------------------------------------------------
    // FULLSCREEN IMAGE LIGHTBOX
    // -------------------------------------------------------------------------
    if (activeLightboxImageUrl != null) {
        FpmFullscreenLightbox(
            imageUrl = activeLightboxImageUrl!!,
            title = "Faith Preachers Ministries Int'l",
            onDismiss = { activeLightboxImageUrl = null }
        )
    }

    // -------------------------------------------------------------------------
    // SERMON RECAP FULL DETAIL DIALOG
    // -------------------------------------------------------------------------
    if (activeHighlightDetail != null) {
        SermonRecapDetailDialog(
            highlight = activeHighlightDetail!!,
            onDismiss = { activeHighlightDetail = null },
            onPhotoClick = { activeLightboxImageUrl = it }
        )
    }
}

// -----------------------------------------------------------------------------
// COMPOSABLE: Branch Sunday Moment Card (Horizontal Carousel Item)
// -----------------------------------------------------------------------------
@Composable
private fun BranchSundayMomentCard(
    branch: BranchItem,
    isUserBranch: Boolean,
    momentsCount: Int,
    onClick: () -> Unit
) {
    val coverImage = branch.coverImageUrl ?: branch.imageUrl

    Card(
        modifier = Modifier
            .width(220.dp)
            .height(280.dp)
            .clip(RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(
            width = if (isUserBranch) 1.5.dp else 1.dp,
            color = if (isUserBranch) FpmGold else FpmCardBorder
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        colors = CardDefaults.cardColors(containerColor = FpmNavyDark)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Background Image or Designed Navy Fallback
            if (!coverImage.isNullOrBlank()) {
                FpmAsyncImage(
                    model = coverImage,
                    contentDescription = branch.name,
                    fallbackCategory = "event",
                    fallbackTitle = branch.name,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(FpmNavyDeep, FpmNavyDark)
                            )
                        )
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.church_logo),
                        contentDescription = null,
                        alpha = 0.10f,
                        modifier = Modifier
                            .size(160.dp)
                            .align(Alignment.Center)
                    )
                }
            }

            // Bottom Gradient Scrim
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                FpmNavyDeep.copy(alpha = 0.55f),
                                FpmNavyDeep.copy(alpha = 0.95f)
                            ),
                            startY = 100f
                        )
                    )
            )

            // Top Badges
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isUserBranch) {
                    Surface(
                        color = FpmGold,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "★ YOUR BRANCH",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = FpmNavyDark,
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                Surface(
                    color = FpmNavyDeep.copy(alpha = 0.75f),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(0.5.dp, FpmGoldMuted.copy(alpha = 0.35f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Icon(
                            Icons.Default.PhotoCamera,
                            contentDescription = null,
                            tint = FpmGoldLight,
                            modifier = Modifier.size(11.dp)
                        )
                        Text(
                            text = if (momentsCount > 0) "$momentsCount Moments" else "Moments",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmGoldLight
                        )
                    }
                }
            }

            // Bottom Information
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(14.dp)
            ) {
                Text(
                    text = branch.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = FpmSurfaceWhite,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "${branch.city}, ${branch.country}",
                    fontSize = 11.sp,
                    color = FpmGoldLight,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "View Gallery",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmSurfaceWhite
                    )
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = FpmGold,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// COMPOSABLE: Sunday Moments Gallery Modal / Dialog
// -----------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SundayMomentsGalleryDialog(
    branch: BranchItem,
    moments: List<SundayMomentItem>,
    formattedSundayDate: String,
    canUpload: Boolean,
    onDismiss: () -> Unit,
    onImageClick: (String) -> Unit,
    onStartUpload: () -> Unit,
    onDeleteMoment: (String) -> Unit,
    currentUserId: String?,
    isAdmin: Boolean
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(
            usePlatformDefaultWidth = false
        )
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = branch.name,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmTextPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "Sunday Moments • $formattedSundayDate",
                                fontSize = 11.sp,
                                color = FpmGoldDark,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Close",
                                tint = FpmTextPrimary
                            )
                        }
                    },
                    actions = {
                        if (canUpload) {
                            Button(
                                onClick = onStartUpload,
                                colors = ButtonDefaults.buttonColors(containerColor = FpmRoyalBlue),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(
                                    Icons.Default.AddPhotoAlternate,
                                    contentDescription = null,
                                    tint = FpmGoldLight,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Share",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmSurfaceWhite
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = FpmSurfaceWhite)
                )
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(FpmIvoryBg)
                    .padding(padding)
            ) {
                if (moments.isEmpty()) {
                    // Empty State
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(FpmGoldSubtle, CircleShape)
                                .border(1.dp, FpmGoldMuted, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = null,
                                tint = FpmGoldDark,
                                modifier = Modifier.size(34.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(18.dp))

                        Text(
                            text = "No Sunday Moments Yet",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = FpmTextPrimary
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "Sunday moments will appear here as your church family shares photos.",
                            fontSize = 13.sp,
                            color = FpmTextSecondary,
                            textAlign = TextAlign.Center,
                            lineHeight = 18.sp
                        )

                        if (canUpload) {
                            Spacer(modifier = Modifier.height(20.dp))
                            FpmButton(
                                text = "Share the First Photo",
                                onClick = onStartUpload,
                                containerColor = FpmRoyalBlue
                            )
                        }
                    }
                } else {
                    // 2-Column Photo Grid
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        // Header Banner
                        item {
                            Surface(
                                color = FpmSurfaceWhite,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, FpmCardBorder),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Collections,
                                        contentDescription = null,
                                        tint = FpmRoyalBlue,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Column {
                                        Text(
                                            text = "${moments.size} Photos Shared This Week",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = FpmTextPrimary
                                        )
                                        Text(
                                            text = "Approved worship and fellowship moments from church family",
                                            fontSize = 11.sp,
                                            color = FpmTextSecondary
                                        )
                                    }
                                }
                            }
                        }

                        // Chunk items into rows of 2 for grid
                        val chunked = moments.chunked(2)
                        items(chunked) { pair ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                pair.forEach { moment ->
                                    Box(modifier = Modifier.weight(1f)) {
                                        SundayMomentGridItem(
                                            moment = moment,
                                            onClick = { onImageClick(moment.mediaUrl) },
                                            onDelete = { onDeleteMoment(moment.id) },
                                            canDelete = isAdmin || moment.uploadedBy == currentUserId
                                        )
                                    }
                                }
                                if (pair.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// COMPOSABLE: Sunday Moment Grid Item Card
// -----------------------------------------------------------------------------
@Composable
private fun SundayMomentGridItem(
    moment: SundayMomentItem,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    canDelete: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = FpmSurfaceWhite),
        border = BorderStroke(1.dp, FpmCardBorder),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
            ) {
                FpmAsyncImage(
                    model = moment.mediaUrl,
                    contentDescription = moment.caption ?: "Sunday Moment",
                    fallbackCategory = "event",
                    fallbackTitle = "Sunday Moment",
                    modifier = Modifier.fillMaxSize()
                )

                // Delete button for owner / admin
                if (canDelete) {
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                            .size(28.dp)
                            .background(FpmNavyDeep.copy(alpha = 0.65f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete moment",
                            tint = Color.White,
                            modifier = Modifier.size(15.dp)
                        )
                    }
                }
            }

            Column(modifier = Modifier.padding(10.dp)) {
                if (!moment.caption.isNullOrBlank()) {
                    Text(
                        text = moment.caption,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = FpmTextPrimary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = moment.uploadedByName ?: "Member",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmRoyalBlue,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Text(
                        text = moment.createdAt.take(10),
                        fontSize = 9.sp,
                        color = FpmTextMuted
                    )
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// HELPER UTILITIES
// -----------------------------------------------------------------------------
private fun readBytesFromUri(context: Context, uri: Uri): ByteArray? {
    return try {
        context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
    } catch (e: Exception) {
        null
    }
}

private fun getMimeTypeFromUri(context: Context, uri: Uri): String {
    return context.contentResolver.getType(uri) ?: "image/jpeg"
}

private fun getMostRecentSundayDate(): String {
    val cal = Calendar.getInstance()
    val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
    val daysSinceSunday = if (dayOfWeek == Calendar.SUNDAY) 0 else dayOfWeek - Calendar.SUNDAY
    cal.add(Calendar.DAY_OF_MONTH, -daysSinceSunday)
    val year = cal.get(Calendar.YEAR)
    val month = cal.get(Calendar.MONTH) + 1
    val day = cal.get(Calendar.DAY_OF_MONTH)
    return String.format(Locale.US, "%04d-%02d-%02d", year, month, day)
}

private fun formatSundayDateDisplay(dateStr: String): String {
    return try {
        val parts = dateStr.split("-")
        val year = parts[0].toInt()
        val month = parts[1].toInt() - 1
        val day = parts[2].toInt()
        val cal = Calendar.getInstance().apply { set(year, month, day) }
        val formatter = SimpleDateFormat("MMMM d, yyyy", Locale.US)
        "Sunday, ${formatter.format(cal.time)}"
    } catch (e: Exception) {
        "This Sunday"
    }
}

private fun isServiceStarted(dayOfWeek: String, startTime: String): Boolean {
    val calendar = Calendar.getInstance()
    val currentDay = when (calendar.get(Calendar.DAY_OF_WEEK)) {
        Calendar.SUNDAY -> "Sunday"
        Calendar.MONDAY -> "Monday"
        Calendar.TUESDAY -> "Tuesday"
        Calendar.WEDNESDAY -> "Wednesday"
        Calendar.THURSDAY -> "Thursday"
        Calendar.FRIDAY -> "Friday"
        Calendar.SATURDAY -> "Saturday"
        else -> ""
    }
    if (!dayOfWeek.equals(currentDay, ignoreCase = true)) return false
    val currentMinutes = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE)
    val timeParts = startTime.split(":")
    if (timeParts.size < 2) return false
    val serviceStartMinutes = timeParts[0].toIntOrNull()?.times(60)?.plus(timeParts[1].toIntOrNull() ?: 0) ?: 0
    return currentMinutes >= (serviceStartMinutes - 15)
}
