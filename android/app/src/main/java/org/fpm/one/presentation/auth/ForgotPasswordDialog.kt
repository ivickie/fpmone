package org.fpm.one.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
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

  Dialog(onDismissRequest = {
    viewModel.clearForgotPasswordState()
    onDismiss()
  }) {
    FpmCard(
      modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp),
      shape = RoundedCornerShape(20.dp)
    ) {
      Column(
        modifier = Modifier.padding(20.dp),
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
            text = "Reset Password",
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

        // Icon Pill
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
            imageVector = Icons.Default.Key,
            contentDescription = null,
            tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue,
            modifier = Modifier.size(28.dp)
          )
        }

        Text(
          text = "Enter your registered email address to receive secure password reset instructions.",
          fontSize = 12.sp,
          color = FpmTheme.textSecondary,
          textAlign = TextAlign.Center,
          lineHeight = 16.sp
        )

        // Success State
        if (uiState.forgotPasswordSuccess != null) {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = if (FpmTheme.isDark) FpmNavyDeep else FpmSuccessBg,
            shape = RoundedCornerShape(10.dp)
          ) {
            Column(modifier = Modifier.padding(12.dp)) {
              Text(
                text = "Instructions Dispatched",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = if (FpmTheme.isDark) FpmGold else FpmSuccess
              )
              Spacer(modifier = Modifier.height(4.dp))
              Text(
                text = uiState.forgotPasswordSuccess!!,
                fontSize = 11.sp,
                color = if (FpmTheme.isDark) FpmTextOnDark else FpmSuccess,
                lineHeight = 15.sp
              )
            }
          }

          FpmButton(
            text = "Done",
            onClick = {
              viewModel.clearForgotPasswordState()
              onDismiss()
            },
            modifier = Modifier.fillMaxWidth()
          )
        } else {
          // Error State
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

          // Email input
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
            text = "The password reset link will expire in 1 hour and is single-use.",
            fontSize = 10.sp,
            color = FpmTheme.textSecondary,
            textAlign = TextAlign.Center
          )

          FpmButton(
            text = "Send Reset Link",
            onClick = {
              viewModel.forgotPassword(emailInput)
            },
            isLoading = uiState.isForgotPasswordLoading,
            enabled = emailInput.isNotBlank() && emailInput.contains("@"),
            modifier = Modifier.fillMaxWidth()
          )
        }
      }
    }
  }
}
