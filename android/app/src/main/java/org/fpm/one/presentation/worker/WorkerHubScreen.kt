package org.fpm.one.presentation.worker

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.res.painterResource
import org.fpm.one.R
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import org.fpm.one.core.security.BiometricHelper
import org.fpm.one.core.theme.*
import org.fpm.one.data.model.AttendanceRecordItem
import org.fpm.one.data.model.ServiceScheduleItem
import org.fpm.one.data.model.UserSession
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard
import org.fpm.one.presentation.components.LoadingSpinner

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkerHubScreen(
  viewModel: WorkerViewModel,
  onNavigateBack: (() -> Unit)? = null
) {
  val state by viewModel.state.collectAsState()
  val context = LocalContext.current
  var showClockInDialog by remember { mutableStateOf(false) }

  Scaffold(
    topBar = {
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
                text = "Worker Portal & Attendance",
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = FpmSurfaceWhite
              )
              Text(
                text = "Faith Preachers Ministry • Authorized Workers",
                fontSize = 11.sp,
                color = FpmGoldLight
              )
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
        actions = {
          IconButton(onClick = { viewModel.loadWorkerHub() }) {
            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = FpmGold)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(
          containerColor = FpmNavy
        )
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
      // 1. Success or Error Alerts
      state.successMessage?.let { msg ->
        item {
          Surface(
            color = FpmSuccessBg,
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
          ) {
            Row(
              modifier = Modifier.padding(14.dp),
              verticalAlignment = Alignment.CenterVertically
            ) {
              Icon(Icons.Default.CheckCircle, contentDescription = null, tint = FpmSuccess)
              Spacer(modifier = Modifier.width(10.dp))
              Text(
                text = msg,
                color = FpmSuccess,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f)
              )
              IconButton(onClick = { viewModel.clearMessages() }, modifier = Modifier.size(24.dp)) {
                Icon(Icons.Default.Close, contentDescription = "Close", tint = FpmSuccess)
              }
            }
          }
        }
      }

      state.error?.let { err ->
        item {
          Surface(
            color = FpmErrorBg,
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
          ) {
            Row(
              modifier = Modifier.padding(14.dp),
              verticalAlignment = Alignment.CenterVertically
            ) {
              Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = FpmCrimson)
              Spacer(modifier = Modifier.width(10.dp))
              Text(
                text = err,
                color = FpmCrimson,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f)
              )
              IconButton(onClick = { viewModel.clearMessages() }, modifier = Modifier.size(24.dp)) {
                Icon(Icons.Default.Close, contentDescription = "Close", tint = FpmCrimson)
              }
            }
          }
        }
      }

      // 2. Digital Worker ID Badge Card
      item {
        DigitalWorkerIdBadge(user = state.user)
      }

      // 3. Live Attendance Clock-In / Clock-Out Controller
      item {
        AttendanceStatusCard(
          state = state,
          onClockInClick = { showClockInDialog = true },
          onClockOutClick = { viewModel.clockOut() },
          onSelectService = { viewModel.selectService(it) }
        )
      }

      // 4. Attendance Statistics Summary Matrix
      item {
        AttendanceSummarySection(summary = state.summary)
      }

      // 5. Recent Records Header
      item {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = "My Attendance History",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = FpmTextPrimary
          )
          Text(
            text = "${state.records.size} records",
            fontSize = 12.sp,
            color = FpmTextMuted
          )
        }
      }

      // 6. Attendance Records List
      if (state.isLoading && state.records.isEmpty()) {
        item {
          LoadingSpinner(modifier = Modifier.fillMaxWidth().height(100.dp))
        }
      } else if (state.records.isEmpty()) {
        item {
          Surface(
            color = FpmSurfaceWhite,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
          ) {
            Column(
              modifier = Modifier.padding(24.dp),
              horizontalAlignment = Alignment.CenterHorizontally
            ) {
              Icon(Icons.Default.EventAvailable, contentDescription = null, tint = FpmTextMuted, modifier = Modifier.size(36.dp))
              Spacer(modifier = Modifier.height(8.dp))
              Text(
                text = "No attendance records yet",
                fontSize = 14.sp,
                color = FpmTextSecondary,
                fontWeight = FontWeight.Medium
              )
              Text(
                text = "Clock in during church services to log your attendance.",
                fontSize = 12.sp,
                color = FpmTextMuted
              )
            }
          }
        }
      } else {
        items(state.records) { record ->
          AttendanceRecordRow(record = record)
        }
      }
    }
  }

  // Clock In Dialog
  if (showClockInDialog) {
    ClockInModalDialog(
      services = state.services,
      selectedService = state.selectedService,
      onSelectService = { viewModel.selectService(it) },
      onDismiss = { showClockInDialog = false },
      onBiometricClockIn = {
        if (context is FragmentActivity) {
          BiometricHelper.authenticate(
            activity = context,
            title = "Worker Clock-In",
            subtitle = "Verify identity to confirm attendance",
            onSuccess = {
              viewModel.clockIn(method = "biometric") {
                showClockInDialog = false
              }
            },
            onError = { errMsg ->
              // Fallback or display error
            }
          )
        } else {
          // Direct fallback
          viewModel.clockIn(method = "biometric") {
            showClockInDialog = false
          }
        }
      },
      onPinClockIn = { pin ->
        viewModel.clockIn(method = "pin", pin = pin) {
          showClockInDialog = false
        }
      },
      onQrClockIn = {
        viewModel.clockIn(method = "qr_scan") {
          showClockInDialog = false
        }
      }
    )
  }
}

