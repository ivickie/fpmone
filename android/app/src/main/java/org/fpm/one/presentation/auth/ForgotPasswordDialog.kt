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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Pin
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.delay
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.fpmOutlinedTextFieldColors

@Composable
fun ForgotPasswordDialog(
  initialEmail: String = "",
  viewModel: AuthViewModel,
  onDismiss: () -> Unit
) {
  val uiState by viewModel.uiState.collectAsState()
  var emailInput by remember { mutableStateOf(initialEmail) }
  var otpInput by remember { mutableStateOf("") }
  var newPasswordInput by remember { mutableStateOf("") }
  var confirmPasswordInput by remember { mutableStateOf("") }
  var newPasswordVisible by remember { mutableStateOf(false) }
  var confirmPasswordVisible by remember { mutableStateOf(false) }
  var localPasswordError by remember { mutableStateOf<String?>(null) }
  var cooldownSeconds by remember { mutableStateOf(60) }

  // Cooldown timer for OTP resend
  LaunchedEffect(uiState.forgotPasswordStep, cooldownSeconds) {
    if (uiState.forgotPasswordStep == ForgotPasswordStep.ENTER_OTP && cooldownSeconds > 0) {
      delay(1000)
      cooldownSeconds -= 1
    }
  }

  Dialog(onDismissRequest = {
    viewModel.clearForgotPasswordState()
    onDismiss()
  }) {
    FpmCard(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 8.dp, vertical = 16.dp),
      shape = RoundedCornerShape(20.dp)
    ) {
      Column(
        modifier = Modifier
          .padding(20.dp)
          .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp)
      ) {
        // Close Button & Header
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = when (uiState.forgotPasswordStep) {
              ForgotPasswordStep.ENTER_EMAIL -> "Reset Password"
              ForgotPasswordStep.ENTER_OTP -> "Verify Reset Code"
              ForgotPasswordStep.SET_NEW_PASSWORD -> "Set New Password"
              ForgotPasswordStep.SUCCESS -> "Reset Complete"
            },
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
            color = FpmTheme.textPrimary
          )
          IconButton(
            onClick = {
              viewModel.clearForgotPasswordState()
              onDismiss()
            },
            modifier = Modifier.size(28.dp)
          ) {
            Icon(
              imageVector = Icons.Default.Close,
              contentDescription = "Close",
              tint = FpmTheme.textSecondary,
              modifier = Modifier.size(18.dp)
            )
          }
        }

        // Icon Badge Pill
        Box(
          modifier = Modifier
            .size(56.dp)
            .background(
              if (FpmTheme.isDark) FpmNavyDeep else FpmRoyalBlue.copy(alpha = 0.1f),
              CircleShape
            ),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = when (uiState.forgotPasswordStep) {
              ForgotPasswordStep.ENTER_EMAIL -> Icons.Default.Key
              ForgotPasswordStep.ENTER_OTP -> Icons.Default.Pin
              ForgotPasswordStep.SET_NEW_PASSWORD -> Icons.Default.Lock
              ForgotPasswordStep.SUCCESS -> Icons.Default.CheckCircle
            },
            contentDescription = null,
            tint = when (uiState.forgotPasswordStep) {
              ForgotPasswordStep.SUCCESS -> FpmSuccess
              else -> if (FpmTheme.isDark) FpmGold else FpmRoyalBlue
            },
            modifier = Modifier.size(28.dp)
          )
        }

        // STEP 1: ENTER EMAIL
        if (uiState.forgotPasswordStep == ForgotPasswordStep.ENTER_EMAIL) {
          Text(
            text = "Enter your registered email address to receive a 6-digit password reset code.",
            fontSize = 12.sp,
            color = FpmTheme.textSecondary,
            textAlign = TextAlign.Center,
            lineHeight = 16.sp
          )

          if (uiState.forgotPasswordError != null) {
            Surface(
              modifier = Modifier.fillMaxWidth(),
              color = FpmTheme.errorContainer,
              shape = RoundedCornerShape(10.dp)
            ) {
              Text(
                text = uiState.forgotPasswordError!!,
                color = FpmTheme.errorText,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(10.dp),
                textAlign = TextAlign.Center
              )
            }
          }

          OutlinedTextField(
            value = emailInput,
            onValueChange = { emailInput = it },
            label = { Text("Email Address", fontSize = 12.sp) },
            leadingIcon = {
              Icon(
                imageVector = Icons.Default.Mail,
                contentDescription = null,
                tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue
              )
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = fpmOutlinedTextFieldColors()
          )

          Text(
            text = "The 6-digit verification code will expire in 10 minutes.",
            fontSize = 10.sp,
            color = FpmTheme.textSecondary,
            textAlign = TextAlign.Center
          )

          FpmButton(
            text = "Send Reset Code",
            onClick = {
              viewModel.forgotPassword(emailInput) {
                cooldownSeconds = 60
              }
            },
            isLoading = uiState.isForgotPasswordLoading,
            enabled = emailInput.isNotBlank() && emailInput.contains("@"),
            modifier = Modifier.fillMaxWidth()
          )
        }

        // STEP 2: ENTER OTP
        if (uiState.forgotPasswordStep == ForgotPasswordStep.ENTER_OTP) {
          Text(
            text = "A single-use 6-digit code has been dispatched to:",
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
              text = uiState.forgotPasswordEmail ?: emailInput,
              fontSize = 12.sp,
              fontWeight = FontWeight.Bold,
              color = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue,
              modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
            )
          }

          if (uiState.resetOtpError != null) {
            Surface(
              modifier = Modifier.fillMaxWidth(),
              color = FpmTheme.errorContainer,
              shape = RoundedCornerShape(10.dp)
            ) {
              Text(
                text = uiState.resetOtpError!!,
                color = FpmTheme.errorText,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(10.dp),
                textAlign = TextAlign.Center
              )
            }
          }

          if (uiState.resendResetSuccess != null) {
            Surface(
              modifier = Modifier.fillMaxWidth(),
              color = if (FpmTheme.isDark) FpmNavyDeep else FpmSuccessBg,
              shape = RoundedCornerShape(10.dp)
            ) {
              Text(
                text = uiState.resendResetSuccess!!,
                color = if (FpmTheme.isDark) FpmGold else FpmSuccess,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(10.dp),
                textAlign = TextAlign.Center
              )
            }
          }

          OutlinedTextField(
            value = otpInput,
            onValueChange = {
              if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                otpInput = it
              }
            },
            label = { Text("6-Digit Reset Code", fontSize = 12.sp) },
            leadingIcon = {
              Icon(
                imageVector = Icons.Default.Pin,
                contentDescription = null,
                tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue
              )
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = fpmOutlinedTextFieldColors()
          )

          Text(
            text = "Code expires in 10 minutes • Single-use only",
            fontSize = 10.sp,
            color = FpmTheme.textSecondary,
            textAlign = TextAlign.Center
          )

          FpmButton(
            text = "Verify Code",
            onClick = {
              val email = uiState.forgotPasswordEmail ?: emailInput
              viewModel.verifyResetOtp(email, otpInput)
            },
            isLoading = uiState.isVerifyingResetOtp,
            enabled = otpInput.length == 6,
            modifier = Modifier.fillMaxWidth()
          )

          // Resend Code Option
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
          ) {
            if (cooldownSeconds > 0) {
              Text(
                text = "Resend code in ${cooldownSeconds}s",
                fontSize = 11.sp,
                color = FpmTheme.textSecondary
              )
            } else {
              TextButton(
                onClick = {
                  val email = uiState.forgotPasswordEmail ?: emailInput
                  viewModel.resendResetOtp(email)
                  cooldownSeconds = 60
                },
                enabled = !uiState.isResendingResetOtp
              ) {
                Icon(
                  imageVector = Icons.Default.Refresh,
                  contentDescription = null,
                  modifier = Modifier.size(14.dp),
                  tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                  text = if (uiState.isResendingResetOtp) "Sending..." else "Resend Code",
                  fontSize = 11.sp,
                  fontWeight = FontWeight.Bold,
                  color = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue
                )
              }
            }
          }
        }

        // STEP 3: SET NEW PASSWORD
        if (uiState.forgotPasswordStep == ForgotPasswordStep.SET_NEW_PASSWORD) {
          Text(
            text = "Verification confirmed! Please create a new password for your account.",
            fontSize = 12.sp,
            color = FpmTheme.textSecondary,
            textAlign = TextAlign.Center,
            lineHeight = 16.sp
          )

          val displayError = localPasswordError ?: uiState.resetPasswordError
          if (displayError != null) {
            Surface(
              modifier = Modifier.fillMaxWidth(),
              color = FpmTheme.errorContainer,
              shape = RoundedCornerShape(10.dp)
            ) {
              Text(
                text = displayError,
                color = FpmTheme.errorText,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(10.dp),
                textAlign = TextAlign.Center
              )
            }
          }

          // New Password field
          OutlinedTextField(
            value = newPasswordInput,
            onValueChange = {
              newPasswordInput = it
              localPasswordError = null
            },
            label = { Text("New Password *", fontSize = 12.sp) },
            leadingIcon = {
              Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = null,
                tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue
              )
            },
            trailingIcon = {
              IconButton(onClick = { newPasswordVisible = !newPasswordVisible }) {
                Icon(
                  imageVector = if (newPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                  contentDescription = if (newPasswordVisible) "Hide password" else "Show password",
                  tint = FpmTheme.textSecondary
                )
              }
            },
            visualTransformation = if (newPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = fpmOutlinedTextFieldColors()
          )

          // Confirm Password field
          OutlinedTextField(
            value = confirmPasswordInput,
            onValueChange = {
              confirmPasswordInput = it
              localPasswordError = null
            },
            label = { Text("Confirm New Password *", fontSize = 12.sp) },
            leadingIcon = {
              Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = null,
                tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue
              )
            },
            trailingIcon = {
              IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                Icon(
                  imageVector = if (confirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                  contentDescription = if (confirmPasswordVisible) "Hide password" else "Show password",
                  tint = FpmTheme.textSecondary
                )
              }
            },
            visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = fpmOutlinedTextFieldColors()
          )

          Text(
            text = "Password must be at least 6 characters long.",
            fontSize = 10.sp,
            color = FpmTheme.textSecondary,
            textAlign = TextAlign.Center
          )

          FpmButton(
            text = "Save New Password",
            onClick = {
              if (newPasswordInput.length < 6) {
                localPasswordError = "New password must be at least 6 characters long."
                return@FpmButton
              }
              if (newPasswordInput != confirmPasswordInput) {
                localPasswordError = "Passwords do not match. Please re-enter."
                return@FpmButton
              }
              val email = uiState.forgotPasswordEmail ?: emailInput
              val token = uiState.resetAuthToken ?: ""
              viewModel.completePasswordReset(email, token, newPasswordInput)
            },
            isLoading = uiState.isResettingPassword,
            enabled = newPasswordInput.isNotBlank() && confirmPasswordInput.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
          )
        }

        // STEP 4: SUCCESS CONFIRMATION
        if (uiState.forgotPasswordStep == ForgotPasswordStep.SUCCESS) {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = if (FpmTheme.isDark) FpmNavyDeep else FpmSuccessBg,
            shape = RoundedCornerShape(10.dp)
          ) {
            Column(
              modifier = Modifier.padding(14.dp),
              horizontalAlignment = Alignment.CenterHorizontally
            ) {
              Text(
                text = "Password Successfully Reset",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (FpmTheme.isDark) FpmGold else FpmSuccess
              )
              Spacer(modifier = Modifier.height(4.dp))
              Text(
                text = uiState.resetPasswordSuccess ?: "Your password has been successfully reset. You can now sign in with your new password.",
                fontSize = 11.sp,
                color = if (FpmTheme.isDark) FpmTextOnDark else FpmSuccess,
                lineHeight = 15.sp,
                textAlign = TextAlign.Center
              )
            }
          }

          FpmButton(
            text = "Back to Sign In",
            onClick = {
              viewModel.clearForgotPasswordState()
              onDismiss()
            },
            modifier = Modifier.fillMaxWidth()
          )
        }
      }
    }
  }
}
