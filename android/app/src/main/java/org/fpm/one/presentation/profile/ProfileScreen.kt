package org.fpm.one.presentation.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.layout.ContentScale
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import coil.compose.SubcomposeAsyncImage
import kotlinx.coroutines.launch
import org.fpm.one.R
import org.fpm.one.core.security.SessionManager
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.UserSession
import org.fpm.one.presentation.components.*

@Composable
fun ProfileScreen(
  onNavigateToWorkerHub: () -> Unit,
  onNavigateToNotifications: () -> Unit,
  onLogout: () -> Unit
) {
  val context = LocalContext.current
  val user by SessionManager.getInstance().currentUser.collectAsState()
  var showLogoutConfirm by remember { mutableStateOf(false) }
  var showDeleteAccountConfirm by remember { mutableStateOf(false) }
  var showAboutDialog by remember { mutableStateOf(false) }

  Scaffold(
    topBar = {
      FpmTopBar(
        title = "My Profile & Ministry",
        subtitle = "Account Details & Ministry Assignment"
      )
    }
  ) { paddingValues ->
    LazyColumn(
      modifier = Modifier
        .fillMaxSize()
        .padding(paddingValues)
        .background(FpmTheme.canvasBackground),
      contentPadding = PaddingValues(16.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      // 1. User Profile Header Card
      item {
        ProfileHeaderCard(user = user)
      }

      // 2. App Theme & Display Appearance Switcher
      item {
        ThemeAppearanceCard()
      }

      // 3. Worker Hub Quick Access (for workers or pastors)
      if (user?.isWorker == true || user?.isAdmin == true) {
        item {
          WorkerHubEntryBanner(
            workerCode = user?.workerDetails?.workerCode ?: "FPM-0001",
            department = user?.workerDetails?.departmentName ?: "Ministry Worker",
            onClick = onNavigateToWorkerHub
          )
        }
      }

      // 4. Ministry Details Card
      item {
        MinistryDetailsCard(user = user)
      }

      // 5. General Options & Quick Navigation
      item {
        OptionsGroupCard(
          items = listOf(
            ProfileOptionItem(
              icon = Icons.Default.Notifications,
              title = "Notification Center",
              subtitle = "Church broadcasts, service updates & alerts",
              onClick = onNavigateToNotifications
            ),
            ProfileOptionItem(
              icon = Icons.Default.Security,
              title = "Biometrics & Security",
              subtitle = "Device fingerprint & attendance credentials encryption",
              onClick = {}
            ),
            ProfileOptionItem(
              icon = Icons.Default.PrivacyTip,
              title = "Privacy Policy",
              subtitle = "How FPM Global safeguards your personal data",
              onClick = {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.fpmglobal.online/privacy"))
                context.startActivity(intent)
              }
            ),
            ProfileOptionItem(
              icon = Icons.Default.DeleteForever,
              title = "Request Account Deletion",
              subtitle = "Permanent deletion of your church account and data",
              onClick = { showDeleteAccountConfirm = true }
            ),
            ProfileOptionItem(
              icon = Icons.Default.Church,
              title = "About Faith Preachers Ministries Int'l",
              subtitle = "Global vision, tenets of faith, and leadership",
              onClick = { showAboutDialog = true }
            )
          )
        )
      }

      // 5. App Version & Logout
      item {
        Column(
          modifier = Modifier.fillMaxWidth(),
          horizontalAlignment = Alignment.CenterHorizontally
        ) {
          FpmButton(
            text = "Log Out from FPM Global",
            onClick = { showLogoutConfirm = true },
            containerColor = FpmError,
            icon = Icons.AutoMirrored.Filled.Logout,
            modifier = Modifier.fillMaxWidth()
          )

          Spacer(modifier = Modifier.height(24.dp))

          Box(
            modifier = Modifier
              .size(56.dp)
              .clip(CircleShape)
              .background(FpmGold.copy(alpha = 0.15f))
              .border(1.5.dp, FpmGold.copy(alpha = 0.5f), CircleShape)
              .padding(4.dp),
            contentAlignment = Alignment.Center
          ) {
            Image(
              painter = painterResource(id = R.drawable.church_logo),
              contentDescription = "Faith Preachers Ministries Int'l Emblem",
              modifier = Modifier
                .size(46.dp)
                .clip(CircleShape)
            )
          }

          Spacer(modifier = Modifier.height(8.dp))

          Text(
            text = "FAITH PREACHERS MINISTRIES INT'L",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = FpmTheme.textPrimary,
            letterSpacing = 0.5.sp
          )
          Text(
            text = "Jeremiah 1:8 • FPM Global Platform v${org.fpm.one.BuildConfig.VERSION_NAME}",
            fontSize = 10.sp,
            color = FpmTheme.textMuted
          )
          Spacer(modifier = Modifier.height(16.dp))
        }
      }
    }
  }

  if (showLogoutConfirm) {
    AlertDialog(
      onDismissRequest = { showLogoutConfirm = false },
      containerColor = FpmTheme.dialogBackground,
      shape = RoundedCornerShape(18.dp),
      title = { Text("Confirm Sign Out", fontWeight = FontWeight.Bold, color = FpmTheme.textPrimary) },
      text = { Text("Are you sure you want to log out of your FPM Global account on this device?", color = FpmTheme.textSecondary) },
      confirmButton = {
        Button(
          onClick = {
            showLogoutConfirm = false
            SessionManager.clearSession()
            onLogout()
          },
          colors = ButtonDefaults.buttonColors(containerColor = FpmError),
          shape = RoundedCornerShape(10.dp)
        ) {
          Text("Sign Out")
        }
      },
      dismissButton = {
        TextButton(onClick = { showLogoutConfirm = false }) {
          Text("Cancel", color = FpmTheme.textSecondary)
        }
      }
    )
  }

  if (showDeleteAccountConfirm) {
    AlertDialog(
      onDismissRequest = { showDeleteAccountConfirm = false },
      containerColor = FpmTheme.dialogBackground,
      shape = RoundedCornerShape(18.dp),
      title = { Text("Request Account Deletion", fontWeight = FontWeight.Bold, color = FpmError) },
      text = {
        Text(
          "In accordance with Google Play policies and data protection regulations, you can permanently delete your FPM Global account and associated data.\n\n" +
          "Deleting your account will remove your personal profile, ministry assignments, and attendance logs.\n\n" +
          "Would you like to open the account deletion portal to complete this request?",
          color = FpmTheme.textSecondary
        )
      },
      confirmButton = {
        Button(
          onClick = {
            showDeleteAccountConfirm = false
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.fpmglobal.online/delete-account"))
            context.startActivity(intent)
          },
          colors = ButtonDefaults.buttonColors(containerColor = FpmError),
          shape = RoundedCornerShape(10.dp)
        ) {
          Text("Open Deletion Portal")
        }
      },
      dismissButton = {
        TextButton(onClick = { showDeleteAccountConfirm = false }) {
          Text("Cancel", color = FpmTheme.textSecondary)
        }
      }
    )
  }

  if (showAboutDialog) {
    AlertDialog(
      onDismissRequest = { showAboutDialog = false },
      containerColor = FpmTheme.dialogBackground,
      shape = RoundedCornerShape(18.dp),
      title = { Text("About FPM Global", fontWeight = FontWeight.Bold, color = FpmTheme.textPrimary) },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text(
            "Faith Preachers Ministries International",
            fontWeight = FontWeight.Bold,
            color = if (FpmTheme.isDark) FpmGold else FpmNavyDark
          )
          Text(
            "“Be not afraid of their faces: for I am with thee to deliver thee, saith the Lord.” — Jeremiah 1:8",
            style = MaterialTheme.typography.bodySmall,
            color = FpmTheme.textSecondary
          )
          HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = FpmTheme.cardBorder)
          Text(
            "The FPM Global mobile app connects church members, workers, and ministers globally for services, testimonies, notifications, and ministry work.",
            style = MaterialTheme.typography.bodyMedium,
            color = FpmTheme.textPrimary
          )
          Text(
            "Version ${org.fpm.one.BuildConfig.VERSION_NAME} (Release)\nWeb: https://www.fpmglobal.online",
            style = MaterialTheme.typography.bodySmall,
            color = FpmTheme.textMuted
          )
        }
      },
      confirmButton = {
        Button(
          onClick = { showAboutDialog = false },
          colors = ButtonDefaults.buttonColors(containerColor = if (FpmTheme.isDark) FpmNavySurface else FpmNavyDark),
          shape = RoundedCornerShape(10.dp)
        ) {
          Text("Close", color = if (FpmTheme.isDark) FpmGold else FpmSurfaceWhite)
        }
      }
    )
  }
}

