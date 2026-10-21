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
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import org.fpm.one.core.util.ImageOptimizer
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
    onNavigateToProfile: () -> Unit = {},
    onOpenBibleChallenge: () -> Unit = {}
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
    var isPickerOpen by remember { mutableStateOf(false) }
    var selectedPhotoUris by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var photoCaption by remember { mutableStateOf("") }
    var isUploadingSundayPhoto by remember { mutableStateOf(false) }
    var uploadProgressText by remember { mutableStateOf("") }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 10)
    ) { uris: List<Uri> ->
        isPickerOpen = false
        if (uris.isNotEmpty()) {
            selectedPhotoUris = uris
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
            .background(FpmTheme.canvasBackground)
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
                                        color = FpmTheme.textPrimary
                                    )
                                }

                                if (sortedBranches.isNotEmpty()) {
                                    Text(
                                        text = "${sortedBranches.size} Branches",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (FpmTheme.isDark) FpmGoldLight else FpmRoyalBlue
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // User Submission Status Notice (Pending / Rejected)
                        val mySubmissions = remember(state.sundayMoments, currentUser?.userId) {
                            if (currentUser?.userId != null) {
                                state.sundayMoments.filter { it.uploadedBy == currentUser.userId }
                            } else emptyList()
                        }
                        val pendingSubmission = mySubmissions.firstOrNull { it.status == "pending" }
                        val rejectedSubmission = mySubmissions.firstOrNull { it.status == "rejected" }

                        if (pendingSubmission != null) {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 4.dp),
                                color = FpmGold.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.35f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text("⏳", fontSize = 14.sp)
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Your Sunday Moment is Pending Review",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark
                                        )
                                        Text(
                                            text = "Thank you for sharing! Church leadership will review your photo shortly before it appears in the story.",
                                            fontSize = 10.sp,
                                            color = FpmTheme.textSecondary
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                        } else if (rejectedSubmission != null) {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 4.dp),
                                color = Color(0xFFEF4444).copy(alpha = 0.12f),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.35f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text("⚠️", fontSize = 14.sp)
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Sunday Moment Not Approved",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFFEF4444)
                                        )
                                        Text(
                                            text = rejectedSubmission.rejectionReason?.let { "Reason: $it" } ?: "Your submission did not meet moderation guidelines.",
                                            fontSize = 10.sp,
                                            color = FpmTheme.textSecondary
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                        }

                        // Horizontally swipeable branch cards
                        if (sortedBranches.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp)
                                    .height(120.dp)
                                    .background(FpmTheme.cardBackground, RoundedCornerShape(16.dp))
                                    .border(1.dp, FpmTheme.cardBorder, RoundedCornerShape(16.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Loading church branches...",
                                    fontSize = 12.sp,
                                    color = FpmTheme.textSecondary
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
                                    val eligibleMoments = remember(branchMoments) {
                                        branchMoments.filter { it.status == "approved" && !it.isExpired }
                                    }
                                    val latestEligibleMoment = remember(eligibleMoments) {
                                        eligibleMoments.maxByOrNull { it.publishedAt ?: it.createdAt }
                                    }

                                    BranchSundayMomentCard(
                                        branch = branch,
                                        isUserBranch = isUserBranch,
                                        momentsCount = eligibleMoments.size,
                                        latestMomentUrl = latestEligibleMoment?.mediaUrl,
                                        onClick = { activeGalleryBranch = branch }
                                    )
                                }
                            }
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION 2B: DAILY BIBLE CHALLENGE SPOTLIGHT
                // -------------------------------------------------------------
                item(key = "daily_bible_challenge_spotlight") {
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(22.dp))
                                .clickable(onClick = onOpenBibleChallenge),
                            shape = RoundedCornerShape(22.dp),
                            colors = CardDefaults.cardColors(containerColor = FpmNavyDark),
                            border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.45f)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        Brush.linearGradient(
                                            colors = listOf(
                                                FpmNavyDeep,
                                                Color(0xFF13223B),
                                                FpmNavySurface
                                            )
                                        )
                                    )
                                    .padding(18.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    // Row with Category Badge & Streak badge
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
                                                Text(
                                                    text = "📖",
                                                    fontSize = 12.sp
                                                )
                                                Text(
                                                    text = "BIBLE CHALLENGE",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = FpmGoldLight,
                                                    letterSpacing = 0.8.sp
                                                )
                                            }
                                        }

                                        Surface(
                                            color = FpmGold.copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(12.dp),
                                            border = BorderStroke(0.5.dp, FpmGold.copy(alpha = 0.35f))
                                        ) {
                                            Text(
                                                text = "⚡ Daily Trivia",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = FpmGoldLight,
                                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                            )
                                        }
                                    }

                                    // Title & Tagline with Trophy Illustration
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "Today's Bible Challenge",
                                                fontSize = 18.sp,
                                                fontWeight = FontWeight.Black,
                                                color = Color.White
                                            )
                                            Spacer(modifier = Modifier.height(3.dp))
                                            Text(
                                                text = "5 questions to sharpen Scripture knowledge, maintain your streak & climb the weekly ranks.",
                                                fontSize = 12.sp,
                                                color = Color.White.copy(alpha = 0.85f),
                                                lineHeight = 16.sp
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(12.dp))

                                        // Badge / Avatar circular emblem
                                        Surface(
                                            shape = CircleShape,
                                            color = FpmGold.copy(alpha = 0.15f),
                                            border = BorderStroke(1.5.dp, FpmGold.copy(alpha = 0.5f)),
                                            modifier = Modifier.size(52.dp)
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Text(
                                                    text = "🏆",
                                                    fontSize = 26.sp
                                                )
                                            }
                                        }
                                    }

                                    // Action bar
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "Earn up to 50 XP today",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = FpmGoldLight
                                        )

                                        Surface(
                                            shape = RoundedCornerShape(20.dp),
                                            color = FpmGold,
                                            border = BorderStroke(0.5.dp, FpmGoldLight),
                                            modifier = Modifier.clickable(onClick = onOpenBibleChallenge)
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                Text(
                                                    text = "Play Challenge",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = FpmNavyDark
                                                )
                                                Icon(
                                                    imageVector = Icons.Default.ArrowForward,
                                                    contentDescription = null,
                                                    tint = FpmNavyDark,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                            }
                                        }
                                    }
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
                                    .clickable { activeHighlightDetail = topHighlight }
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
                                                color = FpmTheme.textPrimary
                                            )
                                            Text(
                                                text = topHighlight.highlightDate,
                                                fontSize = 10.sp,
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
                                            text = "SERMON RECAP",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark,
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
                                    color = FpmTheme.textPrimary,
                                    modifier = Modifier.padding(top = 10.dp)
                                )

                                // 3. Scripture (if present)
                                if (!topHighlight.scripture.isNullOrBlank()) {
                                    Surface(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 6.dp),
                                        color = if (FpmTheme.isDark) FpmGold.copy(alpha = 0.15f) else FpmGoldSubtle,
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(0.5.dp, if (FpmTheme.isDark) FpmGold.copy(alpha = 0.3f) else FpmGoldMuted.copy(alpha = 0.3f))
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
                                                color = if (FpmTheme.isDark) FpmGoldLight else FpmTheme.textPrimary
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
                                            color = FpmTheme.textSecondary,
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
                                        color = if (FpmTheme.isDark) FpmGoldLight else FpmRoyalBlue,
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
                            modifier = Modifier.fillMaxWidth()
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
                                            color = FpmTheme.textPrimary
                                        )
                                        Text(
                                            text = post.createdAt.take(10),
                                            fontSize = 11.sp,
                                            color = FpmTheme.textMuted
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
                                                tint = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark,
                                                modifier = Modifier.size(10.dp)
                                            )
                                            Text(
                                                text = " Pinned",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark
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
                                    color = FpmTheme.textPrimary,
                                    modifier = Modifier.padding(top = 10.dp)
                                )
                            }

                            // Scripture Reference Tag
                            if (!post.scriptureReference.isNullOrBlank()) {
                                Surface(
                                    color = if (FpmTheme.isDark) FpmGold.copy(alpha = 0.15f) else FpmGoldSubtle,
                                    shape = RoundedCornerShape(6.dp),
                                    border = BorderStroke(0.5.dp, if (FpmTheme.isDark) FpmGold.copy(alpha = 0.3f) else FpmGoldMuted.copy(alpha = 0.3f)),
                                    modifier = Modifier.padding(top = 6.dp)
                                ) {
                                    Text(
                                        text = "📖 ${post.scriptureReference}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            // Content
                            Text(
                                text = post.content,
                                fontSize = 13.sp,
                                color = FpmTheme.textPrimary,
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
                                color = if (FpmTheme.isDark) FpmCardBorderDark else FpmBorderLight,
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
                                            tint = if (isLiked) Color(0xFFE53935) else FpmTheme.textSecondary,
                                            modifier = Modifier.size(17.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Amen (${post.likesCount})",
                                            fontSize = 12.sp,
                                            color = if (isLiked) Color(0xFFE53935) else FpmTheme.textSecondary,
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
                                                    tint = FpmTheme.textSecondary,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text(
                                                    text = "Comment (${post.commentsCount})",
                                                    fontSize = 12.sp,
                                                    color = FpmTheme.textSecondary,
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
                                                    tint = FpmTheme.textMuted,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text(
                                                    text = "Comments turned off",
                                                    fontSize = 11.sp,
                                                    color = FpmTheme.textMuted,
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
                            fallbackTitle = userBranch?.name ?: "Ilorin Branch (Headquarters)",
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
                                    text = currentUser?.branchName ?: userBranch?.name ?: "Ilorin Branch (Headquarters)",
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
                    // Balanced 34dp CircleShape containers with recognized check-in badge icon
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (currentUser?.isWorker == true) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(FpmNavyDeep.copy(alpha = 0.75f))
                                    .border(1.dp, FpmGold.copy(alpha = 0.65f), CircleShape)
                                    .clickable(onClick = onOpenWorkerHub),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AssignmentTurnedIn,
                                    contentDescription = "Clock In / Worker Attendance",
                                    tint = FpmGold,
                                    modifier = Modifier.size(19.dp)
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(FpmNavyDeep.copy(alpha = 0.75f))
                                .border(0.8.dp, FpmCardBorder.copy(alpha = 0.45f), CircleShape)
                                .clickable(onClick = onNavigateToNotifications),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "Notifications",
                                tint = FpmSurfaceWhite,
                                modifier = Modifier.size(18.dp)
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
        val eligibleMoments = remember(branchMoments) {
            branchMoments.filter { it.status == "approved" && !it.isExpired }
                .sortedByDescending { it.publishedAt ?: it.createdAt }
        }
        val isBranchMemberOrAdmin = currentUser?.branchId == branch.id || currentUser?.isAdmin == true

        SundayMomentsStoryViewerDialog(
            branch = branch,
            moments = eligibleMoments,
            formattedSundayDate = formattedSundayDate,
            canUpload = isBranchMemberOrAdmin,
            onDismiss = { activeGalleryBranch = null },
            onToggleLike = { momentId -> viewModel.toggleSundayMomentLike(momentId) },
            onStartUpload = {
                isPickerOpen = true
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
            isAdmin = currentUser?.isAdmin == true,
            isExternalPaused = isPickerOpen || selectedPhotoUris.isNotEmpty() || isUploadingSundayPhoto
        )
    }

    // -------------------------------------------------------------------------
    // PHOTO UPLOAD CONFIRMATION DIALOG (When photo picked from gallery)
    // -------------------------------------------------------------------------
    if (selectedPhotoUris.isNotEmpty() && activeGalleryBranch != null) {
        val branch = activeGalleryBranch!!
        AlertDialog(
            onDismissRequest = {
                if (!isUploadingSundayPhoto) {
                    selectedPhotoUris = emptyList()
                    photoCaption = ""
                }
            },
            containerColor = FpmTheme.dialogBackground,
            title = {
                Column {
                    Text(
                        text = if (selectedPhotoUris.size > 1) "Share Sunday Moments (${selectedPhotoUris.size})" else "Share Sunday Moment",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmTheme.textPrimary
                    )
                    Text(
                        text = branch.name,
                        fontSize = 12.sp,
                        color = if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (selectedPhotoUris.size == 1) {
                        // Single Photo Preview
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(FpmTheme.surfaceTonal)
                        ) {
                            AsyncImage(
                                model = selectedPhotoUris.first(),
                                contentDescription = "Selected photo",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    } else {
                        // Multi-Photo Carousel Preview
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                        ) {
                            items(selectedPhotoUris) { uri ->
                                Box(
                                    modifier = Modifier
                                        .size(120.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(FpmTheme.surfaceTonal)
                                ) {
                                    AsyncImage(
                                        model = uri,
                                        contentDescription = "Selected photo",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }
                        }
                        Text(
                            text = "${selectedPhotoUris.size} photos selected for upload",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = FpmTheme.textSecondary
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
                        colors = fpmOutlinedTextFieldColors(),
                        shape = RoundedCornerShape(10.dp)
                    )

                    Text(
                        text = "Photos larger than 1MB are automatically optimized for fast upload.",
                        fontSize = 10.sp,
                        color = FpmTheme.textSecondary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val uris = selectedPhotoUris
                        if (uris.isEmpty()) return@Button
                        isUploadingSundayPhoto = true
                        coroutineScope.launch {
                            var successCount = 0
                            var lastError: String? = null
                            for ((index, uri) in uris.withIndex()) {
                                uploadProgressText = "Uploading ${index + 1} of ${uris.size}..."
                                val bytes = ImageOptimizer.optimize(context, uri)
                                val mimeType = getMimeTypeFromUri(context, uri)
                                val filename = "moment_${System.currentTimeMillis()}_$index.jpg"

                                if (bytes.isNotEmpty()) {
                                    val (success, err) = suspendCancellableCoroutine<Pair<Boolean, String?>> { cont ->
                                        viewModel.uploadSundayMoment(
                                            branchId = branch.id,
                                            bytes = bytes,
                                            filename = filename,
                                            mimeType = mimeType,
                                            caption = if (index == 0) photoCaption.ifBlank { null } else null,
                                            sundayDate = currentSundayDateStr
                                        ) { ok, errorMsg ->
                                            if (cont.isActive) cont.resume(Pair(ok, errorMsg))
                                        }
                                    }
                                    if (success) {
                                        successCount++
                                    } else {
                                        lastError = err
                                    }
                                } else {
                                    lastError = "Could not read photo data"
                                }
                            }
                            isUploadingSundayPhoto = false
                            uploadProgressText = ""
                            selectedPhotoUris = emptyList()
                            photoCaption = ""
                            if (successCount == uris.size) {
                                Toast.makeText(context, "${successCount} moment(s) shared successfully!", Toast.LENGTH_SHORT).show()
                            } else if (successCount > 0) {
                                Toast.makeText(context, "${successCount} of ${uris.size} uploaded (${uris.size - successCount} failed)", Toast.LENGTH_LONG).show()
                            } else {
                                Toast.makeText(context, lastError ?: "Upload failed", Toast.LENGTH_LONG).show()
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
                        Text(
                            text = uploadProgressText.ifBlank { "Uploading..." },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmSurfaceWhite
                        )
                    } else {
                        Text(
                            text = if (selectedPhotoUris.size > 1) "Upload All (${selectedPhotoUris.size})" else "Share Moment",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmSurfaceWhite
                        )
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        selectedPhotoUris = emptyList()
                        photoCaption = ""
                    },
                    enabled = !isUploadingSundayPhoto
                ) {
                    Text("Cancel", color = FpmTheme.textSecondary)
                }
            },
            shape = RoundedCornerShape(18.dp)
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
                        color = FpmTheme.textPrimary
                    )
                    Text(
                        text = "To: ${post.title ?: post.authorName}",
                        fontSize = 12.sp,
                        color = FpmTheme.textSecondary,
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
                        colors = fpmOutlinedTextFieldColors()
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
                    Text("Cancel", color = FpmTheme.textSecondary)
                }
            },
            containerColor = FpmTheme.dialogBackground,
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
    latestMomentUrl: String?,
    onClick: () -> Unit
) {
    // 1. Main Moments Cover: latest eligible published Moment, fallback to branch cover or default
    val backgroundImageUrl = latestMomentUrl ?: branch.coverImageUrl ?: branch.imageUrl

    // 2. Small circular image at top-right: branch's existing admin-managed image
    val branchAdminImageUrl = branch.coverImageUrl ?: branch.imageUrl ?: branch.logoUrl

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
            if (!backgroundImageUrl.isNullOrBlank()) {
                FpmAsyncImage(
                    model = backgroundImageUrl,
                    contentDescription = "${branch.name} Sunday Moment",
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
                        alpha = 0.15f,
                        modifier = Modifier
                            .size(160.dp)
                            .align(Alignment.Center)
                    )
                }
            }

            // Bottom Gradient Scrim for high legibility
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                FpmNavyDeep.copy(alpha = 0.45f),
                                FpmNavyDeep.copy(alpha = 0.95f)
                            ),
                            startY = 90f
                        )
                    )
            )

            // Top Badges & Top-Right Circular Branch Avatar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                // Top Left: Branch & Active Moments badge
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
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
                    }

                    if (momentsCount > 0) {
                        Surface(
                            color = FpmNavyDeep.copy(alpha = 0.85f),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(0.5.dp, FpmGold.copy(alpha = 0.5f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF22C55E))
                                )
                                Text(
                                    text = "$momentsCount ${if (momentsCount == 1) "Story" else "Stories"}",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldLight
                                )
                            }
                        }
                    }
                }

                // Top Right: Small circular neatly framed image of the branch (Admin/Pastor managed)
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(FpmNavyDeep)
                        .border(1.5.dp, FpmGold, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (!branchAdminImageUrl.isNullOrBlank()) {
                        FpmAsyncImage(
                            model = branchAdminImageUrl,
                            contentDescription = "${branch.name} Branch Image",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape)
                        )
                    } else {
                        Image(
                            painter = painterResource(id = R.drawable.church_logo),
                            contentDescription = branch.name,
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
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
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Icon(
                        imageVector = if (momentsCount > 0) Icons.Default.PlayArrow else Icons.Default.Collections,
                        contentDescription = null,
                        tint = FpmGold,
                        modifier = Modifier.size(15.dp)
                    )
                    Text(
                        text = if (momentsCount > 0) "Watch Story" else "Share Moment",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmSurfaceWhite
                    )
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// COMPOSABLE: Sunday Moments WhatsApp/Facebook Stories-Style Viewer Dialog
// -----------------------------------------------------------------------------
@Composable
private fun SundayMomentsStoryViewerDialog(
    branch: BranchItem,
    moments: List<SundayMomentItem>,
    formattedSundayDate: String,
    canUpload: Boolean,
    onDismiss: () -> Unit,
    onToggleLike: (String) -> Unit,
    onStartUpload: () -> Unit,
    onDeleteMoment: (String) -> Unit,
    currentUserId: String?,
    isAdmin: Boolean,
    isExternalPaused: Boolean = false
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        if (moments.isEmpty()) {
            // Empty State
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(FpmNavyDeep)
            ) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .size(36.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.White
                    )
                }

                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .background(FpmNavySurface, CircleShape)
                            .border(1.5.dp, FpmGold, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = null,
                            tint = FpmGoldLight,
                            modifier = Modifier.size(34.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Text(
                        text = "No Sunday Moments Yet",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Be the first to share a worship or fellowship moment from ${branch.name}!",
                        fontSize = 13.sp,
                        color = FpmSurfaceWhite.copy(alpha = 0.7f),
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
            }
        } else {
            // Full WhatsApp Status / Facebook Stories Experience
            var currentIndex by remember { mutableIntStateOf(0) }
            var isPaused by remember { mutableStateOf(false) }
            var progress by remember { mutableFloatStateOf(0f) }

            val safeIndex = currentIndex.coerceIn(0, moments.size - 1)
            val currentMoment = moments[safeIndex]

            // Lifecycle Pause/Resume Awareness
            val lifecycleOwner = LocalLifecycleOwner.current
            DisposableEffect(lifecycleOwner) {
                val observer = LifecycleEventObserver { _, event ->
                    if (event == Lifecycle.Event.ON_PAUSE || event == Lifecycle.Event.ON_STOP) {
                        isPaused = true
                    } else if (event == Lifecycle.Event.ON_RESUME) {
                        isPaused = false
                    }
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose {
                    lifecycleOwner.lifecycle.removeObserver(observer)
                }
            }

            // 5-second progression timer
            LaunchedEffect(safeIndex, moments.size) {
                progress = 0f
                val stepMs = 40L
                val totalMs = 5000L
                val step = stepMs.toFloat() / totalMs.toFloat()
                while (progress < 1f) {
                    if (!isPaused && !isExternalPaused) {
                        delay(stepMs)
                        progress = (progress + step).coerceAtMost(1f)
                    } else {
                        delay(50L)
                    }
                }
                if (safeIndex < moments.size - 1) {
                    currentIndex = safeIndex + 1
                } else {
                    onDismiss()
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                // Main Photo Display with Touch Gestures (Left = Prev, Right = Next, Long-Press = Hold)
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(safeIndex) {
                            var isHoldConsumed = false
                            detectTapGestures(
                                onPress = {
                                    val startTime = System.currentTimeMillis()
                                    isPaused = true
                                    val released = tryAwaitRelease()
                                    val duration = System.currentTimeMillis() - startTime
                                    isPaused = false
                                    if (!released || duration >= 220L) {
                                        isHoldConsumed = true
                                    }
                                },
                                onTap = { offset ->
                                    if (isHoldConsumed) {
                                        isHoldConsumed = false
                                        return@detectTapGestures
                                    }
                                    val screenWidth = size.width
                                    if (offset.x < screenWidth * 0.35f) {
                                        // Tap left: previous or restart
                                        if (progress > 0.25f || safeIndex == 0) {
                                            progress = 0f
                                        } else {
                                            currentIndex = maxOf(0, safeIndex - 1)
                                            progress = 0f
                                        }
                                    } else {
                                        // Tap right: next
                                        if (safeIndex < moments.size - 1) {
                                            currentIndex = safeIndex + 1
                                            progress = 0f
                                        } else {
                                            onDismiss()
                                        }
                                    }
                                }
                            )
                        }
                ) {
                    FpmAsyncImage(
                        model = currentMoment.mediaUrl,
                        contentDescription = currentMoment.caption ?: "Sunday Moment",
                        fallbackCategory = "event",
                        fallbackTitle = branch.name,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // Top Gradient Scrim for status bar and header legibility
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.85f),
                                    Color.Black.copy(alpha = 0.35f),
                                    Color.Transparent
                                )
                            )
                        )
                )

                // Top Controls: Segmented Progress Bar & Branch Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .statusBarsPadding()
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    // Segmented Progress Bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        moments.forEachIndexed { i, _ ->
                            val segVal = when {
                                i < safeIndex -> 1f
                                i == safeIndex -> progress
                                else -> 0f
                            }
                            LinearProgressIndicator(
                                progress = { segVal },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(3.dp)
                                    .clip(RoundedCornerShape(2.dp)),
                                color = FpmGoldLight,
                                trackColor = Color.White.copy(alpha = 0.35f)
                            )
                        }
                    }

                    // Header: Branch Avatar, Name, Uploader, Time, Close
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            // Circular Branch Avatar (Admin Managed)
                            val branchAvatarUrl = branch.coverImageUrl ?: branch.imageUrl ?: branch.logoUrl
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(FpmNavyDeep)
                                    .border(1.5.dp, FpmGold, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                if (!branchAvatarUrl.isNullOrBlank()) {
                                    FpmAsyncImage(
                                        model = branchAvatarUrl,
                                        contentDescription = branch.name,
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .clip(CircleShape)
                                    )
                                } else {
                                    Image(
                                        painter = painterResource(id = R.drawable.church_logo),
                                        contentDescription = branch.name,
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                    )
                                }
                            }

                            Column {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = branch.name,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )

                                    if (currentMoment.creatorSource == "admin") {
                                        Surface(
                                            color = FpmGold,
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = "OFFICIAL",
                                                fontSize = 8.sp,
                                                fontWeight = FontWeight.Black,
                                                color = FpmNavyDark,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                            )
                                        }
                                    }
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = currentMoment.uploadedByName ?: "Church Member",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = FpmGoldLight,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "•",
                                        fontSize = 10.sp,
                                        color = Color.White.copy(alpha = 0.5f)
                                    )
                                    Text(
                                        text = formatRelativeTime(currentMoment.publishedAt ?: currentMoment.createdAt),
                                        fontSize = 11.sp,
                                        color = Color.White.copy(alpha = 0.8f)
                                    )
                                }
                            }
                        }

                        // Close (X) Button
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .size(34.dp)
                                .background(Color.Black.copy(alpha = 0.45f), CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                // Bottom Gradient Scrim for caption & action bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.65f),
                                    Color.Black.copy(alpha = 0.95f)
                                )
                            )
                        )
                )

                // Bottom Content: Caption & Interactive Like Bar
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Caption
                    if (!currentMoment.caption.isNullOrBlank()) {
                        Text(
                            text = currentMoment.caption!!,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.White,
                            lineHeight = 19.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp)
                        )
                    }

                    // Action Controls
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Like Button with heart icon & real-time counter
                        Surface(
                            onClick = { onToggleLike(currentMoment.id) },
                            color = Color.Black.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(22.dp),
                            border = BorderStroke(
                                1.dp,
                                if (currentMoment.hasLiked) FpmGold else Color.White.copy(alpha = 0.35f)
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = if (currentMoment.hasLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                                    contentDescription = "Like Moment",
                                    tint = if (currentMoment.hasLiked) Color(0xFFFF3366) else Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = "${currentMoment.likesCount} ${if (currentMoment.likesCount == 1) "Like" else "Likes"}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (currentMoment.hasLiked) FpmGoldLight else Color.White
                                )
                            }
                        }

                        // Right Actions: Upload / Share / Delete
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (canUpload) {
                                IconButton(
                                    onClick = onStartUpload,
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(FpmRoyalBlue, CircleShape)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AddAPhoto,
                                        contentDescription = "Add Moment",
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }

                            val currentContext = LocalContext.current
                            IconButton(
                                onClick = {
                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        val text = buildString {
                                            append("Sunday Moments from Faith Preachers Ministries Int'l (${branch.name}):\n")
                                            if (!currentMoment.caption.isNullOrBlank()) {
                                                append("\"${currentMoment.caption}\"\n")
                                            }
                                            append(currentMoment.mediaUrl)
                                        }
                                        putExtra(Intent.EXTRA_TEXT, text)
                                    }
                                    currentContext.startActivity(Intent.createChooser(shareIntent, "Share Sunday Moment"))
                                },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Share,
                                    contentDescription = "Share Moment",
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            if (isAdmin || currentMoment.uploadedBy == currentUserId) {
                                IconButton(
                                    onClick = { onDeleteMoment(currentMoment.id) },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete Moment",
                                        tint = Color.White,
                                        modifier = Modifier.size(17.dp)
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

private fun formatRelativeTime(dateStr: String?): String {
    if (dateStr.isNullOrBlank()) return "Just now"
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val cleanDate = if (dateStr.contains(".")) dateStr.substringBefore(".") else dateStr.replace("Z", "")
        val date = parser.parse(cleanDate) ?: return "Recently"
        val diffMs = System.currentTimeMillis() - date.time
        val minutes = (diffMs / (1000 * 60)).toInt()
        val hours = (diffMs / (1000 * 60 * 60)).toInt()
        when {
            minutes < 1 -> "Just now"
            minutes < 60 -> "${minutes}m ago"
            hours < 24 -> "${hours}h ago"
            else -> "${hours / 24}d ago"
        }
    } catch (e: Exception) {
        "Recently"
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
