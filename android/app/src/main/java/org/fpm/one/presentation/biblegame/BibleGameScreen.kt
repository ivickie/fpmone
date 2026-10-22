package org.fpm.one.presentation.biblegame

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.network.ApiClient
import org.fpm.one.core.security.SessionManager
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BibleGameScreen(
    viewModel: BibleGameViewModel,
    onNavigateBack: () -> Unit
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        if (state.todayOverview == null && SessionManager.isLoggedIn() && !ApiClient.authToken.isNullOrBlank()) {
            viewModel.loadTodayOverview()
        }
    }

    BackHandler(enabled = true) {
        if (state.currentView != BibleGameView.HOME) {
            viewModel.navigateTo(BibleGameView.HOME)
        } else {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = when (state.currentView) {
                                BibleGameView.HOME -> "Bible Challenge"
                                BibleGameView.QUIZ -> "Today's Challenge"
                                BibleGameView.RESULTS -> "Challenge Results"
                                BibleGameView.PROGRESS -> "Your Progress & Badges"
                                BibleGameView.LEADERBOARD -> "Weekly Leaderboard"
                            },
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmTextOnDark
                        )
                        Text(
                            text = "Daily Scripture Trivia",
                            fontSize = 11.sp,
                            color = FpmGoldLight
                        )
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            if (state.currentView != BibleGameView.HOME) {
                                viewModel.navigateTo(BibleGameView.HOME)
                            } else {
                                onNavigateBack()
                            }
                        }
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = FpmTextOnDark
                        )
                    }
                },
                actions = {
                    if (state.currentView == BibleGameView.HOME) {
                        IconButton(onClick = { viewModel.navigateTo(BibleGameView.PROGRESS) }) {
                            Icon(
                                imageVector = Icons.Default.EmojiEvents,
                                contentDescription = "Achievements",
                                tint = FpmGoldLight
                            )
                        }
                        IconButton(onClick = { viewModel.navigateTo(BibleGameView.LEADERBOARD) }) {
                            Icon(
                                imageVector = Icons.Default.Leaderboard,
                                contentDescription = "Leaderboard",
                                tint = FpmGoldLight
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = FpmNavyDark,
                    titleContentColor = FpmTextOnDark
                )
            )
        },
        containerColor = FpmTheme.canvasBackground
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (state.currentView) {
                BibleGameView.HOME -> BibleGameHomeScreen(
                    state = state,
                    onPlayClick = { viewModel.startChallenge() },
                    onReviewClick = { viewModel.reviewCompletedChallenge() },
                    onViewProgress = { viewModel.navigateTo(BibleGameView.PROGRESS) },
                    onViewLeaderboard = { viewModel.navigateTo(BibleGameView.LEADERBOARD) }
                )
                BibleGameView.QUIZ -> BibleQuizScreen(
                    state = state,
                    onSelectOption = { viewModel.selectOption(it) },
                    onContinue = { viewModel.continueToNextQuestion() }
                )
                BibleGameView.RESULTS -> BibleResultsScreen(
                    state = state,
                    onDoneClick = { viewModel.navigateTo(BibleGameView.HOME) }
                )
                BibleGameView.PROGRESS -> BibleProgressScreen(
                    state = state,
                    onViewLeaderboard = { viewModel.navigateTo(BibleGameView.LEADERBOARD) }
                )
                BibleGameView.LEADERBOARD -> BibleLeaderboardScreen(
                    state = state,
                    onFilterBranch = { viewModel.loadLeaderboard(it) }
                )
            }

            // Global Loading Indicator
            if (state.isLoading) {
                Surface(
                    color = Color.Black.copy(alpha = 0.35f),
                    modifier = Modifier.fillMaxSize()
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = FpmGold)
                    }
                }
            }

            // Global Error Banner
            state.errorMessage?.let { error ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        val isAuthErr = error.contains("sign in", ignoreCase = true) || error.contains("session", ignoreCase = true)
                        TextButton(
                            onClick = {
                                viewModel.dismissError()
                                if (isAuthErr) {
                                    onNavigateBack()
                                }
                            }
                        ) {
                            Text(if (isAuthErr) "SIGN IN" else "DISMISS", color = FpmGold, fontWeight = FontWeight.Bold)
                        }
                    },
                    containerColor = FpmNavyDark,
                    contentColor = FpmTextOnDark
                ) {
                    Text(text = error, fontSize = 12.sp)
                }
            }
        }
    }
}

