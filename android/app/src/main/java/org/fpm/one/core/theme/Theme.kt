package org.fpm.one.core.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = FpmNavyDark,
    onPrimary = FpmSurfaceWhite,
    primaryContainer = FpmNavy,
    onPrimaryContainer = FpmSurfaceWhite,
    secondary = FpmGold,
    onSecondary = FpmNavyDark,
    secondaryContainer = FpmGoldSubtle,
    onSecondaryContainer = FpmGoldDark,
    tertiary = FpmRoyalBlue,
    onTertiary = FpmSurfaceWhite,
    background = FpmIvoryBg,
    onBackground = FpmTextPrimary,
    surface = FpmSurfaceWhite,
    onSurface = FpmTextPrimary,
    surfaceVariant = FpmSurfaceTonal,
    onSurfaceVariant = FpmTextSecondary,
    surfaceContainer = FpmSurfaceWhite,
    surfaceContainerHigh = FpmSurfaceTonal,
    surfaceContainerHighest = FpmSurfaceMuted,
    surfaceContainerLow = FpmIvoryBg,
    surfaceContainerLowest = FpmSurfaceWhite,
    outline = FpmCardBorder,
    outlineVariant = FpmBorderLight,
    error = FpmError,
    onError = FpmSurfaceWhite,
    errorContainer = FpmErrorBg,
    onErrorContainer = FpmError
)

private val DarkColorScheme = darkColorScheme(
    primary = FpmGold,
    onPrimary = FpmNavyDeep,
    primaryContainer = FpmNavyDark,
    onPrimaryContainer = FpmGoldLight,
    secondary = FpmGoldLight,
    onSecondary = FpmNavyDeep,
    secondaryContainer = FpmNavySurface,
    onSecondaryContainer = FpmGoldLight,
    tertiary = FpmBlueAccent,
    onTertiary = FpmSurfaceWhite,
    background = FpmNavyDeep,
    onBackground = FpmTextOnDark,
    surface = FpmCardDark,
    onSurface = FpmTextOnDark,
    surfaceVariant = FpmSurfaceTonalDark,
    onSurfaceVariant = FpmTextSecondaryDark,
    surfaceContainer = FpmCardDark,
    surfaceContainerHigh = FpmSurfaceTonalDark,
    surfaceContainerHighest = FpmSurfaceMutedDark,
    surfaceContainerLow = FpmNavyDark,
    surfaceContainerLowest = FpmNavyDeep,
    outline = FpmCardBorderDark,
    outlineVariant = FpmCardBorderDark.copy(alpha = 0.6f),
    error = Color(0xFFEF4444),
    onError = Color(0xFF450A0A),
    errorContainer = FpmErrorBgDark,
    onErrorContainer = Color(0xFFFCA5A5)
)

val LocalDarkTheme = compositionLocalOf { false }

/**
 * Semantic Accessor for FPM Global Design System.
 * Automatically adapts between Light and Dark themes dynamically without visual regression.
 */
object FpmTheme {
    val isDark: Boolean
        @Composable
        get() = LocalDarkTheme.current

    val cardBackground: Color
        @Composable
        get() = if (isDark) FpmCardDark else FpmSurfaceWhite

    val cardBorder: Color
        @Composable
        get() = if (isDark) FpmCardBorderDark else FpmCardBorder

    val canvasBackground: Color
        @Composable
        get() = if (isDark) FpmNavyDeep else FpmIvoryBg

    val surfaceTonal: Color
        @Composable
        get() = if (isDark) FpmSurfaceTonalDark else FpmSurfaceTonal

    val surfaceMuted: Color
        @Composable
        get() = if (isDark) FpmSurfaceMutedDark else FpmSurfaceMuted

    val textPrimary: Color
        @Composable
        get() = if (isDark) FpmTextOnDark else FpmTextPrimary

    val textSecondary: Color
        @Composable
        get() = if (isDark) FpmTextSecondaryDark else FpmTextSecondary

    val textMuted: Color
        @Composable
        get() = if (isDark) FpmTextMutedDark else FpmTextMuted

    val amberContainer: Color
        @Composable
        get() = if (isDark) FpmAmberContainerDark else FpmAmberLight.copy(alpha = 0.5f)

    val amberBorder: Color
        @Composable
        get() = if (isDark) FpmAmberBorderDark else FpmGoldMuted.copy(alpha = 0.4f)

    val amberText: Color
        @Composable
        get() = if (isDark) FpmGoldLight else FpmTextPrimary

    val errorContainer: Color
        @Composable
        get() = if (isDark) FpmErrorBgDark else FpmErrorBg

    val errorText: Color
        @Composable
        get() = if (isDark) Color(0xFFFCA5A5) else FpmError

    val successContainer: Color
        @Composable
        get() = if (isDark) FpmSuccessBgDark else FpmSuccessBg

    val successText: Color
        @Composable
        get() = if (isDark) Color(0xFF5EEAD4) else FpmSuccess

    val dialogBackground: Color
        @Composable
        get() = if (isDark) FpmCardDark else FpmSurfaceWhite

    val bottomNavBackground: Color
        @Composable
        get() = if (isDark) FpmNavyDark else FpmSurfaceWhite

    val goldDark: Color
        @Composable
        get() = if (isDark) FpmGoldLight else FpmGoldDark

    val goldSubtle: Color
        @Composable
        get() = if (isDark) FpmGold.copy(alpha = 0.15f) else FpmGoldSubtle

    val goldSubtleText: Color
        @Composable
        get() = if (isDark) FpmGoldLight else FpmGoldDark

    val royalBlue: Color
        @Composable
        get() = if (isDark) FpmBlueAccent else FpmRoyalBlue

    val borderLight: Color
        @Composable
        get() = if (isDark) FpmCardBorderDark.copy(alpha = 0.5f) else FpmBorderLight
}

@Composable
fun FpmGlobalTheme(
    darkTheme: Boolean = ThemeManager.isDark(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    CompositionLocalProvider(LocalDarkTheme provides darkTheme) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}

@Composable
fun FpmOneTheme(
    darkTheme: Boolean = ThemeManager.isDark(),
    content: @Composable () -> Unit
) = FpmGlobalTheme(darkTheme, content)
