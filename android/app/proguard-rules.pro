# Add project specific ProGuard rules here.
# Retain useful locations in Play's retraced Java/ANR diagnostics. Capacitor's
# consumer rules retain plugin classes and reflected plugin/callback methods.
-keepattributes SourceFile,LineNumberTable

# Capacitor 6 reads these annotations through reflection. In R8 full mode,
# preserving annotation attributes alone does not preserve the annotation types.
# Without them PluginHandle loses permission metadata after optimization.
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }

# Firebase Authentication 6 compiles its optional Facebook handler against a
# compileOnly SDK. This app enables only google.com and rgcfaIncludeFacebook is
# false, so that handler is never initialized. Revisit if Facebook is enabled.
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