// =============================================================================
// SCREEN 1: GAME HOME
// =============================================================================

@Composable
fun BibleGameHomeScreen(
    state: BibleGameState,
    onPlayClick: () -> Unit,
    onReviewClick: () -> Unit,
    onViewProgress: () -> Unit,
    onViewLeaderboard: () -> Unit
) {
    val overview = state.todayOverview
    val stats = overview?.stats

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Header Card
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = FpmNavyDark),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = FpmGold.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.4f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AutoStories,
                                    contentDescription = null,
                                    tint = FpmGoldLight,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "DAILY BIBLE TRIVIA",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldLight,
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }

                        // Daily Streak pill
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = FpmAmber.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, FpmAmber.copy(alpha = 0.5f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.LocalFireDepartment,
                                    contentDescription = "Streak",
                                    tint = FpmAmber,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "${stats?.currentStreak ?: 0} Day Streak",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmAmberLight
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Bible Challenge",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = FpmTextOnDark
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "5 questions daily to test your knowledge of Scripture, sharpen your faith, and compete in godly fellowship.",
                        fontSize = 13.sp,
                        color = FpmTextMuted,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Level & XP Progress
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(FpmNavySurface, RoundedCornerShape(14.dp))
                            .padding(14.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Level ${stats?.level ?: 1} · ${stats?.levelTitle ?: "Scripture Seeker"}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldLight
                                )
                                Text(
                                    text = String.format(java.util.Locale.US, "%.1f Total XP", stats?.cumulativeXp ?: 0.0),
                                    fontSize = 11.sp,
                                    color = FpmTextMuted
                                )
                            }
                            Text(
                                text = String.format(
                                    java.util.Locale.US,
                                    "%.1f / %.1f XP",
                                    stats?.xpInCurrentLevel ?: 0.0,
                                    ((stats?.xpInCurrentLevel ?: 0.0) + (stats?.xpForNextLevel ?: 100.0))
                                ),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = FpmTextOnDark
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Linear progress indicator
                        val currentXp = stats?.xpInCurrentLevel ?: 0.0
                        val nextXp = stats?.xpForNextLevel ?: 100.0
                        val totalInLevel = currentXp + nextXp
                        val progressRatio = if (totalInLevel > 0.0) {
                            (currentXp / totalInLevel).toFloat()
                        } else 0f

                        LinearProgressIndicator(
                            progress = { progressRatio.coerceIn(0f, 1f) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = FpmGold,
                            trackColor = FpmNavyDark
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Primary Play or Review Button
                    if (state.isLoading && overview == null) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = FpmGold.copy(alpha = 0.15f),
                            border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.3f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxSize(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = FpmGold,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "Checking today's challenge...",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = FpmGold
                                )
                            }
                        }
                    } else if (overview?.isCompleted == true) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = FpmSuccess.copy(alpha = 0.2f),
                                border = BorderStroke(1.dp, FpmSuccess.copy(alpha = 0.5f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = FpmSuccess,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Today's Challenge Completed (${overview.score}/5)",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FpmSuccess
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            OutlinedButton(
                                onClick = onReviewClick,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, FpmGold),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = FpmGold,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Review Answers & Scripture Notes",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGold
                                )
                            }
                        }
                    } else {
                        Button(
                            onClick = onPlayClick,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = FpmGold,
                                contentColor = FpmNavyDark
                            ),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Play Today's Challenge",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }
                }
            }
        }

        // Stats Highlights Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Best Streak
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = FpmTheme.cardBackground),
                    border = BorderStroke(0.5.dp, FpmTheme.cardBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Bolt,
                                contentDescription = null,
                                tint = FpmAmber,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Best Streak",
                                fontSize = 11.sp,
                                color = FpmTheme.textSecondary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${stats?.bestStreak ?: 0} Days",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = FpmTheme.textPrimary
                        )
                    }
                }

                // Completed Challenges
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = FpmTheme.cardBackground),
                    border = BorderStroke(0.5.dp, FpmTheme.cardBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircleOutline,
                                contentDescription = null,
                                tint = FpmSuccess,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Rounds Played",
                                fontSize = 11.sp,
                                color = FpmTheme.textSecondary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${stats?.totalChallengesCompleted ?: 0}",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = FpmTheme.textPrimary
                        )
                    }
                }
            }
        }

        // Leaderboard Preview Section
        if (!overview?.weeklyLeaderboardPreview.isNullOrEmpty()) {
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FpmTheme.cardBackground),
                    border = BorderStroke(0.5.dp, FpmTheme.cardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
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
                                    imageVector = Icons.Default.Leaderboard,
                                    contentDescription = null,
                                    tint = FpmGoldDark,
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = "Weekly Leaderboard",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmTheme.textPrimary
                                )
                            }
                            TextButton(onClick = onViewLeaderboard) {
                                Text(
                                    text = "View All",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldDark
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        overview?.weeklyLeaderboardPreview?.take(3)?.forEach { entry ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Surface(
                                        shape = CircleShape,
                                        color = when (entry.rank) {
                                            1 -> FpmGold
                                            2 -> Color(0xFFC0C0C0)
                                            3 -> Color(0xFFCD7F32)
                                            else -> FpmNavySurface
                                        },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = "${entry.rank}",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (entry.rank <= 3) FpmNavyDark else FpmTextOnDark
                                            )
                                        }
                                    }
                                    Column {
                                        Text(
                                            text = entry.displayName,
                                            fontSize = 13.sp,
                                            fontWeight = if (entry.isCurrentUser) FontWeight.Black else FontWeight.SemiBold,
                                            color = if (entry.isCurrentUser) FpmGoldDark else FpmTheme.textPrimary
                                        )
                                        Text(
                                            text = entry.branchName ?: "FPM Global",
                                            fontSize = 10.sp,
                                            color = FpmTheme.textMuted
                                        )
                                    }
                                }
                                Text(
                                    text = String.format(java.util.Locale.US, "%.1f XP", entry.weeklyXp),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldDark
                                )
                            }
                        }
                    }
                }
            }
        }

        // Badges Section Preview
        if (!overview?.badges.isNullOrEmpty()) {
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = FpmTheme.cardBackground),
                    border = BorderStroke(0.5.dp, FpmTheme.cardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Badges & Achievements",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmTheme.textPrimary
                            )
                            TextButton(onClick = onViewProgress) {
                                Text(
                                    text = "See All",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldDark
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            overview?.badges?.take(4)?.forEach { badge ->
                                Surface(
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (badge.earned) FpmGoldSubtle else FpmTheme.cardBorder.copy(alpha = 0.3f),
                                    border = BorderStroke(
                                        1.dp,
                                        if (badge.earned) FpmGold else FpmTheme.cardBorder
                                    )
                                ) {
                                    Column(
                                        modifier = Modifier.padding(8.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Icon(
                                            imageVector = when (badge.icon) {
                                                "Footprints" -> Icons.Default.DirectionsWalk
                                                "Award" -> Icons.Default.WorkspacePremium
                                                "Flame" -> Icons.Default.LocalFireDepartment
                                                "Zap" -> Icons.Default.Bolt
                                                "Compass" -> Icons.Default.Explore
                                                else -> Icons.Default.Shield
                                            },
                                            contentDescription = null,
                                            tint = if (badge.earned) FpmGoldDark else FpmTheme.textMuted,
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = badge.name,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            textAlign = TextAlign.Center,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            color = if (badge.earned) FpmTheme.textPrimary else FpmTheme.textMuted
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

// =============================================================================
// SCREEN 2: QUIZ SCREEN (5 QUESTIONS)
// =============================================================================

@Composable
fun BibleQuizScreen(
    state: BibleGameState,
    onSelectOption: (Int) -> Unit,
    onContinue: () -> Unit
) {
    val session = state.session ?: return
    val question = state.activeQuestion ?: return
    val feedback = state.lastAnswerFeedback
    val hasAnswered = feedback != null

    val questionNumber = session.currentQuestionIndex + 1

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Timer countdown row
        val maxSeconds = (state.activeTiming?.timeLimitSeconds?.takeIf { it > 0 } ?: 15).toFloat()
        val timerColor = when {
            state.remainingSeconds <= (maxSeconds * 0.25f) -> FpmError
            state.remainingSeconds <= (maxSeconds * 0.5f) -> FpmAmber
            else -> FpmGold
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Question $questionNumber of 5",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = FpmGoldDark
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = timerColor.copy(alpha = 0.15f),
                    border = BorderStroke(1.dp, timerColor.copy(alpha = 0.6f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Timer,
                            contentDescription = null,
                            tint = timerColor,
                            modifier = Modifier.size(13.dp)
                        )
                        Text(
                            text = String.format(java.util.Locale.US, "%.1fs", state.remainingSeconds),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = timerColor
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = FpmGold.copy(alpha = 0.15f),
                    border = BorderStroke(0.5.dp, FpmGold.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = question.category.uppercase(),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmNavyDark,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
        }

        // Animated Smooth 15s Timer Countdown Bar
        LinearProgressIndicator(
            progress = { (state.remainingSeconds / maxSeconds).coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = timerColor,
            trackColor = FpmTheme.cardBorder
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Question Prompt Card
        Card(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = FpmNavyDark),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = question.questionText,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmTextOnDark,
                    lineHeight = 24.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // 4 Answer Options
        question.options.forEachIndexed { index, optionText ->
            val isSelected = state.selectedOptionIndex == index
            val isCorrect = hasAnswered && index == feedback.correctOptionIndex
            val isChosenIncorrect = hasAnswered && isSelected && !isCorrect

            val containerColor = when {
                isCorrect -> FpmSuccessBg
                isChosenIncorrect -> FpmErrorBg
                isSelected -> if (FpmTheme.isDark) FpmNavySurface else FpmGoldSubtle
                else -> FpmTheme.cardBackground
            }

            val borderColor = when {
                isCorrect -> FpmSuccess
                isChosenIncorrect -> FpmError
                isSelected -> FpmGold
                else -> FpmTheme.cardBorder
            }

            val textColor = when {
                isCorrect -> FpmSuccess
                isChosenIncorrect -> FpmError
                isSelected -> if (FpmTheme.isDark) FpmGoldLight else FpmGoldDark
                else -> FpmTheme.textPrimary
            }

            Surface(
                onClick = { if (!hasAnswered && !state.isQuestionLocked) onSelectOption(index) },
                shape = RoundedCornerShape(14.dp),
                color = containerColor,
                border = BorderStroke(if (isSelected || isCorrect || isChosenIncorrect) 1.5.dp else 1.dp, borderColor),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = when {
                                isCorrect -> FpmSuccess
                                isChosenIncorrect -> FpmError
                                isSelected -> FpmGold
                                else -> FpmTheme.cardBorder.copy(alpha = 0.5f)
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = String(charArrayOf(('A'.code + index).toChar())),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected || isCorrect || isChosenIncorrect) Color.White else FpmTheme.textSecondary
                                )
                            }
                        }

                        Text(
                            text = optionText,
                            fontSize = 14.sp,
                            fontWeight = if (isSelected || isCorrect) FontWeight.Bold else FontWeight.Medium,
                            color = textColor
                        )
                    }

                    if (isCorrect) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Correct",
                            tint = FpmSuccess,
                            modifier = Modifier.size(20.dp)
                        )
                    } else if (isChosenIncorrect) {
                        Icon(
                            imageVector = Icons.Default.Cancel,
                            contentDescription = "Incorrect",
                            tint = FpmError,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Feedback / Scripture Explanation Card
        if (hasAnswered) {
            val isTimeout = feedback.isTimeout
            val titleText = when {
                isTimeout -> "⏱ Time Expired (0.0 XP)"
                feedback.isCorrect -> String.format(java.util.Locale.US, "✓ Amen! Correct (+%.1f XP)", feedback.questionXp)
                else -> "✗ Missed (0.0 XP)"
            }
            val speedSubtext = if (feedback.isCorrect && feedback.responseTimeMs > 0) {
                String.format(
                    java.util.Locale.US,
                    "Speed: %.1fs · Remaining: %.1fs",
                    feedback.responseTimeMs / 1000f,
                    feedback.remainingTimeMs / 1000f
                )
            } else null

            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = when {
                        feedback.isCorrect -> FpmSuccessBg
                        isTimeout -> FpmErrorBg
                        else -> FpmGoldSubtle
                    }
                ),
                border = BorderStroke(
                    1.dp,
                    when {
                        feedback.isCorrect -> FpmSuccess.copy(alpha = 0.4f)
                        isTimeout -> FpmError.copy(alpha = 0.4f)
                        else -> FpmGoldMuted
                    }
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = titleText,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = when {
                                    feedback.isCorrect -> FpmSuccess
                                    isTimeout -> FpmError
                                    else -> FpmGoldDark
                                }
                            )
                            speedSubtext?.let { sub ->
                                Text(
                                    text = sub,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = FpmTheme.textSecondary
                                )
                            }
                        }
                        Text(
                            text = feedback.bibleReference,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmNavyDark
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = feedback.explanation,
                        fontSize = 12.sp,
                        color = FpmTheme.textPrimary,
                        lineHeight = 17.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Continue Button
            Button(
                onClick = onContinue,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = FpmNavyDark,
                    contentColor = FpmTextOnDark
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text(
                    text = if (feedback.isRoundFinished) "See Challenge Results" else "Continue to Next Question",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        } else if (state.isSubmittingAnswer) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = FpmNavyDark.copy(alpha = 0.05f),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = FpmGold
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Recording answer...",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmTheme.textSecondary
                    )
                }
            }
        }
    }
}

// =============================================================================
// SCREEN 3: RESULTS SCREEN
// =============================================================================

@Composable
fun BibleResultsScreen(
    state: BibleGameState,
    onDoneClick: () -> Unit
) {
    val completion = state.completionResult
    val score = completion?.score ?: 0
    val total = completion?.totalQuestions ?: 5
    val xpEarned = completion?.xpAwarded ?: 0.0
    val stats = completion?.stats

    var showReviewDetails by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Results Card
        item {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = FpmNavyDark),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Trophy / Badge Icon
                    Surface(
                        shape = CircleShape,
                        color = FpmGold.copy(alpha = 0.2f),
                        border = BorderStroke(2.dp, FpmGold),
                        modifier = Modifier.size(72.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (score >= 4) Icons.Default.EmojiEvents else Icons.Default.AutoStories,
                                contentDescription = null,
                                tint = FpmGoldLight,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = when (score) {
                            5 -> "Perfect Round! Glory to God!"
                            4 -> "Well Done! Strong Scripture Knowledge"
                            3 -> "Good Effort! Keep Growing in the Word"
                            else -> "Keep Learning God's Word Daily"
                        },
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = FpmTextOnDark,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "$score out of $total questions answered correctly",
                        fontSize = 13.sp,
                        color = FpmTextMuted
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    // XP and Streak Grid
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // XP Awarded
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = FpmNavySurface
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = String.format(java.util.Locale.US, "+%.1f XP", xpEarned),
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = FpmGoldLight
                                )
                                Text(
                                    text = if (completion?.alreadyCompleted == true) "Already Earned Today" else "XP Earned Today",
                                    fontSize = 10.sp,
                                    color = FpmTextMuted
                                )
                            }
                        }

                        // Daily Streak
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = FpmNavySurface
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocalFireDepartment,
                                        contentDescription = null,
                                        tint = FpmAmber,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        text = "${stats?.currentStreak ?: 1}",
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Black,
                                        color = FpmTextOnDark
                                    )
                                }
                                Text(
                                    text = "Day Streak",
                                    fontSize = 10.sp,
                                    color = FpmTextMuted
                                )
                            }
                        }
                    }

                    // Newly Unlocked Badge
                    if (!completion?.newlyUnlockedBadges.isNullOrEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = FpmGold.copy(alpha = 0.15f),
                            border = BorderStroke(1.dp, FpmGold.copy(alpha = 0.5f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.WorkspacePremium,
                                    contentDescription = null,
                                    tint = FpmGoldLight,
                                    modifier = Modifier.size(28.dp)
                                )
                                Column {
                                    Text(
                                        text = "NEW BADGE UNLOCKED!",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FpmGoldLight
                                    )
                                    Text(
                                        text = completion?.newlyUnlockedBadges?.firstOrNull()?.name ?: "Achievement",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FpmTextOnDark
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Review Answers Button
        item {
            OutlinedButton(
                onClick = { showReviewDetails = !showReviewDetails },
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, FpmTheme.cardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = if (showReviewDetails) "Hide Answer Review" else "Review Question Answers & Scripture Notes",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = FpmTheme.textPrimary
                )
            }
        }

        // Detailed Question Review
        if (showReviewDetails && !completion?.reviewedQuestions.isNullOrEmpty()) {
            items(completion!!.reviewedQuestions) { q ->
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = FpmTheme.cardBackground),
                    border = BorderStroke(0.5.dp, FpmTheme.cardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val statusLabel = when {
                                q.isTimeout -> "⏱ Time Expired (0.0 XP)"
                                q.isCorrect -> String.format(java.util.Locale.US, "✓ Correct (+%.1f XP)", q.questionXp)
                                else -> "✗ Missed (0.0 XP)"
                            }
                            val statusColor = when {
                                q.isCorrect -> FpmSuccess
                                q.isTimeout -> FpmError
                                else -> FpmError
                            }
                            Text(
                                text = statusLabel,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = statusColor
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                if (q.responseTimeMs != null && q.responseTimeMs > 0L) {
                                    Text(
                                        text = String.format(java.util.Locale.US, "%.1fs", q.responseTimeMs / 1000f),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = FpmTheme.textMuted
                                    )
                                }
                                Text(
                                    text = q.bibleReference,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FpmGoldDark
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = q.questionText,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = FpmTheme.textPrimary
                        )

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Answer: ${q.options[q.correctOptionIndex]}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = FpmSuccess
                        )

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = q.explanation,
                            fontSize = 11.sp,
                            color = FpmTheme.textSecondary,
                            lineHeight = 15.sp
                        )
                    }
                }
            }
        }

        // Done Button
        item {
            Button(
                onClick = onDoneClick,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = FpmGold,
                    contentColor = FpmNavyDark
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text(
                    text = "Done",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }
    }
}

// =============================================================================
// SCREEN 4: PROGRESS & ACHIEVEMENTS
// =============================================================================

@Composable
fun BibleProgressScreen(
    state: BibleGameState,
    onViewLeaderboard: () -> Unit
) {
    val progress = state.progressHistory
    val stats = progress?.stats ?: state.todayOverview?.stats

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Level Progress Card
        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = FpmNavyDark),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Scripture Knowledge Rank",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FpmGoldLight
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Level ${stats?.level ?: 1}: ${stats?.levelTitle ?: "Scripture Seeker"}",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = FpmTextOnDark
                    )
                    Text(
                        text = String.format(java.util.Locale.US, "%.1f Cumulative XP earned", stats?.cumulativeXp ?: 0.0),
                        fontSize = 12.sp,
                        color = FpmTextMuted
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    val currentXp = stats?.xpInCurrentLevel ?: 0.0
                    val nextXp = stats?.xpForNextLevel ?: 100.0
                    val totalInLevel = currentXp + nextXp
                    val progressRatio = if (totalInLevel > 0.0) {
                        (currentXp / totalInLevel).toFloat()
                    } else 0f

                    LinearProgressIndicator(
                        progress = { progressRatio.coerceIn(0f, 1f) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = FpmGold,
                        trackColor = FpmNavySurface
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = String.format(java.util.Locale.US, "%.1f XP needed to reach next rank", stats?.xpForNextLevel ?: 100.0),
                        fontSize = 11.sp,
                        color = FpmTextMuted
                    )
                }
            }
        }

        // Badges Section
        item {
            Text(
                text = "Badges Earned",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTheme.textPrimary
            )
        }

        val badges = progress?.badges ?: state.todayOverview?.badges ?: emptyList()
        items(badges) { badge ->
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (badge.earned) FpmGoldSubtle else FpmTheme.cardBackground
                ),
                border = BorderStroke(
                    1.dp,
                    if (badge.earned) FpmGold else FpmTheme.cardBorder
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Surface(
                        shape = CircleShape,
                        color = if (badge.earned) FpmGold else FpmTheme.cardBorder.copy(alpha = 0.5f),
                        modifier = Modifier.size(42.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = when (badge.icon) {
                                    "Footprints" -> Icons.Default.DirectionsWalk
                                    "Award" -> Icons.Default.WorkspacePremium
                                    "Flame" -> Icons.Default.LocalFireDepartment
                                    "Zap" -> Icons.Default.Bolt
                                    "Compass" -> Icons.Default.Explore
                                    else -> Icons.Default.Shield
                                },
                                contentDescription = null,
                                tint = if (badge.earned) FpmNavyDark else FpmTheme.textMuted,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = badge.name,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = FpmTheme.textPrimary
                            )
                            if (badge.earned) {
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = FpmSuccess.copy(alpha = 0.2f)
                                ) {
                                    Text(
                                        text = "EARNED",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FpmSuccess,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                    )
                                }
                            }
                        }
                        Text(
                            text = badge.description,
                            fontSize = 12.sp,
                            color = FpmTheme.textSecondary
                        )
                    }

                    Text(
                        text = "+${badge.xpReward} XP",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = FpmGoldDark
                    )
                }
            }
        }
    }
}