@Composable
fun ProfileHeaderCard(user: UserSession?) {
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()
  var isUploading by remember { mutableStateOf(false) }

  val photoLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.GetContent()
  ) { uri ->
    if (uri != null) {
      coroutineScope.launch {
        try {
          isUploading = true
          val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
          if (bytes == null || bytes.isEmpty()) {
            android.widget.Toast.makeText(context, "Could not read selected photo", android.widget.Toast.LENGTH_SHORT).show()
            return@launch
          }
          val mimeType = context.contentResolver.getType(uri) ?: "image/jpeg"
          val ext = if (mimeType.contains("png")) "png" else if (mimeType.contains("webp")) "webp" else "jpg"
          val filename = "profile_${System.currentTimeMillis()}.$ext"

          val result = org.fpm.one.core.network.ApiClient.updateProfilePicture(bytes, filename, mimeType)
          result.onSuccess { publicUrl ->
            val updated = user?.copy(profilePictureUrl = publicUrl)
            if (updated != null) {
              SessionManager.updateCachedUser(updated)
            }
            android.widget.Toast.makeText(context, "Profile photo updated successfully!", android.widget.Toast.LENGTH_SHORT).show()
          }.onFailure { err ->
            android.widget.Toast.makeText(context, "Failed to update profile photo: ${err.message}", android.widget.Toast.LENGTH_LONG).show()
          }
        } catch (e: Exception) {
          android.widget.Toast.makeText(context, "Error: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
        } finally {
          isUploading = false
        }
      }
    }
  }

  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Box(
        modifier = Modifier.size(76.dp)
      ) {
        Box(
          modifier = Modifier
            .size(70.dp)
            .clip(CircleShape)
            .border(2.dp, FpmGold, CircleShape)
            .background(
              Brush.linearGradient(
                colors = listOf(FpmNavyDark, FpmRoyalBlue)
              )
            )
            .clickable(enabled = !isUploading) { photoLauncher.launch("image/*") },
          contentAlignment = Alignment.Center
        ) {
          if (!user?.profilePictureUrl.isNullOrBlank()) {
            SubcomposeAsyncImage(
              model = org.fpm.one.core.network.ApiClient.resolveMediaUrl(user?.profilePictureUrl),
              contentDescription = user?.fullName,
              contentScale = ContentScale.Crop,
              modifier = Modifier.fillMaxSize(),
              loading = {
                Box(
                  modifier = Modifier
                    .fillMaxSize()
                    .shimmerEffect()
                )
              },
              error = {
                Text(
                  text = (user?.firstName?.take(1) ?: "F") + (user?.lastName?.take(1) ?: "P"),
                  fontSize = 24.sp,
                  fontWeight = FontWeight.Black,
                  color = FpmGoldLight
                )
              }
            )
          } else {
            Text(
              text = (user?.firstName?.take(1) ?: "F") + (user?.lastName?.take(1) ?: "P"),
              fontSize = 24.sp,
              fontWeight = FontWeight.Black,
              color = FpmGoldLight
            )
          }

          if (isUploading) {
            Box(
              modifier = Modifier
                .fillMaxSize()
                .background(FpmNavyDeep.copy(alpha = 0.65f)),
              contentAlignment = Alignment.Center
            ) {
              CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = FpmGold,
                strokeWidth = 2.5.dp
              )
            }
          }
        }

        // Camera badge button
        IconButton(
          onClick = { photoLauncher.launch("image/*") },
          enabled = !isUploading,
          modifier = Modifier
            .size(26.dp)
            .align(Alignment.BottomEnd)
            .clip(CircleShape)
            .background(FpmGold)
            .border(1.5.dp, FpmSurfaceWhite, CircleShape)
        ) {
          Icon(
            imageVector = Icons.Default.CameraAlt,
            contentDescription = "Upload Profile Photo",
            tint = FpmNavyDeep,
            modifier = Modifier.size(14.dp)
          )
        }
      }

      Spacer(modifier = Modifier.width(16.dp))

      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = user?.fullName ?: "Faith Preachers Member",
          fontSize = 17.sp,
          fontWeight = FontWeight.Black,
          color = FpmTheme.textPrimary
        )

        Spacer(modifier = Modifier.height(2.dp))

        Text(
          text = user?.email ?: "",
          fontSize = 12.sp,
          color = FpmTheme.textSecondary
        )
        Text(
          text = user?.phone ?: "",
          fontSize = 12.sp,
          color = FpmTheme.textMuted
        )

        Spacer(modifier = Modifier.height(8.dp))

        Surface(
          color = FpmSuccessBg,
          shape = RoundedCornerShape(6.dp)
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
          ) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = FpmSuccess, modifier = Modifier.size(12.dp))
            Text(
              text = "STATUS: ${user?.accountStatus?.uppercase() ?: "ACTIVE"}",
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = FpmSuccess
            )
          }
        }
      }
    }
  }
}

