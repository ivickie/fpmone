package org.fpm.one.presentation.components

import androidx.compose.animation.core.*
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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.R
import org.fpm.one.core.theme.*

/**
 * Modern FPM Card with subtle border, soft elevation, and optional gradient/container color.
 */
@Composable
fun FpmCard(
  modifier: Modifier = Modifier,
  shape: RoundedCornerShape = RoundedCornerShape(16.dp),
  backgroundColor: Color = FpmSurfaceWhite,
  borderColor: Color = FpmCardBorder,
  elevation: Dp = 1.dp,
  contentPadding: Dp = 16.dp,
  onClick: (() -> Unit)? = null,
  content: @Composable ColumnScope.() -> Unit
) {
  val cardModifier = if (onClick != null) {
    modifier.clip(shape).clickable(onClick = onClick)
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
 * Modern FPM tactile button with smooth press micro-interaction and loading indicator.
 */
@Composable
fun FpmButton(
  text: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  isLoading: Boolean = false,
  containerColor: Color = FpmRoyalBlue,
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
 * Standardized FPM Top Bar with church emblem, title, subtitle, back button, and actions.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FpmTopBar(
  title: String,
  subtitle: String? = null,
  onNavigateBack: (() -> Unit)? = null,
  actions: @Composable RowScope.() -> Unit = {}
) {
  TopAppBar(
    title = {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
      ) {
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
            fontSize = 17.sp,
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
    },
    navigationIcon = {
      if (onNavigateBack != null) {
        IconButton(onClick = onNavigateBack) {
          Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = FpmSurfaceWhite)
        }
      }
    },
    actions = actions,
    colors = TopAppBarDefaults.topAppBarColors(
      containerColor = FpmNavy
    )
  )
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
          color = FpmGold,
          letterSpacing = 1.sp
        )
        Spacer(modifier = Modifier.height(2.dp))
      }
      Text(
        text = title,
        fontSize = 16.sp,
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
          color = FpmRoyalBlue
        )
      }
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
      CircularProgressIndicator(color = FpmRoyalBlue, strokeWidth = 3.dp)
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
            .background(FpmRoyalBlue.copy(alpha = 0.08f)),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = icon,
            contentDescription = null,
            tint = FpmRoyalBlue,
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
        containerColor = FpmNavy
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