// =============================================================================
// SCREEN 5: WEEKLY LEADERBOARD
// =============================================================================

@Composable
fun BibleLeaderboardScreen(
    state: BibleGameState,
    onFilterBranch: (String?) -> Unit
) {
    val leaderboard = state.leaderboard

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = FpmNavyDark),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "Global Scripture Leaderboard",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = FpmTextOnDark
                    )
                    Text(
                        text = "Weekly XP earned from daily Bible Challenges. Resets every Monday in Africa/Lagos.",
                        fontSize = 12.sp,
                        color = FpmTextMuted,
                        lineHeight = 16.sp
                    )
                }
            }
        }

        if (leaderboard?.entries.isNullOrEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No players have completed this week's challenge yet. Be the first!",
                        fontSize = 13.sp,
                        color = FpmTheme.textMuted,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            items(leaderboard!!.entries) { entry ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (entry.isCurrentUser) FpmGoldSubtle else FpmTheme.cardBackground,
                    border = BorderStroke(
                        if (entry.isCurrentUser) 1.5.dp else 0.5.dp,
                        if (entry.isCurrentUser) FpmGold else FpmTheme.cardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = when (entry.rank) {
                                    1 -> FpmGold
                                    2 -> Color(0xFFC0C0C0)
                                    3 -> Color(0xFFCD7F32)
                                    else -> FpmNavySurface
                                },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = "${entry.rank}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (entry.rank <= 3) FpmNavyDark else FpmTextOnDark
                                    )
                                }
                            }

                            Column {
                                Text(
                                    text = entry.displayName + if (entry.isCurrentUser) " (You)" else "",
                                    fontSize = 14.sp,
                                    fontWeight = if (entry.isCurrentUser) FontWeight.Black else FontWeight.Bold,
                                    color = if (entry.isCurrentUser) FpmGoldDark else FpmTheme.textPrimary
                                )
                                Text(
                                    text = if (entry.totalCorrectAnswers > 0 || entry.totalResponseTimeMs > 0L) {
                                        "${entry.branchName ?: "FPM Global"} · Level ${entry.level} · ${entry.totalCorrectAnswers} correct (${String.format(java.util.Locale.US, "%.1fs", entry.totalResponseTimeMs / 1000f)})"
                                    } else {
                                        "${entry.branchName ?: "FPM Global"} · Level ${entry.level}"
                                    },
                                    fontSize = 11.sp,
                                    color = FpmTheme.textMuted
                                )
                            }
                        }

                        Text(
                            text = String.format(java.util.Locale.US, "%.1f XP", entry.weeklyXp),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black,
                            color = FpmGoldDark
                        )
                    }
                }
            }
        }
    }
}
