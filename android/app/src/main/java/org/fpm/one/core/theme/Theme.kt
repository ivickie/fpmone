package org.fpm.one.core.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = FpmRoyalBlue,
    onPrimary = FpmSurfaceWhite,
    primaryContainer = FpmNavyDark,
    onPrimaryContainer = FpmSurfaceWhite,
    secondary = FpmGold,
    onSecondary = FpmSurfaceWhite,
    secondaryContainer = FpmAmberLight,
    onSecondaryContainer = FpmGold,
    background = FpmSlateBg,
    onBackground = FpmTextPrimary,
    surface = FpmSurfaceWhite,
    onSurface = FpmTextPrimary,
    surfaceVariant = FpmSlateBg,
    onSurfaceVariant = FpmTextSecondary,
    outline = FpmCardBorder
)

private val DarkColorScheme = darkColorScheme(
    primary = FpmBlueAccent,
    onPrimary = FpmSurfaceWhite,
    secondary = FpmAmber,
    onSecondary = FpmNavyDark,
    background = FpmNavyDark,
    onBackground = FpmSurfaceWhite,
    surface = Color(0xFF112240),
    onSurface = FpmSurfaceWhite,
    outline = Color(0xFF233554)
)

@Composable
fun FpmOneTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
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

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
