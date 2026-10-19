package org.fpm.one.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.fpmOutlinedTextFieldColors

@Composable
fun VerifyEmailScreen(
  email: String,
  viewModel: AuthViewModel,
  onVerificationComplete: () -> Unit,
  onBackToLogin: () -> Unit
) {
  val uiState by viewModel.uiState.collectAsState()
  var otpValue by remember { mutableStateOf("") }
  var cooldownSeconds by remember { mutableStateOf(60) }

  // Cooldown timer
  LaunchedEffect(cooldownSeconds) {
    if (cooldownSeconds > 0) {
      delay(1000)
      cooldownSeconds -= 1
    }
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(FpmTheme.canvasBackground)
      .padding(20.dp),
    contentAlignment = Alignment.Center
  ) {
    FpmCard(
      modifier = Modifier
        .fillMaxWidth()
        .verticalScroll(rememberScrollState()),
      shape = RoundedCornerShape(24.dp)
    ) {
      Column(
        modifier = Modifier.padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        // Back Button + Header Row
        Row(
          modifier = Modifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically
        ) {
          IconButton(
            onClick = onBackToLogin,
            modifier = Modifier
              .size(36.dp)
              .background(FpmTheme.surfaceTonal, CircleShape)
          ) {
            Icon(
              imageVector = Icons.AutoMirrored.Filled.ArrowBack,
              contentDescription = "Back to Login",
              tint = FpmTheme.textPrimary,
              modifier = Modifier.size(20.dp)
            )
          }
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            text = "Email Verification",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = FpmTheme.textPrimary
          )
        }

        // Icon Header
        Box(
          modifier = Modifier
            .size(72.dp)
            .background(
              if (FpmTheme.isDark) FpmNavyDeep else FpmRoyalBlue.copy(alpha = 0.1f),
              CircleShape
            )
            .border(2.dp, FpmGold.copy(alpha = 0.5f), CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = Icons.Default.Mail,
            contentDescription = null,
            tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue,
            modifier = Modifier.size(36.dp)
          )
        }

        Text(
          text = "Enter Verification Code",
          fontSize = 20.sp,
          fontWeight = FontWeight.Black,
          color = FpmTheme.textPrimary,
          textAlign = TextAlign.Center
        )

        Text(
          text = "A single-use 6-digit verification code has been dispatched to:",
          fontSize = 12.sp,
          color = FpmTheme.textSecondary,
          textAlign = TextAlign.Center
        )

        Surface(
          color = if (FpmTheme.isDark) FpmNavyDeep else FpmRoyalBlue.copy(alpha = 0.08f),
          shape = RoundedCornerShape(8.dp),
          border = androidx.compose.foundation.BorderStroke(1.dp, FpmGold.copy(alpha = 0.4f))
        ) {
          Text(
            text = email,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
          )
        }

        // Error message if any
        if (uiState.verifyErrorMessage != null) {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = FpmTheme.errorContainer,
            shape = RoundedCornerShape(10.dp)
          ) {
            Text(
              text = uiState.verifyErrorMessage!!,
              color = FpmTheme.errorText,
              fontSize = 12.sp,
              fontWeight = FontWeight.Medium,
              modifier = Modifier.padding(10.dp),
              textAlign = TextAlign.Center
            )
          }
        }

        // Success message if any (resend feedback)
        if (uiState.resendSuccessMessage != null) {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = if (FpmTheme.isDark) FpmNavyDeep else FpmSuccessBg,
            shape = RoundedCornerShape(10.dp)
          ) {
            Text(
              text = uiState.resendSuccessMessage!!,
              color = if (FpmTheme.isDark) FpmGold else FpmSuccess,
              fontSize = 12.sp,
              fontWeight = FontWeight.SemiBold,
              modifier = Modifier.padding(10.dp),
              textAlign = TextAlign.Center
            )
          }
        }

        // 6-digit OTP Input
        OutlinedTextField(
          value = otpValue,
          onValueChange = { input ->
            val digitsOnly = input.filter { it.isDigit() }.take(6)
            otpValue = digitsOnly
          },
          label = { Text("6-Digit Code", fontSize = 12.sp) },
          placeholder = { Text("123456", fontSize = 16.sp, letterSpacing = 8.sp) },
          keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
          singleLine = true,
          modifier = Modifier.fillMaxWidth(),
          shape = RoundedCornerShape(14.dp),
          colors = fpmOutlinedTextFieldColors(),
          textStyle = LocalTextStyle.current.copy(
            textAlign = TextAlign.Center,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 8.sp,
            color = FpmTheme.textPrimary
          )
        )

        Text(
          text = "Code expires in 10 minutes. Please check your inbox and spam folder.",
          fontSize = 11.sp,
          color = FpmTheme.textSecondary,
          textAlign = TextAlign.Center
        )

        // Verify CTA
        FpmButton(
          text = "Verify & Continue",
          onClick = {
            viewModel.verifyEmail(email, otpValue) {
              onVerificationComplete()
            }
          },
          isLoading = uiState.isVerifyingEmail,
          enabled = otpValue.length == 6,
          modifier = Modifier.fillMaxWidth()
        )

        // Resend Code Row
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.Center,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = "Didn't receive code? ",
            fontSize = 12.sp,
            color = FpmTheme.textSecondary
          )
          TextButton(
            onClick = {
              if (cooldownSeconds == 0) {
                viewModel.resendOtp(email)
                cooldownSeconds = 60
              }
            },
            enabled = cooldownSeconds == 0 && !uiState.isResendingOtp
          ) {
            Text(
              text = if (cooldownSeconds > 0) "Resend in ${cooldownSeconds}s" else "Resend Code",
              fontSize = 12.sp,
              fontWeight = FontWeight.Bold,
              color = if (cooldownSeconds == 0) (if (FpmTheme.isDark) FpmGold else FpmRoyalBlue) else FpmTheme.textSecondary
            )
          }
        }
      }
    }
  }
}
