package org.fpm.one.presentation.worker

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import org.fpm.one.core.theme.*
import java.util.concurrent.Executors

@Composable
fun QrCodeScannerModal(
  onDismiss: () -> Unit,
  onQrCodeScanned: (String) -> Unit
) {
  val context = LocalContext.current
  val lifecycleOwner = LocalLifecycleOwner.current

  var hasCameraPermission by remember {
    mutableStateOf(
      ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    )
  }

  var manualCodeInput by remember { mutableStateOf("") }
  var showManualInput by remember { mutableStateOf(false) }
  var isScanned by remember { mutableStateOf(false) }

  val permissionLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestPermission()
  ) { isGranted ->
    hasCameraPermission = isGranted
  }

  LaunchedEffect(Unit) {
    if (!hasCameraPermission) {
      permissionLauncher.launch(Manifest.permission.CAMERA)
    }
  }

  Dialog(
    onDismissRequest = onDismiss,
    properties = DialogProperties(usePlatformDefaultWidth = false)
  ) {
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(Color(0xFF0F172A))
    ) {
      if (hasCameraPermission && !showManualInput) {
        // Camera View with CameraX
        AndroidView(
          factory = { ctx ->
            val previewView = PreviewView(ctx).apply {
              scaleType = PreviewView.ScaleType.FILL_CENTER
            }
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
            val cameraExecutor = Executors.newSingleThreadExecutor()

            cameraProviderFuture.addListener({
              val cameraProvider = cameraProviderFuture.get()
              val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
              }

              val options = BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build()
              val scanner = BarcodeScanning.getClient(options)

              val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

              imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                val mediaImage = imageProxy.image
                if (mediaImage != null && !isScanned) {
                  val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                  scanner.process(image)
                    .addOnSuccessListener { barcodes ->
                      for (barcode in barcodes) {
                        barcode.rawValue?.let { raw ->
                          if (raw.isNotBlank() && !isScanned) {
                            isScanned = true
                            onQrCodeScanned(raw)
                          }
                        }
                      }
                    }
                    .addOnCompleteListener {
                      imageProxy.close()
                    }
                } else {
                  imageProxy.close()
                }
              }

              val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
              try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                  lifecycleOwner,
                  cameraSelector,
                  preview,
                  imageAnalysis
                )
              } catch (e: Exception) {
                Log.e("QrScanner", "Camera binding failed", e)
              }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
          },
          modifier = Modifier.fillMaxSize()
        )

        // Viewfinder Target Overlay
        Box(
          modifier = Modifier.fillMaxSize(),
          contentAlignment = Alignment.Center
        ) {
          // Semi-transparent background mask
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
          ) {
            Text(
              text = "Scan Service QR Badge",
              color = Color.White,
              fontSize = 18.sp,
              fontWeight = FontWeight.Black,
              modifier = Modifier.padding(bottom = 8.dp)
            )
            Text(
              text = "Align the service attendance QR displayed at the entrance terminal inside the frame",
              color = Color(0xFFCBD5E1),
              fontSize = 12.sp,
              textAlign = TextAlign.Center,
              modifier = Modifier
                .padding(horizontal = 36.dp, vertical = 4.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Reticle Target Box
            Box(
              modifier = Modifier
                .size(260.dp)
                .border(2.5.dp, FpmGold, RoundedCornerShape(20.dp))
                .background(Color.Black.copy(alpha = 0.1f), RoundedCornerShape(20.dp)),
              contentAlignment = Alignment.Center
            ) {
              // Animated scanning beam
              val infiniteTransition = rememberInfiniteTransition(label = "ScanBeam")
              val translateY by infiniteTransition.animateFloat(
                initialValue = -110f,
                targetValue = 110f,
                animationSpec = infiniteRepeatable(
                  animation = tween(2000, easing = LinearEasing),
                  repeatMode = RepeatMode.Reverse
                ),
                label = "BeamAnim"
              )

              Box(
                modifier = Modifier
                  .fillMaxWidth(0.9f)
                  .height(2.dp)
                  .offset(y = translateY.dp)
                  .background(FpmGold)
              )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Manual Code Entry fallback toggle
            OutlinedButton(
              onClick = { showManualInput = true },
              colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Color.White
              ),
              border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF64748B)),
              shape = RoundedCornerShape(12.dp)
            ) {
              Icon(Icons.Default.Keyboard, contentDescription = null, modifier = Modifier.size(16.dp))
              Spacer(modifier = Modifier.width(6.dp))
              Text("Enter Service Token Manually", fontSize = 12.sp)
            }
          }
        }
      } else {
        // Fallback / Manual input view
        Column(
          modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
          verticalArrangement = Arrangement.Center,
          horizontalAlignment = Alignment.CenterHorizontally
        ) {
          Box(
            modifier = Modifier
              .size(64.dp)
              .background(FpmGold.copy(alpha = 0.15f), CircleShape),
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Default.QrCodeScanner, contentDescription = null, tint = FpmGold, modifier = Modifier.size(36.dp))
          }

          Spacer(modifier = Modifier.height(16.dp))
          Text(
            text = "Service QR Clock-In",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
          )
          Text(
            text = if (!hasCameraPermission) "Camera permission is required to scan the entrance station QR code."
                   else "Enter the service token displayed below the church entrance QR code:",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp, bottom = 20.dp)
          )

          if (!hasCameraPermission) {
            Button(
              onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
              colors = ButtonDefaults.buttonColors(containerColor = FpmRoyalBlue),
              shape = RoundedCornerShape(10.dp)
            ) {
              Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
              Spacer(modifier = Modifier.width(8.dp))
              Text("Grant Camera Permission")
            }
            Spacer(modifier = Modifier.height(16.dp))
          }

          OutlinedTextField(
            value = manualCodeInput,
            onValueChange = { manualCodeInput = it },
            placeholder = { Text("e.g. FPM-SVC-11111111-1111...", color = Color(0xFF64748B)) },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
              focusedTextColor = Color.White,
              unfocusedTextColor = Color.White,
              focusedBorderColor = FpmGold,
              unfocusedBorderColor = Color(0xFF475569)
            ),
            singleLine = true
          )

          Spacer(modifier = Modifier.height(14.dp))

          Button(
            onClick = {
              if (manualCodeInput.isNotBlank()) {
                onQrCodeScanned(manualCodeInput.trim())
              }
            },
            enabled = manualCodeInput.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = FpmGoldDark),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp)
          ) {
            Text("Authorize Clock-In", fontWeight = FontWeight.Bold)
          }

          if (hasCameraPermission && showManualInput) {
            TextButton(
              onClick = { showManualInput = false },
              modifier = Modifier.padding(top = 10.dp)
            ) {
              Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
              Spacer(modifier = Modifier.width(6.dp))
              Text("Switch back to Camera Scanner", color = Color(0xFF94A3B8), fontSize = 12.sp)
            }
          }
        }
      }

      // Close / Cancel floating button at top-end
      IconButton(
        onClick = onDismiss,
        modifier = Modifier
          .align(Alignment.TopEnd)
          .padding(16.dp)
          .background(Color.Black.copy(alpha = 0.5f), CircleShape)
      ) {
        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
      }
    }
  }
}