@Composable
fun WorkerHubEntryBanner(
  workerCode: String,
  department: String,
  onClick: () -> Unit
) {
  Surface(
    shape = RoundedCornerShape(14.dp),
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(14.dp))
      .clickable(onClick = onClick),
    color = Color.Transparent
  ) {
    Box(
      modifier = Modifier
        .background(
          Brush.linearGradient(
            colors = listOf(FpmNavy, Color(0xFF1E3A8A))
          )
        )
        .border(1.dp, FpmGold.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
        .padding(16.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier
            .size(46.dp)
            .clip(CircleShape)
            .background(FpmGold.copy(alpha = 0.2f))
            .border(1.dp, FpmGold.copy(alpha = 0.5f), CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(Icons.Default.Badge, contentDescription = null, tint = FpmGoldLight, modifier = Modifier.size(24.dp))
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
          Text(
            text = "Worker Attendance & Digital ID",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = FpmSurfaceWhite
          )
          Text(
            text = "Badge: $workerCode • $department",
            fontSize = 12.sp,
            color = FpmGoldLight
          )
        }

        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = FpmSurfaceWhite)
      }
    }
  }
}

@Composable
fun MinistryDetailsCard(user: UserSession?) {
  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Column {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
      ) {
        Icon(Icons.Default.Church, contentDescription = null, tint = FpmTheme.royalBlue, modifier = Modifier.size(18.dp))
        Text(
          text = "Ministry Assignment",
          fontSize = 15.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTheme.textPrimary
        )
      }

      Spacer(modifier = Modifier.height(12.dp))

      MinistryDetailRow(label = "Church Branch", value = user?.branchName ?: "Lagos Cathedral HQ")
      HorizontalDivider(color = FpmTheme.cardBorder, modifier = Modifier.padding(vertical = 8.dp))

      MinistryDetailRow(label = "Ministry Role", value = user?.roleName ?: "Member")
      HorizontalDivider(color = FpmTheme.cardBorder, modifier = Modifier.padding(vertical = 8.dp))

      if (user?.isWorker == true) {
        MinistryDetailRow(label = "Department", value = user.workerDetails?.departmentName ?: "Worker")
        HorizontalDivider(color = FpmTheme.cardBorder, modifier = Modifier.padding(vertical = 8.dp))

        MinistryDetailRow(label = "Position", value = user.workerDetails?.positionName ?: "Member")
        HorizontalDivider(color = FpmTheme.cardBorder, modifier = Modifier.padding(vertical = 8.dp))

        MinistryDetailRow(label = "Worker ID Code", value = user.workerDetails?.workerCode ?: "FPM-0001")
      } else {
        MinistryDetailRow(label = "Worker Status", value = "Regular Congregation Member")
      }
    }
  }
}

