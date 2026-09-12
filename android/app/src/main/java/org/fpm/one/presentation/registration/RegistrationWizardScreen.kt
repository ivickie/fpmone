package org.fpm.one.presentation.registration

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import kotlinx.coroutines.launch
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import org.fpm.one.R
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import org.fpm.one.core.theme.*
import org.fpm.one.presentation.components.FpmButton
import org.fpm.one.presentation.components.FpmCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegistrationWizardScreen(
  viewModel: RegistrationViewModel,
  onNavigateBack: () -> Unit,
  onRegistrationComplete: () -> Unit
) {
  val state by viewModel.state.collectAsState()

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
                .size(28.dp)
                .clip(CircleShape)
            )
            Text(
              text = "Member Registration",
              fontSize = 17.sp,
              fontWeight = FontWeight.Bold,
              color = FpmTextPrimary
            )
          }
        },
        navigationIcon = {
          IconButton(onClick = {
            if (state.currentStep > 1) viewModel.prevStep() else onNavigateBack()
          }) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = FpmTextPrimary)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = FpmSurfaceWhite)
      )
    }
  ) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .background(FpmSlateBg)
        .padding(padding)
        .padding(horizontal = 20.dp, vertical = 12.dp)
        .verticalScroll(rememberScrollState())
    ) {
      // Step Progress Indicator
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(bottom = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        listOf("Account", "Church", "Personal", "Review").forEachIndexed { idx, label ->
          val stepNum = idx + 1
          val isActive = state.currentStep >= stepNum
          val isCurrent = state.currentStep == stepNum

          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
              modifier = Modifier
                .size(28.dp)
                .background(
                  color = if (isCurrent) FpmRoyalBlue else if (isActive) FpmSuccess else FpmCardBorder,
                  shape = RoundedCornerShape(14.dp)
                ),
              contentAlignment = Alignment.Center
            ) {
              Text(
                text = if (isActive && !isCurrent) "✓" else "$stepNum",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = if (isActive) FpmSurfaceWhite else FpmTextSecondary
              )
            }
            Text(
              text = label,
              fontSize = 10.sp,
              fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
              color = if (isCurrent) FpmRoyalBlue else FpmTextSecondary,
              modifier = Modifier.padding(top = 4.dp)
            )
          }
        }
      }

      if (state.error != null) {
        Surface(
          modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 14.dp),
          color = FpmErrorBg,
          shape = RoundedCornerShape(10.dp)
        ) {
          Text(
            text = state.error!!,
            color = FpmError,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(10.dp)
          )
        }
      }

      // Steps Content
      when (state.currentStep) {
        1 -> Step1Account(state, viewModel)
        2 -> Step2ChurchInfo(state, viewModel)
        3 -> Step3PersonalInfo(state, viewModel)
        4 -> Step4Review(state, viewModel, onRegistrationComplete)
      }
    }
  }
}