@Composable
fun DigitalWorkerIdBadge(user: UserSession?) {
  val workerCode = user?.workerDetails?.workerCode ?: "FPM-0001"
  val deptName = user?.workerDetails?.departmentName ?: "Ministry Worker"
  val position = user?.workerDetails?.positionName ?: "Member"
  val branchName = user?.branchName ?: "Faith Preachers Ministry"
  val role = user?.roleName ?: "Worker"

  Surface(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(16.dp))
      .border(1.5.dp, FpmGold.copy(alpha = 0.5f), RoundedCornerShape(16.dp)),
    color = Color.Transparent
  ) {
    Box(
      modifier = Modifier
        .background(
          Brush.linearGradient(
            colors = listOf(
              FpmNavy,
              Color(0xFF0F2338),
              Color(0xFF0A1926)
            )
          )
        )
        .padding(18.dp)
    ) {
      Column {
        // Header
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Image(
              painter = painterResource(id = R.drawable.church_logo),
              contentDescription = "FPM Official Seal",
              modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .border(1.dp, FpmGold, CircleShape)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column {
              Text(
                text = "FAITH PREACHERS MINISTRY",
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                color = FpmSurfaceWhite,
                letterSpacing = 1.sp
              )
              Text(
                text = "OFFICIAL WORKER CREDENTIAL",
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = FpmGoldLight,
                letterSpacing = 0.5.sp
              )
            }
          }

          Surface(
            color = FpmGold.copy(alpha = 0.15f),
            shape = RoundedCornerShape(6.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, FpmGold.copy(alpha = 0.4f))
          ) {
            Text(
              text = "ACTIVE",
              color = FpmGoldLight,
              fontSize = 10.sp,
              fontWeight = FontWeight.Black,
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
            )
          }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Worker Details Row with QR pattern
        Row(
          modifier = Modifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically
        ) {
          // Avatar
          Box(
            modifier = Modifier
              .size(64.dp)
              .clip(RoundedCornerShape(12.dp))
              .background(FpmSurfaceWhite.copy(alpha = 0.1f))
              .border(1.5.dp, FpmGold, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
          ) {
            Text(
              text = (user?.firstName?.take(1) ?: "W") + (user?.lastName?.take(1) ?: "K"),
              fontSize = 22.sp,
              fontWeight = FontWeight.Black,
              color = FpmGoldLight
            )
          }

          Spacer(modifier = Modifier.width(14.dp))

          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = user?.fullName ?: "Faith Preachers Worker",
              fontSize = 16.sp,
              fontWeight = FontWeight.Bold,
              color = FpmSurfaceWhite
            )
            Text(
              text = "$position • $deptName",
              fontSize = 12.sp,
              fontWeight = FontWeight.Medium,
              color = FpmGoldLight
            )
            Text(
              text = branchName,
              fontSize = 11.sp,
              color = FpmSurfaceWhite.copy(alpha = 0.7f)
            )
          }

          // Mock QR Graphic
          Box(
            modifier = Modifier
              .size(54.dp)
              .clip(RoundedCornerShape(8.dp))
              .background(FpmSurfaceWhite)
              .padding(4.dp),
            contentAlignment = Alignment.Center
          ) {
            QrCodeCanvas()
          }
        }

        Spacer(modifier = Modifier.height(14.dp))
        Divider(color = FpmSurfaceWhite.copy(alpha = 0.15f))
        Spacer(modifier = Modifier.height(10.dp))

        // Card Footer
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Column {
            Text(
              text = "WORKER ID",
              fontSize = 9.sp,
              fontWeight = FontWeight.Bold,
              color = FpmSurfaceWhite.copy(alpha = 0.6f),
              letterSpacing = 0.5.sp
            )
            Text(
              text = workerCode,
              fontSize = 14.sp,
              fontWeight = FontWeight.Black,
              color = FpmGoldLight,
              fontFamily = FontFamily.Monospace
            )
          }

          Column(horizontalAlignment = Alignment.End) {
            Text(
              text = "MINISTRY ROLE",
              fontSize = 9.sp,
              fontWeight = FontWeight.Bold,
              color = FpmSurfaceWhite.copy(alpha = 0.6f),
              letterSpacing = 0.5.sp
            )
            Text(
              text = role,
              fontSize = 13.sp,
              fontWeight = FontWeight.Bold,
              color = FpmSurfaceWhite
            )
          }
        }
      }
    }
  }
}

