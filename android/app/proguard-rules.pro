# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor WebView with JS - keep all JavaScript interface classes
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor core classes
-keep class com.getcapacitor.** { *; }
-keepnames class com.getcapacitor.** { *; }

# Keep Capacitor plugins
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Preserve line number information for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}