@Composable
private fun Step1Account(state: RegistrationFormState, viewModel: RegistrationViewModel) {
  var firstName by remember { mutableStateOf(state.firstName) }
  var middleName by remember { mutableStateOf(state.middleName) }
  var lastName by remember { mutableStateOf(state.lastName) }
  var phone by remember { mutableStateOf(state.phone) }
  var email by remember { mutableStateOf(state.email) }
  var password by remember { mutableStateOf(state.password) }

  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Text(
      text = "Step 1 — Account Setup",
      fontSize = 16.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextPrimary
    )
    Text(
      text = "Enter your primary login details and legal names",
      fontSize = 12.sp,
      color = FpmTextSecondary,
      modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
    )

    OutlinedTextField(
      value = firstName,
      onValueChange = { 
        firstName = it
        viewModel.updateStep1(it, middleName, lastName, phone, email, password)
      },
      label = { Text("First Name *", fontSize = 12.sp) },
      isError = state.firstNameError != null,
      supportingText = { state.firstNameError?.let { Text(it, color = FpmError, fontSize = 11.sp) } },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true
    )

    Spacer(modifier = Modifier.height(6.dp))

    OutlinedTextField(
      value = middleName,
      onValueChange = { 
        middleName = it
        viewModel.updateStep1(firstName, it, lastName, phone, email, password)
      },
      label = { Text("Middle Name", fontSize = 12.sp) },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true
    )

    Spacer(modifier = Modifier.height(6.dp))

    OutlinedTextField(
      value = lastName,
      onValueChange = { 
        lastName = it
        viewModel.updateStep1(firstName, middleName, it, phone, email, password)
      },
      label = { Text("Last Name *", fontSize = 12.sp) },
      isError = state.lastNameError != null,
      supportingText = { state.lastNameError?.let { Text(it, color = FpmError, fontSize = 11.sp) } },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true
    )

    Spacer(modifier = Modifier.height(6.dp))

    OutlinedTextField(
      value = phone,
      onValueChange = { 
        phone = it
        viewModel.updateStep1(firstName, middleName, lastName, it, email, password)
      },
      label = { Text("Phone Number *", fontSize = 12.sp) },
      isError = state.phoneError != null,
      supportingText = { 
        if (state.phoneError != null) {
          Text(state.phoneError!!, color = FpmError, fontSize = 11.sp)
        } else {
          Text("Format: e.g. +2348012345678 or 08012345678", fontSize = 10.sp, color = FpmTextSecondary)
        }
      },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true,
      keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
    )

    Spacer(modifier = Modifier.height(6.dp))

    OutlinedTextField(
      value = email,
      onValueChange = { 
        email = it
        viewModel.updateStep1(firstName, middleName, lastName, phone, it, password)
      },
      label = { Text("Email Address *", fontSize = 12.sp) },
      isError = state.emailError != null,
      supportingText = { state.emailError?.let { Text(it, color = FpmError, fontSize = 11.sp) } },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true,
      keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
    )

    Spacer(modifier = Modifier.height(6.dp))

    OutlinedTextField(
      value = password,
      onValueChange = { 
        password = it
        viewModel.updateStep1(firstName, middleName, lastName, phone, email, it)
      },
      label = { Text("Create Password *", fontSize = 12.sp) },
      isError = state.passwordError != null,
      supportingText = { 
        if (state.passwordError != null) {
          Text(state.passwordError!!, color = FpmError, fontSize = 11.sp)
        } else {
          Text("Minimum 6 characters", fontSize = 10.sp, color = FpmTextSecondary)
        }
      },
      visualTransformation = PasswordVisualTransformation(),
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true
    )

    Spacer(modifier = Modifier.height(20.dp))

    FpmButton(
      text = "Next: Church Info",
      onClick = {
        viewModel.updateStep1(firstName, middleName, lastName, phone, email, password)
        viewModel.nextStep()
      },
      modifier = Modifier.fillMaxWidth()
    )
  }
}

