package org.fpm.one.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*

@Composable
fun FpmCard(
  modifier: Modifier = Modifier,
  shape: RoundedCornerShape = RoundedCornerShape(16.dp),
  backgroundColor: Color = FpmSurfaceWhite,
  content: @Composable ColumnScope.() -> Unit
) {
  Card(
    modifier = modifier,
    shape = shape,
    colors = CardDefaults.cardColors(containerColor = backgroundColor),
    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(FpmCardBorder)),
    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      content = content
    )
  }
}

@Composable
fun FpmButton(
  text: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  isLoading: Boolean = false,
  containerColor: Color = FpmRoyalBlue,
  contentColor: Color = FpmSurfaceWhite
) {
  Button(
    onClick = onClick,
    modifier = modifier.height(48.dp),
    enabled = enabled && !isLoading,
    shape = RoundedCornerShape(12.dp),
    colors = ButtonDefaults.buttonColors(
      containerColor = containerColor,
      contentColor = contentColor,
      disabledContainerColor = containerColor.copy(alpha = 0.5f)
    )
  ) {
    if (isLoading) {
      CircularProgressIndicator(
        modifier = Modifier.size(20.dp),
        color = contentColor,
        strokeWidth = 2.dp
      )
    } else {
      Text(
        text = text,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold
      )
    }
  }
}

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

@Composable
fun EmptyStateView(
  title: String,
  subtitle: String,
  modifier: Modifier = Modifier,
  icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
  actionLabel: String? = null,
  onAction: (() -> Unit)? = null
) {
  Box(
    modifier = modifier.fillMaxWidth().padding(32.dp),
    contentAlignment = Alignment.Center
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
      if (icon != null) {
        Icon(
          imageVector = icon,
          contentDescription = null,
          tint = FpmTextSecondary,
          modifier = Modifier.size(44.dp)
        )
      }
      Text(
        text = title,
        fontSize = 15.sp,
        fontWeight = FontWeight.Bold,
        color = FpmTextPrimary,
        textAlign = TextAlign.Center
      )
      Text(
        text = subtitle,
        fontSize = 12.sp,
        color = FpmTextSecondary,
        textAlign = TextAlign.Center
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

@Composable
fun OfflineBanner(isOffline: Boolean) {
  if (isOffline) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .background(FpmAmber)
        .padding(vertical = 4.dp, horizontal = 12.dp),
      contentAlignment = Alignment.Center
    ) {
      Text(
        text = "Offline Mode - Showing Cached Data",
        color = FpmNavyDark,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold
      )
    }
  }
}