@Composable
fun QrCodeCanvas() {
  Canvas(modifier = Modifier.fillMaxSize()) {
    val step = size.width / 5f
    val dark = Color(0xFF0F1E2E)

    // Corner squares
    drawRect(color = dark, topLeft = Offset(0f, 0f), size = Size(step * 2, step * 2))
    drawRect(color = Color.White, topLeft = Offset(step * 0.5f, step * 0.5f), size = Size(step, step))

    drawRect(color = dark, topLeft = Offset(step * 3, 0f), size = Size(step * 2, step * 2))
    drawRect(color = Color.White, topLeft = Offset(step * 3.5f, step * 0.5f), size = Size(step, step))

    drawRect(color = dark, topLeft = Offset(0f, step * 3), size = Size(step * 2, step * 2))
    drawRect(color = Color.White, topLeft = Offset(step * 0.5f, step * 3.5f), size = Size(step, step))

    // Center data dots
    drawRect(color = dark, topLeft = Offset(step * 2, step * 2), size = Size(step, step))
    drawRect(color = dark, topLeft = Offset(step * 3, step * 3), size = Size(step, step))
    drawRect(color = dark, topLeft = Offset(step * 4, step * 2), size = Size(step, step))
  }
}

@Composable
fun AttendanceStatusCard(
  state: WorkerHubUiState,
  onClockInClick: () -> Unit,
  onClockOutClick: () -> Unit,
  onSelectService: (ServiceScheduleItem) -> Unit
) {
  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Column {
      val isClockedIn = state.activeRecord != null

      if (isClockedIn) {
        val record = state.activeRecord!!
        val isLate = record.status.lowercase() == "late"

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
              modifier = Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(if (isLate) FpmLate else FpmSuccess)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              text = "CURRENTLY CLOCKED IN",
              fontSize = 12.sp,
              fontWeight = FontWeight.Black,
              color = if (isLate) FpmLate else FpmSuccess,
              letterSpacing = 0.5.sp
            )
          }

          Surface(
            color = if (isLate) FpmLate.copy(alpha = 0.15f) else FpmSuccess.copy(alpha = 0.15f),
            shape = RoundedCornerShape(6.dp)
          ) {
            Text(
              text = if (isLate) "LATE ARRIVAL" else "ON TIME (PRESENT)",
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold,
              color = if (isLate) FpmLate else FpmSuccess,
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
            )
          }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
          text = record.serviceName ?: "Church Service",
          fontSize = 16.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )
        Text(
          text = "Clocked in at: ${record.clockInTime ?: "Today"} (Method: ${record.clockInMethod ?: "Biometric"})",
          fontSize = 12.sp,
          color = FpmTextSecondary
        )

        Spacer(modifier = Modifier.height(14.dp))

        FpmButton(
          text = if (state.isLoading) "Processing Clock-Out..." else "Clock Out Now",
          onClick = onClockOutClick,
          enabled = !state.isLoading,
          containerColor = FpmCrimson,
          modifier = Modifier.fillMaxWidth()
        )
      } else {
        // Not clocked in
        Text(
          text = "Service Attendance Check-In",
          fontSize = 16.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )
        Text(
          text = "Select active service and authenticate via Biometric, PIN, or QR badge.",
          fontSize = 12.sp,
          color = FpmTextSecondary
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Service Selector Chips
        if (state.services.isNotEmpty()) {
          Text("Select Service:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = FpmTextPrimary)
          Spacer(modifier = Modifier.height(6.dp))
          Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            state.services.forEach { srv ->
              val isSelected = state.selectedService?.id == srv.id
              FilterChip(
                selected = isSelected,
                onClick = { onSelectService(srv) },
                label = {
                  Text("${srv.name} (${srv.startTime})", fontSize = 12.sp)
                },
                colors = FilterChipDefaults.filterChipColors(
                  selectedContainerColor = FpmNavy,
                  selectedLabelColor = FpmSurfaceWhite
                )
              )
            }
          }
          Spacer(modifier = Modifier.height(14.dp))
        }

        FpmButton(
          text = if (state.isLoading) "Connecting..." else "Clock In to Service",
          onClick = onClockInClick,
          enabled = !state.isLoading,
          modifier = Modifier.fillMaxWidth()
        )
      }
    }
  }
}