@Composable
private fun Step2ChurchInfo(state: RegistrationFormState, viewModel: RegistrationViewModel) {
  var branchId by remember { mutableStateOf(state.branchId) }
  var roleId by remember { mutableStateOf(state.ministryRoleId) }
  var isWorker by remember { mutableStateOf(state.isWorker) }
  var deptId by remember { mutableStateOf(state.departmentId) }
  var position by remember { mutableStateOf(state.positionName) }

  // Synchronize local states when state changes in ViewModel
  LaunchedEffect(state.ministryRoleId, state.isWorker) {
    roleId = state.ministryRoleId
    isWorker = state.isWorker
  }

  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Text(
      text = "Step 2 — Church Information",
      fontSize = 16.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextPrimary
    )
    Text(
      text = "Select your primary worship branch and ministry role",
      fontSize = 12.sp,
      color = FpmTextSecondary,
      modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
    )

    Text(
      text = "PRIMARY BRANCH / CHAPTER *",
      fontSize = 11.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextSecondary
    )
    if (state.branchError != null) {
      Text(
        text = state.branchError,
        color = FpmError,
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(top = 2.dp)
      )
    }
    Spacer(modifier = Modifier.height(6.dp))

    state.branches.forEach { b ->
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { branchId = b.id }
          .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        RadioButton(
          selected = branchId == b.id,
          onClick = { branchId = b.id }
        )
        Text(text = "${b.name} (${b.city})", fontSize = 13.sp, fontWeight = FontWeight.Medium)
      }
    }

    Spacer(modifier = Modifier.height(16.dp))

    Text(
      text = "MINISTRY ROLE *",
      fontSize = 11.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextSecondary
    )
    if (state.roleError != null) {
      Text(
        text = state.roleError,
        color = FpmError,
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(top = 2.dp)
      )
    }
    Spacer(modifier = Modifier.height(6.dp))

    // Display ALL registration roles (excluding Super Admin)
    state.roles.forEach { r ->
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable {
            roleId = r.id
            viewModel.onRoleSelected(r.id)
            if (r.code == "WORKER") isWorker = true
          }
          .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        RadioButton(
          selected = roleId == r.id,
          onClick = {
            roleId = r.id
            viewModel.onRoleSelected(r.id)
            if (r.code == "WORKER") isWorker = true
          }
        )
        Column {
          Text(text = r.name, fontSize = 13.sp, fontWeight = FontWeight.Medium)
          r.description?.let { desc ->
            Text(text = desc, fontSize = 11.sp, color = FpmTextSecondary)
          }
        }
      }
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Worker Enlistment Switch
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .background(FpmAmberLight.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
        .padding(12.dp),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = "Serve as a Dedicated Worker?",
          fontSize = 13.sp,
          fontWeight = FontWeight.Bold,
          color = FpmTextPrimary
        )
        Text(
          text = "Allows clock-in for services and departmental assignment",
          fontSize = 11.sp,
          color = FpmTextSecondary
        )
      }
      Switch(
        checked = isWorker,
        onCheckedChange = {
          isWorker = it
          viewModel.onWorkerToggled(it)
          roleId = viewModel.state.value.ministryRoleId
        }
      )
    }

    if (isWorker) {
      Spacer(modifier = Modifier.height(16.dp))

      Text(
        text = "DEPARTMENT *",
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = FpmTextSecondary
      )
      if (state.departmentError != null) {
        Text(
          text = state.departmentError,
          color = FpmError,
          fontSize = 11.sp,
          fontWeight = FontWeight.Medium,
          modifier = Modifier.padding(top = 2.dp)
        )
      }
      Spacer(modifier = Modifier.height(6.dp))

      state.departments.forEach { d ->
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clickable { deptId = d.id }
            .padding(vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          RadioButton(
            selected = deptId == d.id,
            onClick = { deptId = d.id }
          )
          Text(text = d.name, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      OutlinedTextField(
        value = position,
        onValueChange = { position = it },
        label = { Text("Department Position (e.g. Vocalist, Camera Operator)", fontSize = 12.sp) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        singleLine = true
      )
    }

    Spacer(modifier = Modifier.height(20.dp))

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      OutlinedButton(
        onClick = { viewModel.prevStep() },
        modifier = Modifier.weight(1f),
        shape = RoundedCornerShape(12.dp)
      ) {
        Text("Back", fontSize = 13.sp)
      }
      FpmButton(
        text = "Next: Personal",
        onClick = {
          viewModel.updateStep2(branchId, roleId, isWorker, deptId, position)
          viewModel.nextStep()
        },
        modifier = Modifier.weight(1f)
      )
    }
  }
}

@Composable
private fun Step3PersonalInfo(state: RegistrationFormState, viewModel: RegistrationViewModel) {
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()
  var gender by remember { mutableStateOf(state.gender) }
  var dob by remember { mutableStateOf(state.dateOfBirth) }
  var address by remember { mutableStateOf(state.residentialAddress) }
  var emName by remember { mutableStateOf(state.emergencyContactName) }
  var emPhone by remember { mutableStateOf(state.emergencyContactPhone) }
  var localPhotoError by remember { mutableStateOf<String?>(null) }

  val photoPickerLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.PickVisualMedia()
  ) { uri ->
    if (uri != null) {
      localPhotoError = null
      val fileName = uri.lastPathSegment ?: "profile_avatar.jpg"
      coroutineScope.launch {
        try {
          val mime = context.contentResolver.getType(uri) ?: "image/jpeg"
          if (!mime.startsWith("image/")) {
            localPhotoError = "Only photo and image files (JPEG, PNG, WEBP) are permitted."
            return@launch
          }
          val inputStream = context.contentResolver.openInputStream(uri)
          val bytes = inputStream?.readBytes() ?: run {
            localPhotoError = "Could not read selected photo data."
            return@launch
          }
          inputStream.close()

          // Strict 1MB ceiling check (1,048,576 bytes)
          val maxBytes = 1024 * 1024
          if (bytes.size > maxBytes) {
            val sizeKb = bytes.size / 1024
            localPhotoError = "Selected photo exceeds 1MB limit (${sizeKb} KB). Please choose an image under 1MB."
            return@launch
          }

          viewModel.uploadProfilePhoto(bytes, fileName, mime)
        } catch (e: Exception) {
          localPhotoError = "Error reading photo: ${e.message}"
        }
      }
    }
  }

  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Text(
      text = "Step 3 — Personal Information",
      fontSize = 16.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextPrimary
    )
    Text(
      text = "Demographic information and optional emergency contact",
      fontSize = 12.sp,
      color = FpmTextSecondary,
      modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
    )

    // PROFILE PICTURE SECTION
    Text(
      text = "PROFILE PICTURE",
      fontSize = 11.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextSecondary
    )
    Spacer(modifier = Modifier.height(8.dp))

    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      // Circular Avatar Preview
      Box(
        modifier = Modifier
          .size(80.dp)
          .clip(CircleShape)
          .background(FpmNavy.copy(alpha = 0.08f))
          .clickable {
            photoPickerLauncher.launch(
              PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
            )
          },
        contentAlignment = Alignment.Center
      ) {
        if (state.profilePictureUrl.isNotBlank()) {
          AsyncImage(
            model = state.profilePictureUrl,
            contentDescription = "Profile Picture",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
          )
        } else {
          Icon(
            imageVector = Icons.Default.Person,
            contentDescription = "No photo",
            modifier = Modifier.size(40.dp),
            tint = FpmTextSecondary
          )
        }

        // Mini camera badge
        Box(
          modifier = Modifier
            .size(24.dp)
            .align(Alignment.BottomEnd)
            .background(FpmRoyalBlue, CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = Icons.Default.CameraAlt,
            contentDescription = "Upload",
            tint = FpmSurfaceWhite,
            modifier = Modifier.size(14.dp)
          )
        }
      }

      Column(modifier = Modifier.weight(1f)) {
        OutlinedButton(
          onClick = {
            photoPickerLauncher.launch(
              PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
            )
          },
          shape = RoundedCornerShape(8.dp),
          modifier = Modifier.fillMaxWidth()
        ) {
          Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(14.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = if (state.profilePictureUrl.isNotBlank()) "Change Photo" else "Upload Photo",
            fontSize = 12.sp
          )
        }

        if (state.profilePictureUrl.isNotBlank()) {
          TextButton(
            onClick = { viewModel.clearProfilePhoto() },
            modifier = Modifier.align(Alignment.CenterHorizontally),
            contentPadding = PaddingValues(0.dp)
          ) {
            Text("Remove Photo", fontSize = 11.sp, color = FpmError)
          }
        }

        Text(
          text = "Strictly photos (JPEG, PNG, WEBP) · Max 1MB",
          fontSize = 10.sp,
          color = FpmTextSecondary
        )
      }
    }

    if (localPhotoError != null || state.avatarUploadError != null) {
      Surface(
        modifier = Modifier
          .fillMaxWidth()
          .padding(top = 8.dp),
        color = FpmErrorBg,
        shape = RoundedCornerShape(8.dp)
      ) {
        Text(
          text = localPhotoError ?: state.avatarUploadError ?: "",
          color = FpmError,
          fontSize = 11.sp,
          modifier = Modifier.padding(8.dp)
        )
      }
    }

    Spacer(modifier = Modifier.height(16.dp))

    Text(
      text = "GENDER *",
      fontSize = 11.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextSecondary
    )
    if (state.genderError != null) {
      Text(
        text = state.genderError,
        color = FpmError,
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(top = 2.dp)
      )
    }
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
      listOf("Male", "Female").forEach { g ->
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier.clickable {
            gender = g
            viewModel.updateStep3(g, dob, address, emName, emPhone)
          }
        ) {
          RadioButton(
            selected = gender == g,
            onClick = {
              gender = g
              viewModel.updateStep3(g, dob, address, emName, emPhone)
            }
          )
          Text(text = g, fontSize = 13.sp)
        }
      }
    }

    Spacer(modifier = Modifier.height(12.dp))

    OutlinedTextField(
      value = dob,
      onValueChange = { 
        dob = it
        viewModel.updateStep3(gender, it, address, emName, emPhone)
      },
      label = { Text("Date of Birth (YYYY-MM-DD) *", fontSize = 12.sp) },
      isError = state.dobError != null,
      supportingText = {
        if (state.dobError != null) {
          Text(state.dobError, color = FpmError, fontSize = 11.sp)
        } else {
          Text("Format: YYYY-MM-DD (e.g. 1995-08-20)", fontSize = 10.sp, color = FpmTextSecondary)
        }
      },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true
    )

    Spacer(modifier = Modifier.height(6.dp))

    OutlinedTextField(
      value = address,
      onValueChange = { 
        address = it
        viewModel.updateStep3(gender, dob, it, emName, emPhone)
      },
      label = { Text("Residential Address *", fontSize = 12.sp) },
      isError = state.addressError != null,
      supportingText = { state.addressError?.let { Text(it, color = FpmError, fontSize = 11.sp) } },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = false,
      maxLines = 2
    )

    Spacer(modifier = Modifier.height(16.dp))

    Text(
      text = "EMERGENCY CONTACT (OPTIONAL)",
      fontSize = 11.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextSecondary
    )

    Spacer(modifier = Modifier.height(6.dp))

    OutlinedTextField(
      value = emName,
      onValueChange = { 
        emName = it
        viewModel.updateStep3(gender, dob, address, it, emPhone)
      },
      label = { Text("Emergency Contact Name", fontSize = 12.sp) },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true
    )

    Spacer(modifier = Modifier.height(10.dp))

    OutlinedTextField(
      value = emPhone,
      onValueChange = { 
        emPhone = it
        viewModel.updateStep3(gender, dob, address, emName, it)
      },
      label = { Text("Emergency Contact Phone", fontSize = 12.sp) },
      modifier = Modifier.fillMaxWidth(),
      shape = RoundedCornerShape(10.dp),
      singleLine = true,
      keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
    )

    Spacer(modifier = Modifier.height(20.dp))

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      OutlinedButton(
        onClick = { viewModel.prevStep() },
        modifier = Modifier.weight(1f),
        shape = RoundedCornerShape(12.dp)
      ) {
        Text("Back", fontSize = 13.sp)
      }
      FpmButton(
        text = "Next: Review",
        onClick = {
          viewModel.updateStep3(gender, dob, address, emName, emPhone)
          viewModel.nextStep()
        },
        modifier = Modifier.weight(1f)
      )
    }
  }
}

