package org.fpm.one.presentation.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Production release implementation of DebugAuthSection.
 * Strictly no-op: zero demo accounts, zero server configuration UI, and zero development diagnostic exposure.
 */
@Composable
fun DebugAuthSection(
  onFillCredentials: (String, String) -> Unit,
  modifier: Modifier = Modifier
) {
  // Production release: strictly no-op.
}