@Composable
fun MinistryDetailRow(label: String, value: String) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
  ) {
    Text(
      text = label,
      fontSize = 12.sp,
      color = FpmTheme.textSecondary
    )
    Text(
      text = value,
      fontSize = 13.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTheme.textPrimary
    )
  }
}

data class ProfileOptionItem(
  val icon: ImageVector,
  val title: String,
  val subtitle: String,
  val onClick: () -> Unit
)

@Composable
fun OptionsGroupCard(items: List<ProfileOptionItem>) {
  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Column {
      items.forEachIndexed { index, item ->
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = item.onClick)
            .padding(vertical = 8.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(
            modifier = Modifier
              .size(38.dp)
              .clip(CircleShape)
              .background(FpmTheme.surfaceTonal),
            contentAlignment = Alignment.Center
          ) {
            Icon(item.icon, contentDescription = null, tint = FpmTheme.royalBlue, modifier = Modifier.size(20.dp))
          }

          Spacer(modifier = Modifier.width(14.dp))

          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = item.title,
              fontSize = 13.sp,
              fontWeight = FontWeight.Bold,
              color = FpmTheme.textPrimary
            )
            Text(
              text = item.subtitle,
              fontSize = 11.sp,
              color = FpmTheme.textSecondary
            )
          }

          Icon(Icons.Default.ChevronRight, contentDescription = null, tint = FpmTheme.textMuted)
        }

        if (index < items.size - 1) {
          HorizontalDivider(color = FpmTheme.cardBorder, modifier = Modifier.padding(vertical = 4.dp))
        }
      }
    }
  }
}

