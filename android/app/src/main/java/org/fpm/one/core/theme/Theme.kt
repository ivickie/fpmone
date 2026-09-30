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
    primary = FpmNavyDark,
    onPrimary = FpmSurfaceWhite,
    primaryContainer = FpmNavy,
    onPrimaryContainer = FpmSurfaceWhite,
    secondary = FpmGold,
    onSecondary = FpmNavyDark,
    secondaryContainer = FpmGoldSubtle,
    onSecondaryContainer = FpmGoldDark,
    background = FpmIvoryBg,
    onBackground = FpmTextPrimary,
    surface = FpmSurfaceWhite,
    onSurface = FpmTextPrimary,
    surfaceVariant = FpmSurfaceTonal,
    onSurfaceVariant = FpmTextSecondary,
    outline = FpmCardBorder
)

private val DarkColorScheme = darkColorScheme(
    primary = FpmGold,
    onPrimary = FpmNavyDeep,
    secondary = FpmGoldLight,
    onSecondary = FpmNavyDark,
    background = FpmNavyDeep,
    onBackground = FpmSurfaceWhite,
    surface = FpmNavyDark,
    onSurface = FpmSurfaceWhite,
    outline = FpmNavySurface
)

@Composable
fun FpmGlobalTheme(
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

@Composable
fun FpmOneTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) = FpmGlobalTheme(darkTheme, content)
