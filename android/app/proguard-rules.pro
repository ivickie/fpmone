# FPM Global - ProGuard & R8 Optimization Rules

# Preserve line numbers and source file names for Play Console deobfuscation
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Annotations & Signatures for reflection/serialization
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Kotlinx Serialization Rules
-keepclassmembers class * {
    @kotlinx.serialization.SerialName <fields>;
    @kotlinx.serialization.Serializable <fields>;
    @kotlinx.serialization.Contextual <fields>;
}
-keepclassmembers class * {
    *** Companion;
}
-keep class * implements kotlinx.serialization.KSerializer {
    *;
}
-keep class *$$serializer {
    *;
}
-keepclasseswithmembers class * {
    @kotlinx.serialization.Serializable <init>(...);
}

# Preserve all FPM Global data transfer models
-keep class org.fpm.one.data.model.** { *; }
-keepclassmembers class org.fpm.one.data.model.** { *; }

# OkHttp & Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Coil Image Loader
-keep class coil.** { *; }
-dontwarn coil.**

# Google ML Kit Barcode Scanning
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# CameraX
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# AndroidX Security Crypto & Biometrics
-keep class androidx.security.crypto.** { *; }
-keep class androidx.biometric.** { *; }

# Compose Runtime
-keep class androidx.compose.runtime.** { *; }