@Composable
fun AttendanceSummarySection(summary: org.fpm.one.data.model.AttendanceSummary) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.spacedBy(10.dp)
  ) {
    StatMiniCard(
      title = "Attendance",
      value = "${summary.rate}%",
      color = FpmNavy,
      modifier = Modifier.weight(1f)
    )
    StatMiniCard(
      title = "Present (✓)",
      value = "${summary.present}",
      color = FpmSuccess,
      modifier = Modifier.weight(1f)
    )
    StatMiniCard(
      title = "Late (L)",
      value = "${summary.late}",
      color = FpmLate,
      modifier = Modifier.weight(1f)
    )
    StatMiniCard(
      title = "Total",
      value = "${summary.total}",
      color = FpmGoldDark,
      modifier = Modifier.weight(1f)
    )
  }
}

@Composable
fun StatMiniCard(title: String, value: String, color: Color, modifier: Modifier = Modifier) {
  Surface(
    color = FpmSurfaceWhite,
    shape = RoundedCornerShape(10.dp),
    shadowElevation = 0.5.dp,
    modifier = modifier
  ) {
    Column(
      modifier = Modifier.padding(10.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Text(text = title, fontSize = 10.sp, color = FpmTextMuted, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(4.dp))
      Text(text = value, fontSize = 16.sp, color = color, fontWeight = FontWeight.Black)
    }
  }
}

@Composable
fun AttendanceRecordRow(record: AttendanceRecordItem) {
  Surface(
    color = FpmSurfaceWhite,
    shape = RoundedCornerShape(10.dp),
    shadowElevation = 0.5.dp,
    modifier = Modifier.fillMaxWidth()
  ) {
    Row(
      modifier = Modifier
        .padding(14.dp)
        .fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = record.serviceName ?: "Church Service",
          fontSize = 14.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
          text = "${record.serviceDate} • ${record.clockInTime ?: "--:--"} to ${record.clockOutTime ?: "In Progress"}",
          fontSize = 11.sp,
          color = FpmTextSecondary
        )
        if (record.durationMinutes != null && record.durationMinutes > 0) {
          Text(
            text = "Duration: ${record.durationMinutes} minutes",
            fontSize = 11.sp,
            color = FpmGoldDark,
            fontWeight = FontWeight.Medium
          )
        }
      }

      val (badgeBg, badgeText, label) = when (record.status.lowercase()) {
        "present" -> Triple(FpmSuccessBg, FpmSuccess, "✓ Present")
        "late" -> Triple(FpmLateBg, FpmLate, "L Late")
        "excused" -> Triple(FpmGoldLight.copy(alpha = 0.3f), FpmGoldDark, "E Excused")
        else -> Triple(FpmErrorBg, FpmCrimson, "A Absent")
      }

      Surface(
        color = badgeBg,
        shape = RoundedCornerShape(6.dp)
      ) {
        Text(
          text = label,
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
          color = badgeText,
          modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClockInModalDialog(
  services: List<ServiceScheduleItem>,
  selectedService: ServiceScheduleItem?,
  onSelectService: (ServiceScheduleItem) -> Unit,
  onDismiss: () -> Unit,
  onBiometricClockIn: () -> Unit,
  onPinClockIn: (String) -> Unit,
  onQrClockIn: () -> Unit
) {
  var selectedTab by remember { mutableIntStateOf(0) }
  var pinInput by remember { mutableStateOf("") }
  val tabs = listOf("Biometric / Passkey", "Worker PIN", "QR Badge")

  AlertDialog(
    onDismissRequest = onDismiss,
    containerColor = FpmSurfaceWhite,
    title = {
      Column {
        Text(
          text = "Worker Attendance Verification",
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )
        Text(
          text = "Target: ${selectedService?.name ?: "Current Service"}",
          fontSize = 12.sp,
          color = FpmGoldDark
        )
      }
    },
    text = {
      Column(modifier = Modifier.fillMaxWidth()) {
        TabRow(
          selectedTabIndex = selectedTab,
          containerColor = FpmSlateBg,
          contentColor = FpmNavy
        ) {
          tabs.forEachIndexed { index, title ->
            Tab(
              selected = selectedTab == index,
              onClick = { selectedTab = index },
              text = { Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
            )
          }
        }

        Spacer(modifier = Modifier.height(16.dp))

        when (selectedTab) {
          0 -> {
            // Biometric
            Column(
              modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
              horizontalAlignment = Alignment.CenterHorizontally
            ) {
              Box(
                modifier = Modifier
                  .size(72.dp)
                  .clip(CircleShape)
                  .background(FpmNavy.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
              ) {
                Icon(
                  Icons.Default.Fingerprint,
                  contentDescription = "Fingerprint",
                  tint = FpmNavy,
                  modifier = Modifier.size(44.dp)
                )
              }
              Spacer(modifier = Modifier.height(12.dp))
              Text(
                text = "Biometric & Passkey Prompt",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTextPrimary
              )
              Text(
                text = "Touch device fingerprint scanner or passkey prompt to verify presence.",
                fontSize = 11.sp,
                color = FpmTextSecondary,
                modifier = Modifier.padding(horizontal = 12.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
              )
              Spacer(modifier = Modifier.height(16.dp))
              FpmButton(
                text = "Scan Fingerprint / Face",
                onClick = onBiometricClockIn,
                modifier = Modifier.fillMaxWidth()
              )
            }
          }
          1 -> {
            // PIN
            Column(
              modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
              horizontalAlignment = Alignment.CenterHorizontally
            ) {
              OutlinedTextField(
                value = pinInput,
                onValueChange = { if (it.length <= 4) pinInput = it },
                label = { Text("4-Digit Worker PIN") },
                placeholder = { Text("e.g. 1234") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
              )
              Spacer(modifier = Modifier.height(6.dp))
              Text(
                text = "Use the PIN assigned during worker onboarding.",
                fontSize = 11.sp,
                color = FpmTextMuted
              )
              Spacer(modifier = Modifier.height(16.dp))
              FpmButton(
                text = "Verify PIN & Clock In",
                onClick = { if (pinInput.isNotBlank()) onPinClockIn(pinInput) },
                enabled = pinInput.length >= 4,
                modifier = Modifier.fillMaxWidth()
              )
            }
          }
          2 -> {
            // QR Scan
            Column(
              modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
              horizontalAlignment = Alignment.CenterHorizontally
            ) {
              Box(
                modifier = Modifier
                  .size(80.dp)
                  .clip(RoundedCornerShape(12.dp))
                  .background(FpmNavy.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
              ) {
                Icon(
                  Icons.Default.QrCodeScanner,
                  contentDescription = "QR Scanner",
                  tint = FpmNavy,
                  modifier = Modifier.size(48.dp)
                )
              }
              Spacer(modifier = Modifier.height(12.dp))
              Text(
                text = "Station QR Scanner",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = FpmTextPrimary
              )
              Text(
                text = "Scan the service attendance QR badge displayed at the church entrance terminal.",
                fontSize = 11.sp,
                color = FpmTextSecondary,
                modifier = Modifier.padding(horizontal = 12.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
              )
              Spacer(modifier = Modifier.height(16.dp))
              FpmButton(
                text = "Scan Entrance Station QR",
                onClick = onQrClockIn,
                modifier = Modifier.fillMaxWidth()
              )
            }
          }
        }
      }
    },
    confirmButton = {},
    dismissButton = {
      TextButton(onClick = onDismiss) {
        Text("Cancel", color = FpmTextSecondary)
      }
    }
  )
}
