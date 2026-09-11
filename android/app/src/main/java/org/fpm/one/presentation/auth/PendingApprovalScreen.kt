package org.fpm.one.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard

@Composable
fun PendingApprovalScreen(
  onBackToLogin: () -> Unit
) {
  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmSlateBg)
      .padding(24.dp),
    contentAlignment = Alignment.Center
  ) {
    FpmCard(
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(24.dp)
    ) {
      Column(
        modifier = Modifier.padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        Box(
          modifier = Modifier
            .size(72.dp)
            .background(FpmAmberLight, CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = Icons.Default.HourglassTop,
            contentDescription = null,
            tint = FpmGold,
            modifier = Modifier.size(36.dp)
          )
        }

        Text(
          text = "Pending Approval",
          fontSize = 20.sp,
          fontWeight = FontWeight.Black,
          color = FpmTextPrimary
        )

        Text(
          text = "Your registration has been submitted and is awaiting approval.",
          fontSize = 14.sp,
          fontWeight = FontWeight.SemiBold,
          color = FpmRoyalBlue,
          textAlign = TextAlign.Center
        )

        Text(
          text = "Faith Preachers Ministry branch administrators and pastors review each member and worker enlistment to preserve ministry integrity. You will receive full access immediately once approved.",
          fontSize = 12.sp,
          color = FpmTextSecondary,
          textAlign = TextAlign.Center,
          lineHeight = 18.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        FpmButton(
          text = "Return to Sign In",
          onClick = onBackToLogin,
          modifier = Modifier.fillMaxWidth()
        )
      }
    }
  }
}