@Composable
private fun Step4Review(
  state: RegistrationFormState,
  viewModel: RegistrationViewModel,
  onRegistrationComplete: () -> Unit
) {
  val branchName = state.branches.find { it.id == state.branchId }?.name ?: "Cathedral of Grace"
  val roleName = state.roles.find { it.id == state.ministryRoleId }?.name ?: "Member"
  val deptName = state.departments.find { it.id == state.departmentId }?.name ?: "Unassigned"

  FpmCard(modifier = Modifier.fillMaxWidth()) {
    Text(
      text = "Step 4 — Review & Confirm",
      fontSize = 16.sp,
      fontWeight = FontWeight.Bold,
      color = FpmTextPrimary
    )
    Text(
      text = "Verify your information before submitting for approval",
      fontSize = 12.sp,
      color = FpmTextSecondary,
      modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
    )

    // Avatar preview in review
    if (state.profilePictureUrl.isNotBlank()) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(bottom = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
      ) {
        AsyncImage(
          model = state.profilePictureUrl,
          contentDescription = "Profile Avatar",
          modifier = Modifier
            .size(64.dp)
            .clip(CircleShape),
          contentScale = ContentScale.Crop
        )
      }
    }

    // Section 1: Account
    ReviewSection(
      title = "Account Details",
      onEdit = { viewModel.goToStep(1) },
      items = listOf(
        "Full Name" to "${state.firstName} ${state.middleName} ${state.lastName}".trim(),
        "Email" to state.email,
        "Phone" to state.phone
      )
    )

    Spacer(modifier = Modifier.height(12.dp))

    // Section 2: Church
    ReviewSection(
      title = "Church Assignment",
      onEdit = { viewModel.goToStep(2) },
      items = listOf(
        "Branch" to branchName,
        "Ministry Role" to roleName,
        "Worker Enlistment" to if (state.isWorker) "Yes ($deptName)" else "No"
      )
    )

    Spacer(modifier = Modifier.height(12.dp))

    // Section 3: Personal
    ReviewSection(
      title = "Personal Information",
      onEdit = { viewModel.goToStep(3) },
      items = listOf(
        "Gender" to state.gender,
        "Date of Birth" to state.dateOfBirth,
        "Address" to (state.residentialAddress.ifBlank { "Not provided" }),
        "Emergency Contact" to (state.emergencyContactName.ifBlank { "None" })
      )
    )

    Spacer(modifier = Modifier.height(24.dp))

    FpmButton(
      text = "Submit for Approval",
      onClick = {
        viewModel.submitRegistration(onSuccess = onRegistrationComplete)
      },
      isLoading = state.isLoading,
      modifier = Modifier.fillMaxWidth()
    )
  }
}

@Composable
private fun ReviewSection(
  title: String,
  onEdit: () -> Unit,
  items: List<Pair<String, String>>
) {
  Column(
    modifier = Modifier
      .fillMaxWidth()
      .background(FpmSlateBg, RoundedCornerShape(12.dp))
      .padding(12.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(text = title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FpmRoyalBlue)
      TextButton(onClick = onEdit, contentPadding = PaddingValues(0.dp)) {
        Text("Edit", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = FpmBlueAccent)
      }
    }

    items.forEach { (label, value) ->
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
      ) {
        Text(text = label, fontSize = 11.sp, color = FpmTextSecondary)
        Text(text = value, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = FpmTextPrimary)
      }
    }
  }
}