@Composable
fun ThemeAppearanceCard() {
  val currentMode by ThemeManager.themeMode.collectAsState()

  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Column {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        Box(
          modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(if (FpmTheme.isDark) FpmGold.copy(alpha = 0.2f) else FpmRoyalBlue.copy(alpha = 0.12f)),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = if (FpmTheme.isDark) Icons.Default.DarkMode else Icons.Default.LightMode,
            contentDescription = null,
            tint = if (FpmTheme.isDark) FpmGold else FpmRoyalBlue,
            modifier = Modifier.size(20.dp)
          )
        }
        Column {
          Text(
            text = "App Theme & Appearance",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = FpmTheme.textPrimary
          )
          Text(
            text = "Switch between Dark Mode, Light Mode, or Device System",
            fontSize = 11.sp,
            color = FpmTheme.textSecondary
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        ThemeOptionButton(
          title = "System",
          icon = Icons.Default.BrightnessAuto,
          isSelected = currentMode == ThemeMode.SYSTEM,
          modifier = Modifier.weight(1f),
          onClick = { ThemeManager.setThemeMode(ThemeMode.SYSTEM) }
        )
        ThemeOptionButton(
          title = "Light",
          icon = Icons.Default.LightMode,
          isSelected = currentMode == ThemeMode.LIGHT,
          modifier = Modifier.weight(1f),
          onClick = { ThemeManager.setThemeMode(ThemeMode.LIGHT) }
        )
        ThemeOptionButton(
          title = "Dark",
          icon = Icons.Default.DarkMode,
          isSelected = currentMode == ThemeMode.DARK,
          modifier = Modifier.weight(1f),
          onClick = { ThemeManager.setThemeMode(ThemeMode.DARK) }
        )
      }
    }
  }
}

@Composable
fun ThemeOptionButton(
  title: String,
  icon: ImageVector,
  isSelected: Boolean,
  modifier: Modifier = Modifier,
  onClick: () -> Unit
) {
  val isDark = FpmTheme.isDark
  val selectedBg = if (isDark) FpmGold else FpmNavyDark
  val selectedContent = if (isDark) FpmNavyDeep else FpmSurfaceWhite
  val unselectedBg = FpmTheme.surfaceTonal
  val unselectedContent = FpmTheme.textSecondary

  Surface(
    modifier = modifier
      .clip(RoundedCornerShape(12.dp))
      .clickable(onClick = onClick),
    shape = RoundedCornerShape(12.dp),
    color = if (isSelected) selectedBg else unselectedBg,
    border = androidx.compose.foundation.BorderStroke(
      1.dp,
      if (isSelected) (if (isDark) FpmGold else FpmNavyDark) else FpmTheme.borderLight
    )
  ) {
    Column(
      modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center
    ) {
      Icon(
        imageVector = icon,
        contentDescription = title,
        tint = if (isSelected) selectedContent else unselectedContent,
        modifier = Modifier.size(20.dp)
      )
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        text = title,
        fontSize = 12.sp,
        fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
        color = if (isSelected) selectedContent else unselectedContent
      )
    }
  }
}

