plugins { id("com.android.application") }
val pocketVersion = providers.gradleProperty("pocketVersion").orElse("v.0.01.001-local").get()
android {
    namespace = "com.merzkava.pocket.review"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.merzkava.pocket.review"
        minSdk = 23
        targetSdk = 34
        versionCode = 1001
        versionName = pocketVersion
    }
    buildTypes { debug { }; release { isMinifyEnabled = false } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
