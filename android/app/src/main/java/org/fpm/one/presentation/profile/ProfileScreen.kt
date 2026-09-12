package org.fpm.one.presentation.profile

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import org.fpm.one.R
import org.fpm.one.core.security.SessionManager
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.UserSession
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.FpmTopBar

@Composable
fun ProfileScreen(
  onNavigateToWorkerHub: () -> Unit,
  onNavigateToNotifications: () -> Unit,
  onLogout: () -> Unit
) {
  val user = remember { SessionManager.getUserSession() }
  var showLogoutConfirm by remember { mutableStateOf(false) }

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
        .background(FpmSlateBg),
      contentPadding = PaddingValues(16.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      // 1. User Profile Header Card
      item {
        ProfileHeaderCard(user = user)
      }

      // 2. Worker Hub Quick Access (for workers or pastors)
      if (user?.isWorker == true || user?.isAdmin == true) {
        item {
          WorkerHubEntryBanner(
            workerCode = user?.workerDetails?.workerCode ?: "FPM-0001",
            department = user?.workerDetails?.departmentName ?: "Ministry Worker",
            onClick = onNavigateToWorkerHub
          )
        }
      }

      // 3. Ministry Details Card
      item {
        MinistryDetailsCard(user = user)
      }

      // 4. General Options & Quick Navigation
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
              icon = Icons.Default.Church,
              title = "About Faith Preachers Ministry",
              subtitle = "Global vision, tenets of faith, and leadership",
              onClick = {}
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
            text = "Log Out from FPM ONE",
            onClick = { showLogoutConfirm = true },
            containerColor = FpmCrimson,
            icon = Icons.Default.Logout,
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
              contentDescription = "Faith Preachers Ministry Emblem",
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
            color = FpmTextPrimary,
            letterSpacing = 0.5.sp
          )
          Text(
            text = "Jeremiah 1:8 • FPM ONE Platform v1.0.0",
            fontSize = 10.sp,
            color = FpmTextMuted
          )
          Spacer(modifier = Modifier.height(16.dp))
        }
      }
    }
  }

  if (showLogoutConfirm) {
    AlertDialog(
      onDismissRequest = { showLogoutConfirm = false },
      containerColor = FpmSurfaceWhite,
      shape = RoundedCornerShape(18.dp),
      title = { Text("Confirm Sign Out", fontWeight = FontWeight.Bold) },
      text = { Text("Are you sure you want to log out of your FPM ONE account on this device?") },
      confirmButton = {
        Button(
          onClick = {
            showLogoutConfirm = false
            SessionManager.clearSession()
            onLogout()
          },
          colors = ButtonDefaults.buttonColors(containerColor = FpmCrimson),
          shape = RoundedCornerShape(10.dp)
        ) {
          Text("Sign Out")
        }
      },
      dismissButton = {
        TextButton(onClick = { showLogoutConfirm = false }) {
          Text("Cancel", color = FpmTextSecondary)
        }
      }
    )
  }
}

@Composable
fun ProfileHeaderCard(user: UserSession?) {
  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Box(
        modifier = Modifier
          .size(68.dp)
          .clip(CircleShape)
          .background(
            Brush.linearGradient(
              colors = listOf(FpmNavyDark, FpmRoyalBlue)
            )
          )
          .border(2.dp, FpmGold, CircleShape),
        contentAlignment = Alignment.Center
      ) {
        Text(
          text = (user?.firstName?.take(1) ?: "F") + (user?.lastName?.take(1) ?: "P"),
          fontSize = 24.sp,
          fontWeight = FontWeight.Black,
          color = FpmGoldLight
        )
      }

      Spacer(modifier = Modifier.width(16.dp))

      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = user?.fullName ?: "Faith Preachers Member",
          fontSize = 17.sp,
          fontWeight = FontWeight.Black,
          color = FpmTextPrimary
        )

        Spacer(modifier = Modifier.height(2.dp))

        Text(
          text = user?.email ?: "",
          fontSize = 12.sp,
          color = FpmTextSecondary
        )
        Text(
          text = user?.phone ?: "",
          fontSize = 12.sp,
          color = FpmTextMuted
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
        Icon(Icons.Default.Church, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(18.dp))
        Text(
          text = "Ministry Assignment",
          fontSize = 15.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )
      }

      Spacer(modifier = Modifier.height(12.dp))

      MinistryDetailRow(label = "Church Branch", value = user?.branchName ?: "Lagos Cathedral HQ")
      Divider(color = FpmBorderLight, modifier = Modifier.padding(vertical = 8.dp))

      MinistryDetailRow(label = "Ministry Role", value = user?.roleName ?: "Member")
      Divider(color = FpmBorderLight, modifier = Modifier.padding(vertical = 8.dp))

      if (user?.isWorker == true) {
        MinistryDetailRow(label = "Department", value = user.workerDetails?.departmentName ?: "Worker")
        Divider(color = FpmBorderLight, modifier = Modifier.padding(vertical = 8.dp))

        MinistryDetailRow(label = "Position", value = user.workerDetails?.positionName ?: "Member")
        Divider(color = FpmBorderLight, modifier = Modifier.padding(vertical = 8.dp))

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
      color = FpmTextSecondary
    )
    Text(
      text = value,
      fontSize = 13.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextPrimary
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
              .background(FpmSlateBg),
            contentAlignment = Alignment.Center
          ) {
            Icon(item.icon, contentDescription = null, tint = FpmRoyalBlue, modifier = Modifier.size(20.dp))
          }

          Spacer(modifier = Modifier.width(14.dp))

          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = item.title,
              fontSize = 13.sp,
              fontWeight = FontWeight.Bold,
              color = FpmTextPrimary
            )
            Text(
              text = item.subtitle,
              fontSize = 11.sp,
              color = FpmTextSecondary
            )
          }

          Icon(Icons.Default.ChevronRight, contentDescription = null, tint = FpmTextMuted)
        }

        if (index < items.size - 1) {
          Divider(color = FpmBorderLight, modifier = Modifier.padding(vertical = 4.dp))
        }
      }
    }
  }
}
